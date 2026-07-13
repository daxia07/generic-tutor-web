---
tags:
  - system-design
  - airwallex
  - fintech
  - payments
aliases:
  - payment-processing
  - cross-border-payments
  - fx-engine
last-updated: 2026-06-22
type: concept
---

# Payment Systems — Interview Guide

> [!tip] Airwallex is a payment company. Domain knowledge shows you understand their business.

## Key Concepts

### Payment Flow (Simplified)

```
Customer → Merchant → Payment Gateway → Acquirer → Card Network → Issuer
                                                           ↓
                                                     Authorization
                                                           ↓
Customer ← Merchant ← Payment Gateway ← Acquirer ← Card Network ← Issuer
```

**Cross-border payment flow:**
```
Sender (AUD) → Airwallex → FX Conversion → Local Rail (FPS/ACH/SEPA) → Receiver (USD)
                    ↓
              Correspondent Bank (if needed)
                    ↓
              SWIFT (for international)
```

### Key Terms

| Term | Meaning | Interview relevance |
|------|---------|-------------------|
| **Acquirer** | Bank that processes merchant payments | Payment flow design |
| **Issuer** | Bank that issued the customer's card | Authorization flow |
| **Settlement** | Actual money transfer between banks | T+1, T+2 delays |
| **Reconciliation** | Matching internal records with bank statements | System design question |
| **Idempotency** | Same operation produces same result | Critical for payments |
| **Double-entry** | Every transaction has debit AND credit | Ledger design |
| **FX Rate** | Exchange rate between currencies | Currency conversion |
| **SWIFT** | International bank messaging network | Cross-border payments |
| **Local Rails** | Domestic payment networks (FPS, ACH, SEPA) | Faster/cheaper than SWIFT |

### Payment States

```
Created → Pending → Authorized → Captured → Settled → Completed
                ↓           ↓          ↓
            Declined    Refunded   Failed
```

### Idempotency (CRITICAL for payments)

**Problem:** What if a network timeout causes a retry? You don't want to charge twice.

**Solution:** Idempotency key
```
Client sends: POST /payments {idempotency_key: "abc123", amount: 100}

Server:
1. Check if "abc123" already exists in idempotency store
2. If yes → return existing result (don't process again)
3. If no → process payment, store result with key "abc123"
```

**Implementation:**
```python
def process_payment(request):
    idempotency_key = request.headers['Idempotency-Key']

    # Check if already processed
    existing = idempotency_store.get(idempotency_key)
    if existing:
        return existing  # Return same result

    # Process payment
    result = do_payment(request)

    # Store result
    idempotency_store.set(idempotency_key, result)
    return result
```

### Reconciliation

**Problem:** Internal records may not match bank statements.

**Why?** Network failures, partial settlements, timing differences, fees.

**Approach:**
1. Export internal transaction records
2. Fetch bank statement
3. Match by amount, date, reference
4. Flag discrepancies
5. Investigate and resolve

### Double-Entry Bookkeeping

**Every transaction has two entries:**
```
Transfer $100 from Account A to Account B:

Account A: -$100 (debit)
Account B: +$100 (credit)

Total debits = Total credits (always balanced)
```

**Why?** Audit trail, error detection, compliance.

## Airwallex Domain Knowledge

### Core Products
1. **Global Account** — Multi-currency account for businesses
2. **FX Conversion** — Real-time currency exchange
3. **Cross-border Payments** — Send money internationally
4. **Card Issuing** — Virtual/physical cards
5. **Payment Acceptance** — Accept payments from customers

### Architecture (from blog/GitHub)
- **Auticuro** — Wallet service (CQRS + Event Sourcing, Rust)
- **AirSkiff** — Stream processing (Flink/Spark)
- **FX Engine** — Real-time rates, forward lock-in, hedging
- **Payment Rail Selection** — SWIFT vs local rails (cost/speed/tradeoff)

### Payment Rail Selection
| Rail | Speed | Cost | Use Case |
|------|-------|------|----------|
| SWIFT | 1-5 days | High | International, large amounts |
| FPS (UK) | Instant | Low | UK domestic |
| ACH (US) | 1-3 days | Low | US domestic |
| SEPA (EU) | 1 day | Low | EU domestic |

**Decision logic:** Choose rail based on corridor, amount, urgency, cost.

## System Design Talking Points

**When asked "Design a payment system":**
1. "I'd separate the payment flow into stages: authorization, capture, settlement"
2. "Use idempotency keys to prevent duplicate charges"
3. "For cross-border, use a payment rail selector based on cost/speed tradeoffs"
4. "Reconciliation engine matches internal records with bank statements"
5. "Event sourcing for audit trail — every state change is an event"

**When asked about currency conversion:**
1. "Model currencies as a graph — each currency is a node, exchange rate is an edge"
2. "Find optimal path using shortest path algorithm (Bellman-Ford)"
3. "Detect arbitrage opportunities (negative cycles)"
4. "Cache rates with TTL — rates change frequently"

## Quick Reference

| Concept | Definition | Why It Matters |
|---------|-----------|----------------|
| Idempotency | Same input → same output | Prevent double charges |
| Double-entry | Debit + Credit for every tx | Audit trail, balance check |
| Reconciliation | Match records with bank | Detect discrepancies |
| Settlement | Actual money transfer | T+1/T+2 delays |
| Event Sourcing | Store events not state | Compliance, debugging |
| CQRS | Separate read/write | Scale, optimize each path |

