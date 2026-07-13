# System Design: FX Engineering (Airwallex-style)

## Problem Statement
Design a foreign exchange (FX) processing system that delivers real-time rates across 150+ currencies, locks quoted rates during transaction windows, manages FX risk, and settles conversions across multiple banking partners and jurisdictions.

## Requirements

### Functional
- Serve real-time FX rates for 150+ currency pairs
- Lock quoted rates during the transaction window (30s)
- Execute currency conversion with pip-accurate pricing and configurable markup
- Settle transactions across banking partners (T+0 to T+2)
- Support multi-currency ledger postings (original + base currency)
- Manage FX risk via hedging, forward contracts, and netting

### Non-Functional
- **Latency:** p99 < 100ms for rate quotes
- **Rate freshness:** < 5s staleness under normal conditions
- **Availability:** 99.99% for rate serving
- **Accuracy:** Zero tolerance for incorrect rate execution

## High-Level Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│  Client      │────▶│  API Gateway │────▶│  FX Service      │
│  (Merchant)  │     │  (Rate Limit)│     │  (Orchestrator)  │
└─────────────┘     └──────────────┘     └────────┬────────┘
                                                    │
                     ┌─────────────────────────────┼──────────────────────┐
                     │                              │                       │
                     ▼                              ▼                       ▼
            ┌───────────────┐            ┌──────────────┐        ┌──────────────────┐
            │ Rate Engine   │            │ Ledger       │        │ Settlement       │
            │ (Cache+Quote) │            │ Service      │        │ Service          │
            └───────┬───────┘            └──────────────┘        └──────────────────┘
                    │
        ┌───────────┼───────────┐
        │                       │
        ▼                       ▼
┌───────────────┐     ┌───────────────┐
│ Primary       │     │ Backup        │
│ Rate Provider │     │ Rate Provider │
│ (Streaming)   │     │ (Polling)     │
└───────────────┘     └───────────────┘
```

## Core Components

### 1. Rate Engine

**Rate Sources**
- Primary: streaming FX feed (WebSocket/FIX protocol) — sub-second updates
- Backup: polling REST API — 1-5s intervals, used on primary failure
- Circuit breaker on each provider: 5 failures in 30s → open for 60s

**Rate Caching**
```
Rate Cache Flow:
1. Streaming provider pushes rate update
2. Store in Redis with 5s TTL + stale-while-revalidate flag
3. On cache miss: serve stale entry if < 10s old, trigger async refresh
4. On market event (spike > 2% in 1s): invalidate all pairs for that currency
5. Return rate + timestamp + provider source
```

**Stale-While-Revalidate**
- Serve stale rate if < 10s old (double the TTL) while async-refreshing
- Reject stale rates older than 10s — return error, force fresh quote
- Trade-off: brief staleness vs availability during provider degradation

### 2. Rate Locking

```
Rate Lock Flow:
1. Client requests quote → FX Service returns rate + lock_id + expiry (30s)
2. Lock stored in Redis: key=lock_id, value={rate, pair, expiry}, TTL=30s
3. Client submits transaction with lock_id within 30s
4. FX Service validates lock_id exists and not expired
5. If valid → execute at locked rate
6. If expired → reject, client must request new quote

FX Risk:
- Provider absorbs rate movement between lock and execution
- 30s window limits exposure per transaction
- Aggregate exposure monitored in real-time
- Hedging offsets accumulated position
```

### 3. Currency Conversion

**Pip Calculation**
```
1 pip = 0.0001 for most pairs (e.g., EUR/USD 1.0850 → 1.0851 = 1 pip)
1 pip = 0.01 for JPY pairs (e.g., USD/JPY 150.50 → 150.51 = 1 pip)

Spread = Ask - Bid (measured in pips)
Example: EUR/USD Bid=1.0850, Ask=1.0852 → Spread = 2 pips

Markup layers:
1. Interbank rate (raw feed)
2. Wholesale spread (2-5 pips)
3. Retail markup (5-20 pips)
4. Platform fee (flat or percentage)
```

### 4. Settlement Service

```
Settlement Timing:
- T+0 (same-day): 93% of transactions (Airwallex benchmark)
- T+1 (next-day): Remaining standard settlements
- T+2: Legacy banking corridors
- Instant (real-time): 50% of transactions via instant payment networks

