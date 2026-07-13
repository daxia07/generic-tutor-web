# System Design: Payment Gateway (Airwallex-style)

## Problem Statement
Design a cross-border payment processing system that handles currency conversion, transaction processing, and settlement across multiple countries.

## Requirements

### Functional
- Process payments in 100+ currencies
- Real-time FX rate lookup and conversion
- Idempotent transaction processing
- Transaction status tracking
- Webhook notifications to merchants

### Non-Functional
- **Availability:** 99.99% (52 min downtime/year)
- **Latency:** p99 < 500ms for payment initiation
- **Throughput:** 10,000 TPS peak
- **Consistency:** Strong for financial data, eventual for analytics

## High-Level Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│  Merchant    │────▶│  API Gateway │────▶│  Payment Service │
│  (Client)    │     │  (Rate Limit)│     │  (Orchestrator)  │
└─────────────┘     └──────────────┘     └────────┬────────┘
                                                   │
                    ┌──────────────────────────────┼──────────────────────────┐
                    │                              │                          │
                    ▼                              ▼                          ▼
           ┌───────────────┐            ┌──────────────┐           ┌──────────────┐
           │ FX Service    │            │ Ledger       │           │ Notification │
           │ (Rate Lookup) │            │ Service      │           │ Service      │
           └───────────────┘            └──────────────┘           └──────────────┘
                    │                              │
                    ▼                              ▼
           ┌───────────────┐            ┌──────────────┐
           │ Rate Provider │            │ Database     │
           │ (External API)│            │ (PostgreSQL) │
           └───────────────┘            └──────────────┘
```

## Core Components

### 1. API Gateway
- **Rate limiting:** Token bucket per merchant
- **Authentication:** API key + HMAC signature
- **Idempotency:** Client-generated idempotency key
- **Routing:** Path-based routing to services

### 2. Payment Service (Orchestrator)
- **State machine:** `CREATED → PROCESSING → COMPLETED/FAILED`
- **Saga pattern:** Distributed transaction across services
- **Retry logic:** Exponential backoff with dead letter queue

```python
class PaymentStateMachine:
    STATES = {
        'CREATED': ['PROCESSING'],
        'PROCESSING': ['COMPLETED', 'FAILED'],
        'FAILED': ['RETRYING'],
        'RETRYING': ['PROCESSING', 'DEAD'],
    }
```

### 3. FX Service
- **Caching:** Redis with 5s TTL for rates
- **Fallback:** Multiple rate providers (primary + backup)
- **Rate locking:** Lock rate for 30s during transaction

```
Rate Lookup Flow:
1. Check Redis cache (5s TTL)
2. If miss → call primary provider
3. If primary fails → call backup provider
4. Cache result with TTL
5. Return rate + timestamp + provider
```

### 4. Ledger Service (CQRS + Event Sourcing)
- **Command side:** Process debit/credit commands
- **Query side:** Optimized read models for balance/history
- **Event store:** Immutable append-only log

```
Event: PaymentCompleted
  - transaction_id: "txn_123"
  - debit: {account: "merchant_A", amount: 100, currency: "USD"}
  - credit: {account: "merchant_B", amount: 92, currency: "EUR"}
  - fx_rate: 0.92
  - timestamp: "2026-06-22T10:00:00Z"
```

## Key Design Decisions

### Idempotency
```
Client sends: idempotency_key = "merchant_txn_123"

Server flow:
1. Check if key exists in Redis/DB
2. If exists → return cached response
3. If not → process payment, store key + response
4. Return response

Storage: Redis with 24h TTL + DB for durability
```

### Exactly-Once Semantics
- **At-least-once delivery** + **idempotent processing** = exactly-once
- Use message deduplication in Kafka/SQS
- Database unique constraints on transaction_id

### Rate Locking
```
Problem: Rate changes between quote and execution

Solution:
1. Quote: Return rate + lock_id + expiry (30s)
2. Execute: Include lock_id, verify rate hasn't changed
3. If rate changed: Reject, request new quote

