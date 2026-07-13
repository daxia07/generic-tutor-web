---
tags:
  - system-design
  - airwallex
  - architecture
aliases:
  - CQRS
  - Event Sourcing
  - event-sourced
last-updated: 2026-06-22
type: concept
---

# CQRS + Event Sourcing — Interview Guide

> [!tip] Airwallex's Auticuro wallet uses this pattern. Expect it in system design rounds.

## The Problem It Solves

Traditional CRUD: one model handles reads AND writes. Works fine until:
- Read and write patterns diverge (reads need denormalized views, writes need strict validation)
- You need an audit trail (financial systems REQUIRE this)
- You need to replay state (debugging, compliance, point-in-time recovery)

## CQRS (Command Query Responsibility Segregation)

**Core idea:** Separate the write model (commands) from the read model (queries).

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│   Client     │────▶│  Command API │────▶│  Write Model │
│              │     │  (POST/PUT)  │     │  (normalized)│
└─────────────┘     └──────────────┘     └──────┬───────┘
                                                │
                                          ┌─────▼──────┐
                                          │   Event     │
                                          │   Store     │
                                          └─────┬──────┘
                                                │
┌─────────────┐     ┌──────────────┐     ┌──────▼───────┐
│   Client     │────▶│  Query API   │────▶│  Read Model  │
│              │     │  (GET)       │     │ (denormalized│
└─────────────┘     └──────────────┘     │  for queries)│
                                          └──────────────┘
```

**Why separate?**
- Write model: optimized for validation, consistency, business rules
- Read model: optimized for fast queries, can be denormalized, cached
- They can scale independently (reads usually 10-100x more than writes)

## Event Sourcing

**Core idea:** Instead of storing current state, store ALL events that led to current state.

**Traditional approach:**
```
Account balance = $500  (just the current value)
```

**Event Sourcing approach:**
```
Event 1: AccountCreated(id=123, balance=0)
Event 2: MoneyDeposited(id=123, amount=1000)
Event 3: MoneyWithdrawn(id=123, amount=500)
→ Current balance = 0 + 1000 - 500 = $500
```

**Why?**
- **Audit trail:** Every change is recorded (financial compliance)
- **Time travel:** Reconstruct state at any point in time
- **Debugging:** Replay events to understand what happened
- **Event-driven:** Other services can subscribe to events

## How They Work Together

CQRS + Event Sourcing are often combined:

1. **Commands** produce **events** (write side)
2. Events are stored in **event store** (append-only log)
3. Events are projected into **read models** (query side)
4. Read models are denormalized views optimized for specific queries

```
Command: TransferMoney(from=A, to=B, amount=100)
  ↓
Event: MoneyTransferred(from=A, to=B, amount=100, timestamp=...)
  ↓
Event Store: [append event to log]
  ↓