Flow:
1. Transaction completed → Settlement Service receives event
2. Route to correct banking partner based on currency corridor
3. Submit settlement instruction (SWIFT/SEPA/Faster Payments/local rail)
4. Track settlement status via callback or polling
5. Reconcile with banking partner confirmation
```

### 5. Multi-Currency Ledger

```
Dual-Currency Posting:
Every transaction posts in both original and base currency:

Event: FXConversionCompleted
  - transaction_id: "fx_456"
  - debit:  {account: "acc_001", amount: 1000.00, currency: "USD"}
  - credit: {account: "acc_001", amount: 920.00,  currency: "EUR"}
  - fx_rate: 0.9200
  - base_currency: "USD"
  - base_debit:  1000.00
  - base_credit: 1000.00  (920.00 * 1.0870 revalued rate)
  - revaluation_gain: 0.00

End-of-Day Revaluation:
- All foreign-currency balances revalued at closing rate
- Unrealized gains/losses posted to P&L
- Audit trail maintained for compliance
```

### 6. Market Event Handling

```
Circuit Breaker for Extreme Volatility:
1. Monitor rate changes per currency pair
2. If rate moves > 2% in 1 second → trigger volatility breaker
3. Actions:
   a. Widen spread to reduce flow
   b. Reduce rate lock window (30s → 5s)
   c. Suspend rate locks for affected pairs
   d. Alert risk management team
4. Resume normal operations when volatility subsides (rate moves < 0.5% in 10s)
```

### 7. Reconciliation

```
Daily Reconciliation Flow:
1. Collect transaction logs from internal ledger
2. Fetch statements from each banking partner
3. Match on: amount, currency, reference, settlement date
4. Flag discrepancies: missing, amount mismatch, currency mismatch
5. Investigate and resolve discrepancies
6. Generate reconciliation report per jurisdiction