Storage: Redis with TTL = lock duration
```

## Database Design

### Transactions Table
```sql
CREATE TABLE transactions (
    id UUID PRIMARY KEY,
    merchant_id UUID NOT NULL,
    idempotency_key VARCHAR(255) UNIQUE,
    source_amount DECIMAL(20,8),
    source_currency VARCHAR(3),
    target_amount DECIMAL(20,8),
    target_currency VARCHAR(3),
    fx_rate DECIMAL(20,8),
    status VARCHAR(20),
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    INDEX idx_merchant_status (merchant_id, status),
    INDEX idx_created (created_at)
);
```

### Event Store
```sql
CREATE TABLE events (
    id BIGSERIAL PRIMARY KEY,
    aggregate_id UUID NOT NULL,
    aggregate_type VARCHAR(50),
    event_type VARCHAR(50),
    event_data JSONB,
    version INT,
    created_at TIMESTAMP,
    UNIQUE(aggregate_id, version)
);
```

## Scaling Considerations

### Database Sharding
- **Shard key:** merchant_id (most queries are per-merchant)
- **Cross-shard:** Use event sourcing for consistency
- **Read replicas:** For analytics and reporting

### Caching Strategy
```
L1: Application cache (in-memory, 1s TTL)
L2: Redis (5s TTL for rates, 24h for idempotency)
L3: Database (source of truth)
```

### Message Queue
- **Kafka:** For event sourcing and audit log
- **SQS:** For webhook delivery (retry with backoff)
- **Dead letter:** Failed messages for manual review

## Monitoring & Alerting

### Key Metrics
- Transaction success rate (target: >99.9%)
- p99 latency (target: <500ms)
- FX rate staleness (target: <5s)
- Queue depth (alert if >10k)

### Distributed Tracing
```
Trace: txn_123
├── API Gateway: 10ms
├── Payment Service: 50ms
│   ├── FX Service: 20ms
│   └── Ledger Service: 30ms
└── Notification Service: 5ms (async)
```

## Failure Scenarios

| Failure | Impact | Mitigation |
|---------|--------|------------|
| FX provider down | Can't quote rates | Backup provider, cached rates |
| Database down | Can't process | Read replicas, circuit breaker |
| Network partition | Partial failures | Saga compensation, retry |
| Rate spike | Stale quotes | Short TTL, rate locking |

## Interview Tips
1. **Start with requirements** — Don't jump to architecture
2. **Draw the diagram** — Visual helps organize thinking
3. **Call out trade-offs** — Consistency vs availability, latency vs durability
4. **Mention Airwallex context** — Cross-border, multi-currency, high volume
5. **Discuss failure modes** — What breaks and how to handle it

## Questions

### Q1
type: multiple-choice
stem: "In a payment system, what is the purpose of a ledger?"
options:
  - A: Cache payment data
  - B: Record all financial transactions immutably
  - C: Route API requests
  - D: Encrypt card data
correct: B
explanation: "A ledger is an immutable record of all financial transactions, serving as the source of truth for account balances."
difficulty: 1

### Q2
type: fill-in-blank
stem: "A ______ key in a payment API ensures that retrying a request doesn't create a duplicate charge."
answers:
  - "idempotency"
explanation: "Idempotency keys allow the server to recognize and deduplicate retried requests."
difficulty: 2

### Q3
type: select-all
stem: "Which are important considerations for cross-border payment systems?"
options:
  - A: Currency conversion
  - B: Regulatory compliance
  - C: Settlement timing
  - D: Local payment methods
correct:
  - A
  - B
  - C
  - D
explanation: "Cross-border payments must handle FX rates, regulations (KYC/AML), settlement delays, and local payment method preferences."
difficulty: 2

### Q4
type: fill-in-blank
stem: "The pattern of using at-least-once delivery combined with idempotent processing to achieve exactly-once semantics is called ______-once processing."
answers:
  - "exactly"
  - "effectively exactly"
explanation: "Exactly-once semantics are achieved by combining at-least-once delivery with idempotent receivers. True exactly-once is impossible in distributed systems, but this combination is effectively exactly-once."
difficulty: 2

### Q5
type: select-all
stem: "Which mechanisms help ensure exactly-once payment processing?"
options:
  - A: Database unique constraint on idempotency_key
  - B: Message deduplication in the message queue
  - C: Client-side retry without idempotency key
  - D: Idempotency key stored in Redis with TTL
correct:
  - A
  - B
  - D
explanation: "Unique constraints prevent duplicate database entries (A). Message queue deduplication prevents redelivery (B). Redis-stored idempotency keys enable fast duplicate detection (D). Client retries without idempotency keys (C) risk creating duplicates."
difficulty: 2

### Q6
type: scenario
stem: "Step 1: A merchant initiates a $1,000 USD → EUR payment. Step 2: The FX service quotes a rate of 0.92 and returns a lock_id valid for 30 seconds. Step 3: The payment service takes 15 seconds to validate and starts processing at the locked rate. Step 4: Between the quote and execution, the actual market rate dropped to 0.89. What happens and why is rate locking important?"
options:
  - A: The payment executes at 0.92 — rate locking protects the merchant from rate changes during the transaction window
  - B: The payment executes at 0.89 — the system always uses the latest market rate
  - C: The payment is rejected — the rate changed so the lock is invalid
  - D: The payment is queued — it waits for the rate to return to 0.92
correct: A
explanation: "Rate locking guarantees the quoted rate for the lock duration (30s). The merchant receives the quoted 0.92 rate regardless of market movements. This is essential for predictable cross-border payments."
trade_offs: "The payment provider absorbs the rate difference (0.92 vs 0.89 market), creating FX risk. Shorter lock durations reduce this risk but increase the chance of lock expiry during slow processing. This is a core business trade-off in payment systems."
difficulty: 3

### Q7
type: scenario
stem: "Step 1: The payment service uses a saga pattern to coordinate across FX Service, Ledger Service, and Notification Service. Step 2: The Ledger Service debits the source account but the FX Service fails before crediting the target account. Step 3: The system is now in an inconsistent state — money has been debited but not credited. What should happen next?"
options:
  - A: Nothing — eventual consistency will resolve it
  - B: The saga orchestrator should trigger a compensating transaction to reverse the ledger debit
  - C: Manually review and fix the inconsistency
  - D: Retry the FX Service call indefinitely until it succeeds
correct: B
explanation: "The saga pattern defines compensating transactions for each step. When FX Service fails after Ledger debit, the orchestrator triggers a compensating transaction (credit back the debit) to restore consistency."
trade_offs: "Compensating transactions add complexity — each step needs a defined rollback. Manual review (C) doesn't scale. Indefinite retry (D) could leave the debit pending forever. Eventual consistency (A) is unacceptable for financial data."
difficulty: 4

### Q8
type: scenario
stem: "Step 1: Your payment gateway must achieve 99.99% availability (52 min downtime/year). Step 2: A database failover takes 30 seconds during which no payments can be processed. Step 3: At 10,000 TPS peak, a 30-second failover means 300,000 failed payments. Step 4: How should you architect the database layer to minimize the impact of failovers?"
options:
  - A: Use a single primary with synchronous replication — failover is seamless
  - B: Use multi-primary replication so writes can continue on any node during failover
  - C: Use a primary-replica setup with connection pooling and automatic failover, plus a queue to buffer writes during the failover window
  - D: Accept the 30-second outage — 300K failed payments is within SLA
correct: C
explanation: "Buffering writes in a message queue during failover ensures no payments are lost — they are processed once the new primary is ready. Connection pooling with automatic failover minimizes the failover window."
trade_offs: "Multi-primary (B) introduces write conflict resolution complexity. Synchronous replication (A) adds latency to every write and still requires failover time. Queueing (C) adds eventual consistency during the failover window but guarantees no data loss."
difficulty: 4