Projection 1: Update Account A balance view (-100)
Projection 2: Update Account B balance view (+100)
Projection 3: Update transaction history view
```

## Airwallex Context: Auticuro

Auticuro is Airwallex's wallet service. Key facts:
- **91.1% Rust** — high performance
- **CQRS + Event Sourcing** — every wallet transaction is an event
- **Raft consensus** — distributed agreement for consistency
- **P99 < 20ms @ 10K TPS** — latency-sensitive

**Why this pattern for a wallet?**
- Financial regulations require audit trails
- Need to reconstruct balance at any point in time
- Multiple views of the same data (balance, history, analytics)
- High throughput reads (balance checks) vs writes (transactions)

## Interview Talking Points

**When asked "Design a payment system" or "Design a multi-currency wallet":**

1. "I'd use CQRS to separate the write path (transactions) from the read path (balance queries)"
2. "For the write model, I'd use Event Sourcing — every transaction is an immutable event"
3. "This gives us an audit trail for compliance, and we can replay events for debugging"
4. "Read models can be denormalized for fast queries — e.g., a materialized view for balance"
5. "For consistency, we'd use Raft consensus or a strong consistency model"

**Common follow-ups:**
- "How do you handle eventual consistency?" → Projections catch up; use read-your-writes for critical paths
- "What if the event store is down?" → Write-ahead log, replication, circuit breaker
- "How do you handle schema evolution?" → Event versioning, upcasting

## Quick Reference

| Concept | What | Why |
|---------|------|-----|
| CQRS | Separate read/write models | Scale independently, optimize each |
| Event Sourcing | Store events, not state | Audit trail, time travel, event-driven |
| Event Store | Append-only log of events | Immutable, ordered, replayable |
| Projection | Transform events into read views | Denormalized for fast queries |
| Raft Consensus | Distributed agreement protocol | Strong consistency across nodes |

## Related
- [[knowledge/system-design/event-driven-architecture|Event-Driven Architecture]]
- [[knowledge/airwallex-interview-prep|Airwallex Interview Prep]]

## Questions

### Q1
type: multiple-choice
stem: "In Event Sourcing, how is the current state of an entity determined?"
options:
  - A: Read from a database table
  - B: Replay all events from the event store
  - C: Cache the latest value
  - D: Query an API
correct: B
explanation: "Event Sourcing stores all state changes as events. Current state is derived by replaying the event sequence."
difficulty: 2

### Q2
type: scenario
stem: "Your event-sourced Order aggregate has 10M events. Replaying all events on server restart takes 30 minutes. How do you reduce startup time without losing auditability?"
options:
  - A: Delete old events that are no longer relevant
  - B: Take periodic snapshots — save the computed state at a point in time, then only replay events after that point
  - C: Store fewer events by coalescing multiple events into one
  - D: Move to a relational database instead
correct: B
explanation: "Snapshots capture the aggregate state at a specific event sequence number. On load, apply the snapshot then replay only events after that point. All events are still stored for audit — snapshots are a performance optimization."
trade_offs: "Snapshots add storage overhead and must be regenerated if your event schema changes. Snapshot frequency is a tuning trade-off: more snapshots = faster loads but more storage."
difficulty: 3

### Q3
type: select-all
stem: "Which are advantages of Event Sourcing?"
options:
  - A: Complete audit trail
  - B: Time travel (replay to any point)
  - C: Simpler queries
  - D: Natural event-driven integration
correct:
  - A
  - B
  - D
explanation: "Event Sourcing provides full audit trails, time travel, and natural event-driven integration. Queries are actually more complex (need projections)."
difficulty: 3

### Q4
type: fill-in-blank
stem: "In CQRS + Event Sourcing, the process of transforming events from the event store into a read-optimized model is called ______."
answers:
  - "projection"
  - "projecting"
  - "event projection"
  - "building a projection"
explanation: "A projection processes events from the event store and builds a denormalized read model optimized for specific query patterns. Multiple projections can build different views from the same events."
difficulty: 2

### Q5
type: select-all
stem: "Which of the following are challenges of Event Sourcing?"
options:
  - A: Event schema evolution — old events may not match new code
  - B: Large event streams slow down state reconstruction
  - C: Queries are simpler and faster than CRUD
  - D: Debugging requires tracing through events rather than inspecting current state
correct:
  - A
  - B
  - D
explanation: "Event Sourcing challenges include schema evolution (A), slow state reconstruction for large streams (B), and harder debugging (D). Queries are actually more complex because they require projections (C is false)."
difficulty: 2

### Q6
type: scenario
stem: "Your event-sourced wallet system has a MoneyTransferred event. The business now requires a transaction fee, so you add a fee field. Old events don't have this field. Step 1: Identify the schema evolution problem. Step 2: Evaluate strategies to handle old events with the new code. Step 3: Choose the approach that preserves event immutability. What do you do?"
options:
  - A: Update all old events in the event store to include the fee field with a default value
  - B: Use event upcasting — transform old events to the new schema in memory when loading, without modifying the stored events
  - C: Delete old events and recreate them with the new schema
  - D: Keep two versions of the MoneyTransferred handler and branch on event version
correct: B
explanation: "Event upcasting transforms old event versions to new versions in memory during deserialization. The stored events remain immutable. An upcaster adds the default fee field when it encounters an old MoneyTransferred event, so the domain logic only handles the current schema."
trade_offs: "Upcasting adds a translation layer that must be maintained for every schema change. Complex transformations (not just adding defaults) can be error-prone. Over time, you accumulate many upcasters, increasing code complexity. Some teams periodically snapshot and archive old events to limit upcaster accumulation."
difficulty: 3

### Q7
type: scenario
stem: "Your event-sourced system processes financial transactions. A projection that computes account balances is lagging — it shows a balance of $900 but the actual balance after all events is $800. A customer tries to withdraw $850 and is approved based on the stale projection. Step 1: Identify the root cause of the incorrect approval. Step 2: Evaluate whether the read model or write model should enforce the business rule. Step 3: Propose a fix that prevents this. What went wrong?"
options:
  - A: The read model should validate all business rules before the write model
  - B: The write model (command handler) should validate the balance by replaying events from the event store, not by reading the projection — projections are eventually consistent and cannot be trusted for business validation
  - C: Make all projections synchronous so they never lag
  - D: Add a secondary database to double-check balances
correct: B
explanation: "In CQRS + Event Sourcing, the write model is the source of truth. Business rules (like sufficient balance) must be validated by loading the aggregate from the event store and checking its current state. Projections are for reads only — they are eventually consistent and must never be used for command validation."
trade_offs: "Loading an aggregate from events on every command adds latency, especially for large event streams (mitigated by snapshots). Synchronous projections (C) remove the consistency gap but defeat the purpose of CQRS by coupling read and write performance. The hybrid approach: validate on the write side, serve queries from projections."
difficulty: 4

### Q8
type: scenario
stem: "Your event-sourced order system has been running for 3 years. The Order aggregate averages 50 events each. A new regulatory requirement asks: 'Show me the exact state of Order #1234 on March 15, 2025 at 2:30 PM.' Step 1: Determine how to reconstruct the state at that specific time. Step 2: Evaluate the computational cost for orders with many events. Step 3: Propose an optimization if this query becomes frequent. How do you implement this?"
options:
  - A: Query the read model database with a timestamp filter
  - B: Replay events up to the target timestamp — filter the event stream for that order and apply only events on or before March 15, 2025 2:30 PM to reconstruct the state at that point
  - C: Store periodic full-state snapshots and use the snapshot closest to the target time, then replay only events between the snapshot and the target timestamp
  - D: It's impossible — event sourcing only stores the current state
correct: C
explanation: "For frequent temporal queries, use snapshots near the target time then replay only the intervening events. Option B works but is slow for large streams without snapshots. The read model (A) only has the current state, not historical. Option D is false — event sourcing's entire purpose is storing history."
trade_offs: "Storing snapshots at fine granularity (e.g., hourly) uses more storage but makes temporal queries fast. Coarser snapshots save storage but require replaying more events. You could also build a dedicated projection that maintains point-in-time state at daily intervals, trading precomputation cost for query speed."
difficulty: 3