Challenges:
- Different settlement cut-off times per jurisdiction
- Partial settlements (one side completed, other pending)
- Currency rounding differences across systems
- Timezone handling for T+0/T+1/T+2 calculations
```

## Database Design

### Rate Locks Table
```sql
CREATE TABLE rate_locks (
    lock_id UUID PRIMARY KEY,
    currency_pair VARCHAR(7) NOT NULL,
    rate DECIMAL(20,8) NOT NULL,
    provider VARCHAR(50),
    expires_at TIMESTAMP NOT NULL,
    claimed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    INDEX idx_expires (expires_at),
    INDEX idx_pair_expires (currency_pair, expires_at)
);
```

### FX Transactions Table
```sql
CREATE TABLE fx_transactions (
    id UUID PRIMARY KEY,
    lock_id UUID REFERENCES rate_locks(lock_id),
    source_amount DECIMAL(20,8) NOT NULL,
    source_currency VARCHAR(3) NOT NULL,
    target_amount DECIMAL(20,8) NOT NULL,
    target_currency VARCHAR(3) NOT NULL,
    locked_rate DECIMAL(20,8) NOT NULL,
    market_rate_at_execution DECIMAL(20,8),
    spread_pips DECIMAL(10,4),
    markup_pips DECIMAL(10,4),
    status VARCHAR(20),
    settlement_date DATE,
    banking_partner VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW(),
    INDEX idx_status_date (status, created_at),
    INDEX idx_settlement (settlement_date, banking_partner)
);
```

## Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Rate delivery | Streaming (primary) + Polling (backup) | Sub-second freshness with graceful degradation |
| Cache TTL | 5s with stale-while-revalidate to 10s | Balances freshness with availability |
| Rate lock duration | 30s (reducible to 5s in volatility) | Limits FX exposure while allowing transaction completion |
| Ledger model | Dual-currency posting | Enables both operational and accounting views |
| Settlement routing | Per-corridor banking partner | Optimizes for speed and cost per currency pair |

## Failure Scenarios

| Failure | Impact | Mitigation |
|---------|--------|------------|
| Primary rate provider down | Stale rates | Backup polling provider, stale-while-revalidate cache |
| Rate spike (>2% in 1s) | FX losses on locked rates | Volatility circuit breaker, widen spread, shorten lock window |
| Rate lock expires mid-transaction | Customer sees different rate | Reject and request re-quote; UX handles gracefully |
| Banking partner settlement delayed | Reconciliation discrepancies | Track pending settlements, SLA monitoring, partner fallback |
| Redis cache failure | No rate cache | Fallback to direct provider calls, accept higher latency |

## Questions

### Q1
type: multiple-choice
stem: "In an FX system, why is a streaming rate provider preferred over a polling provider as the primary source?"
options:
  - A: Streaming uses less bandwidth than polling
  - B: Streaming delivers sub-second rate updates, while polling introduces a delay equal to the polling interval
  - C: Streaming providers are always cheaper than polling providers
  - D: Streaming providers guarantee rate accuracy while polling providers do not
correct: B
explanation: "Streaming providers push rate changes via WebSocket or FIX protocol as they happen, enabling sub-second freshness. Polling providers only deliver updates at each poll interval (e.g., every 1-5 seconds), introducing inherent staleness."
difficulty: 1

### Q2
type: multiple-choice
stem: "What is a 'pip' in the context of EUR/USD currency conversion?"
options:
  - A: 0.01 (one cent)
  - B: 0.0001 (one basis point)
  - C: 0.001 (one tenth of a cent)
  - D: 0.00001 (one tenth of a basis point)
correct: B
explanation: "For most currency pairs including EUR/USD, 1 pip = 0.0001. For JPY pairs, 1 pip = 0.01. Pips are the standard unit for measuring FX spreads and markups."
difficulty: 2

### Q3
type: fill-in-blank
stem: "In FX rate caching, the ______ pattern serves a stale rate while asynchronously fetching a fresh one, balancing freshness with availability."
answers:
  - "stale-while-revalidate"
  - "stale while revalidate"
explanation: "Stale-while-revalidate allows serving slightly stale data from cache while triggering an async refresh. This prevents request blocking during cache expiration, critical for FX systems where availability matters as much as freshness."
difficulty: 2

### Q4
type: fill-in-blank
stem: "In FX settlement terminology, T+2 means the transaction settles ______ business days after the trade date."
answers:
  - "two"
  - "2"
explanation: "T+N notation indicates settlement N business days after the trade date. T+0 is same-day settlement, T+1 is next business day, T+2 is two business days after trade date."
difficulty: 1

### Q5
type: select-all
stem: "Which of the following are valid strategies for managing FX risk on locked rates?"
options:
  - A: Hedging the net accumulated position in each currency
  - B: Entering forward contracts to lock in future exchange rates
  - C: Netting offsetting positions across transactions before settling
  - D: Extending the rate lock window to 5 minutes to reduce re-quote frequency
correct:
  - A
  - B
  - C
explanation: "Hedging (A) offsets currency exposure with opposing positions. Forward contracts (B) lock future rates to eliminate uncertainty. Netting (C) reduces gross settlement by canceling offsetting flows. Extending lock windows (D) actually INCREASES FX risk — the longer the lock, the more market movement the provider absorbs."
difficulty: 3

### Q6
type: scenario
stem: "Step 1: Your FX system caches rates in Redis with a 5s TTL. The primary streaming provider goes offline for 2 minutes. Step 2: Within 5 seconds, all cached rates expire and your system starts calling the backup polling provider (2s poll interval). Step 3: During the transition, a burst of 500 quote requests arrive simultaneously. The backup provider rate-limits you to 50 requests/second. How should you handle this degradation gracefully?"
options:
  - A: Return errors for all requests that exceed the backup provider's rate limit
  - B: Serve stale-while-revalidate rates (up to 10s old) for the first 10 seconds, queue overflow requests for async processing, and return the best-available rate with a staleness indicator
  - C: Immediately switch to hardcoded fallback rates
  - D: Increase the polling interval to reduce load on the backup provider
correct: B
explanation: "Stale-while-revalidate keeps serving rates from cache even after TTL expires (up to a staleness threshold), buying time for the backup provider to populate fresh rates. Queuing overflow prevents overwhelming the backup. Including a staleness indicator lets clients make informed decisions about using the rate."
trade_offs: "Serving stale rates risks FX losses if the market moved significantly, but rejecting all requests destroys availability. Hardcoded rates (C) are risky — they may be far from market. Increasing poll interval (D) makes rates even staler. The staleness threshold (10s) is a business decision balancing risk vs availability."
difficulty: 3

### Q7
type: scenario
stem: "Step 1: A customer locks a rate of 1.0850 for EUR/USD (100,000 EUR → 108,500 USD) with a 30-second window. Step 2: 25 seconds into the lock, a geopolitical event causes EUR/USD to spike to 1.0950 — a 100-pip move in seconds. Step 3: The customer executes at the locked 1.0850 rate, meaning the provider receives only 108,500 USD for EUR now worth 109,500 USD at market — a $1,000 loss. Step 4: How should the system handle such extreme volatility events to limit FX exposure?"
options:
  - A: Honor all locks unconditionally — the provider absorbs the loss as a cost of doing business
  - B: Implement a volatility circuit breaker that detects the spike (>2% in 1s), widens the spread for new quotes, shortens the lock window to 5s, and alerts the risk team — existing locks are still honored
  - C: Cancel all existing locks when volatility is detected and force re-quotes at the new rate
  - D: Pause all FX transactions until volatility subsides
correct: B
explanation: "Existing locks should be honored (maintaining customer trust), but the system must react to limit further exposure: widen spreads to reduce flow, shorten lock windows to limit per-transaction risk, and alert risk management. This balances contractual obligation with risk control."
trade_offs: "Canceling existing locks (C) destroys customer trust and may violate regulatory requirements. Pausing all transactions (D) eliminates availability. Unconditional honoring (A) exposes the provider to unlimited risk during black swan events. The circuit breaker approach limits new exposure while respecting existing commitments."
difficulty: 4

### Q8
type: scenario
stem: "Step 1: Your multi-currency ledger posts every transaction in both the original currency and the base currency (USD). Step 2: At end-of-day, EUR/USD has moved from 1.0850 (morning rate) to 1.0920 (closing rate). Step 3: Your ledger holds a EUR 1,000,000 balance that was booked at various rates throughout the day (average: 1.0850). Step 4: At the closing rate of 1.0920, that EUR balance is worth USD 1,092,000 vs the booked value of USD 1,085,000 — a $7,000 unrealized gain. What should the system do?"
options:
  - A: Nothing — unrealized gains are not real until the EUR is actually converted to USD
  - B: Post an end-of-day revaluation entry: debit the EUR account's base-currency equivalent by $7,000 and credit an unrealized FX gain account, then reverse this entry at the start of the next business day
  - C: Convert the entire EUR balance to USD immediately to realize the gain
  - D: Adjust the original transaction entries to reflect the new rate
correct: B
explanation: "Multi-currency ledgers require daily revaluation to reflect the true economic value of foreign-currency positions. The revaluation entry recognizes the unrealized gain in the P&L. Reversing it at the start of the next day ensures the revaluation always reflects the current day's closing rate, not accumulated adjustments."
trade_offs: "Not revaluing (A) misrepresents the economic position on financial statements. Converting immediately (C) may not be operationally desirable and creates a taxable event. Modifying original entries (D) violates the immutability principle of ledger accounting. The reversal approach maintains accurate daily P&L while preserving the integrity of original transaction records."
difficulty: 3

### Q9
type: scenario
stem: "Step 1: Your FX system settles through 3 banking partners: Partner A (SEPA/EUR), Partner B (Faster Payments/GBP), Partner C (SWIFT/multi-currency). Step 2: End-of-day reconciliation shows: 47 transactions via Partner A are matched, 3 GBP transactions via Partner B have amount mismatches (£0.01-£0.05 differences), and 12 SWIFT transactions via Partner C show as 'pending' with no confirmation. Step 3: The mismatched Partner B amounts match exactly when rounded differently (bank rounds half-up, your system rounds half-even). Step 4: The Partner C pending transactions are from 2 days ago and are within the T+2 settlement window. What actions do you take?"
options:
  - A: Escalate all discrepancies immediately — any mismatch is a critical financial risk
  - B: Accept Partner A as reconciled. Fix the rounding logic for Partner B to match the bank's convention (half-up) and auto-resolve the £0.01-£0.05 differences. Monitor Partner C pending transactions — they are within T+2 window so no action yet, but flag for follow-up if not confirmed by T+2 end of day
  - C: Reverse all Partner B transactions and re-submit with correct rounding
  - D: Wait for all settlements to complete before reconciling — reconciliation should only happen after T+2
correct: B
explanation: "Rounding differences are a known reconciliation challenge in multi-currency systems. The fix is aligning rounding conventions with each banking partner. Pending T+2 transactions are expected to not yet have confirmation — they should be monitored, not escalated. Partner A is clean."
trade_offs: "Escalating all discrepancies (A) wastes operations resources on known patterns. Reversing and re-submitting (C) is operationally risky and unnecessary for rounding differences. Waiting for T+2 before reconciling (D) delays detection of genuine issues. Aligning rounding per partner (B) is a code fix; monitoring pending settlements balances vigilance with patience."
difficulty: 4