## Questions

### Q1
type: multiple-choice
stem: "What is idempotency in the context of payment systems?"
options:
  - A: Processing payments faster
  - B: Ensuring duplicate requests produce the same result
  - C: Encrypting payment data
  - D: Load balancing
correct: B
explanation: "Idempotency ensures that retrying a payment request (e.g., due to timeout) doesn't charge the customer twice."
difficulty: 2

### Q2
type: fill-in-blank
stem: "A ______ ledger records every financial transaction as an immutable entry."
answers:
  - "double-entry"
  - "double entry"
explanation: "Double-entry bookkeeping records each transaction as both a debit and credit, ensuring balances always match."
difficulty: 2

### Q3
type: select-all
stem: "Which are critical requirements for payment systems?"
options:
  - A: Idempotency
  - B: Auditability
  - C: Strong consistency
  - D: Eventual consistency
correct:
  - A
  - B
  - C
explanation: "Payment systems need idempotency (no double charges), auditability (transaction logs), and strong consistency (accurate balances). Eventual consistency is insufficient for money."
difficulty: 2

### Q4
type: fill-in-blank
stem: "The process of matching internal transaction records with bank statements to detect discrepancies is called ______."
answers:
  - "reconciliation"
  - "payment reconciliation"
  - "bank reconciliation"
explanation: "Reconciliation compares internal ledger entries against bank statements, flagging mismatches caused by network failures, timing differences, or fees."
difficulty: 2

### Q5
type: select-all
stem: "Which payment rails are considered local (domestic) rails rather than international messaging networks?"
options:
  - A: SWIFT
  - B: FPS
  - C: ACH
  - D: SEPA
correct:
  - B
  - C
  - D
explanation: "FPS (UK), ACH (US), and SEPA (EU) are domestic payment networks — faster and cheaper. SWIFT is an international messaging network for cross-border payments."
difficulty: 2

### Q6
type: scenario
stem: "Step 1: A customer initiates a $500 payment. Step 2: The payment gateway sends the request to the acquirer, which authorizes it. Step 3: The merchant's system crashes before capturing the authorized funds. What is the state of the payment and what happens to the funds?"
options:
  - A: The payment is settled — the customer has been charged $500
  - B: The payment is authorized but not captured — the funds are held on the customer's card but not transferred; authorization will expire after a period (typically 7 days)
  - C: The payment is declined — the authorization is automatically reversed
  - D: The payment is pending forever — the funds are in limbo
correct: B
explanation: "Authorization reserves funds on the customer's card but doesn't transfer them. Capture is the step that actually charges. If never captured, the authorization expires and the hold is released. This separation protects both merchant and customer."
trade_offs: "Merchants must capture within the authorization window (usually 5-7 days) or the hold expires and funds are released. For physical goods that ship later, this means either capturing before shipping (risk to customer) or re-authorizing if shipping is delayed (extra processing)."
difficulty: 3

### Q7
type: scenario
stem: "Step 1: You're designing a cross-border payment from Australia (AUD) to the UK (GBP). Step 2: You can route via SWIFT or via local rails (FPS). Step 3: The payment is urgent and the amount is small ($200 equivalent). Which rail do you choose and why?"
options:
  - A: SWIFT — more reliable for international payments regardless of amount
  - B: Local rails (FPS) — faster settlement and lower cost for small urgent payments within the same corridor
  - C: Both — send via SWIFT for reliability and FPS for speed, then use whichever arrives first
  - D: Neither — use cryptocurrency for instant settlement
correct: B
explanation: "For small, urgent cross-border payments to the UK, local rails like FPS offer near-instant settlement at low cost. A payment platform like Airwallex converts AUD→GBP, then delivers via FPS. SWIFT would take 1-5 days and cost more."
trade_offs: "Local rails only work if you have local banking presence or a partner in the destination country. SWIFT has broader coverage but is slower and costlier. The payment rail selector must weigh corridor availability, amount, urgency, and cost for each transaction."
difficulty: 3

### Q8
type: scenario
stem: "Step 1: Your payment system uses event sourcing — every state change is stored as an immutable event. Step 2: A compliance audit requires you to prove that a specific payment went through the exact state transitions: Created → Authorized → Captured → Settled. Step 3: A bug caused one event to be recorded with an incorrect timestamp. How does event sourcing help you investigate and resolve this?"
options:
  - A: You can mutate the incorrect event directly in the event store to fix the timestamp
  - B: You append a compensating event that corrects the record — the original event remains immutable, preserving the full audit trail including the correction
  - C: You delete the incorrect event and re-insert it with the correct timestamp
  - D: Event sourcing doesn't help — you need a separate audit log
correct: B
explanation: "Event sourcing's immutability means you never modify or delete events. Corrections are append-only compensating events. This preserves the complete history: the original event, the correction, and the reason — exactly what auditors need."
trade_offs: "Append-only correction adds complexity when reading current state — the projection must replay all events including corrections. It also means the event store grows continuously and needs compaction/snapshot strategies for performance."
difficulty: 4
