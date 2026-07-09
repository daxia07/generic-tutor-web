# CQRS (Command Query Responsibility Segregation)

## Definition
CQRS separates the read model (queries) from the write model (commands) into different models, and potentially different databases. The write side optimizes for data integrity and business rules. The read side optimizes for query performance, often with denormalized views.

## Key Terms
- **Command**: An operation that changes state (create, update, delete). Returns no data.
- **Query**: An operation that reads state. Returns data, no side effects.
- **Write model**: Normalized, optimized for consistency and business rules.
- **Read model**: Denormalized, optimized for specific query patterns. May be a different database.
- **Projection**: A read model built by processing events from the write side.
- **Event sourcing + CQRS**: Events are the write model, projections are read models. Common pairing.
- **Materialized view**: Pre-computed query result stored as a table — the read model.
- **Sync vs async projection**: Read model updated immediately vs eventually after write.

## Why It Matters
CQRS is powerful when read and write patterns are very different (most systems). It's often paired with event sourcing for audit trails and temporal queries. Interviewers test this when the system has complex query requirements.

## Interview Questions
1. "The read and write patterns are very different — how would you handle this?"
2. "How would you build a real-time dashboard for this system?"
3. "When would you use CQRS vs a single model?"

## Gotchas
- CQRS adds complexity — only use when read/write patterns genuinely diverge.
- Async projections mean read model may be stale — is that acceptable?
- Without event sourcing, CQRS is simpler but loses audit trail benefits.
- Don't apply CQRS everywhere — it's overkill for simple CRUD applications.
- Debugging is harder when read and write are separate — need correlation IDs and tracing.

## Questions

### Q1
type: multiple-choice
stem: "What does CQRS stand for?"
options:
  - A: Central Query and Response System
  - B: Command Query Responsibility Segregation
  - C: Consistent Query Replication Service
  - D: Cache Query Routing Strategy
correct: B
explanation: "CQRS = Command Query Responsibility Segregation — separating read and write models."
difficulty: 1

### Q2
type: fill-in-blank
stem: "In CQRS, the ______ model handles creating and updating data, while the query model handles reads."
answers:
  - "command"
explanation: "Commands handle writes (create/update/delete). Queries handle reads. They use separate models."
difficulty: 2

### Q3
type: select-all
stem: "Which are benefits of CQRS?"
options:
  - A: Independent scaling of reads and writes
  - B: Optimized read models
  - C: Simpler system design
  - D: Eventual consistency support
correct:
  - A
  - B
  - D
explanation: "CQRS enables independent scaling, optimized reads, and eventual consistency. It actually adds complexity, not simplifies."
difficulty: 2
