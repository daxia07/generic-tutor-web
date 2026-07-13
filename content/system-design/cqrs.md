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
type: scenario
stem: "Your analytics dashboard runs heavy read queries that slow down the order processing writes on the same database. How do you optimize read and write workloads independently?"
options:
  - A: Add more database indexes to speed up both
  - B: Use CQRS — separate the write model (normalized) from the read model (denormalized views)
  - C: Increase database server RAM
  - D: Use a caching layer for reads only
correct: B
explanation: "CQRS splits the data model: the command side handles writes with normalized tables optimized for consistency, while the query side uses denormalized read models optimized for fast lookups. Each can scale independently."
trade_offs: "CQRS adds complexity: you must keep read models in sync with write models (eventual consistency), and the infrastructure for two data stores is more expensive to operate."
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

### Q4
type: fill-in-blank
stem: "In CQRS, a ______ is a read model built by processing events from the write side, often stored in a denormalized form optimized for specific queries."
answers:
  - "projection"
  - "projected view"
  - "read projection"
  - "materialized view"
explanation: "A projection transforms write-side events into a read-optimized model. Projections are denormalized views tailored for specific query patterns, rebuilt by replaying events."
difficulty: 2

### Q5
type: select-all
stem: "Which of the following are valid concerns when implementing CQRS?"
options:
  - A: Read models may become stale due to asynchronous projection updates
  - B: Increased infrastructure complexity from maintaining separate data stores
  - C: Difficulty debugging when read and write models diverge
  - D: Inability to scale writes independently from reads
correct:
  - A
  - B
  - C
explanation: "CQRS concerns include eventual consistency of read models (A), managing two data stores (B), and debugging divergence between models (C). Independent scaling of reads and writes is a benefit of CQRS, not a concern (D is false)."
difficulty: 2

### Q6
type: scenario
stem: "Your order management system uses CQRS. After a customer places an order, they are redirected to an order confirmation page — but the read model hasn't updated yet and shows 'no recent orders.' Step 1: Identify the consistency issue. Step 2: Evaluate strategies to fix this. Step 3: Choose the approach with the least complexity. What do you implement?"
options:
  - A: Make all projections synchronous — update the read model in the same transaction as the write
  - B: Use the read-your-owns-writes pattern — after the write completes, read from the write model or wait for the projection to catch up before showing the confirmation
  - C: Add a 5-second delay before redirecting the customer
  - D: Remove CQRS and go back to a single model
correct: B
explanation: "Read-your-owns-writes ensures a user sees their own changes immediately, even if the read model hasn't fully propagated. After a successful command, either read from the write model directly or poll the read model until it reflects the change, then show the confirmation."
trade_offs: "Synchronous projections (A) eliminate the staleness but remove the key benefit of CQRS — independent scaling. A fixed delay (C) is fragile and wastes user time. Read-your-owns-writes adds some complexity but preserves CQRS benefits while solving the UX problem for the writer."
difficulty: 3

### Q7
type: scenario
stem: "You are building a real-time analytics dashboard for an e-commerce platform. The write side processes 10K orders/hour with complex validation. The dashboard needs aggregated metrics by region, category, and time — queries that take 30+ seconds on the normalized write database. Step 1: Identify why the write database struggles with these queries. Step 2: Design a CQRS read model that serves these aggregations fast. Step 3: Decide how to keep it updated. What do you build?"
options:
  - A: Add more indexes to the write database and optimize SQL queries
  - B: Build denormalized projections — pre-computed tables for each aggregation dimension, updated by consuming order events asynchronously
  - C: Use a caching layer in front of the write database
  - D: Run the analytics queries against a read replica of the write database
correct: B
explanation: "Pre-computed projections store aggregations in a form optimized for each query pattern (e.g., a table per dashboard widget). Order events trigger projection updates asynchronously. This serves dashboard queries in milliseconds instead of 30+ seconds."
trade_offs: "Each projection adds storage and must be rebuilt if the schema changes. Projections are eventually consistent — the dashboard may lag behind real-time. For a live dashboard, you might pair projections with a streaming layer (e.g., Kafka + materialized view) for near-real-time updates at higher infrastructure cost."
difficulty: 3

### Q8
type: scenario
stem: "Your team proposes CQRS for a simple CRUD application — a blog CMS with 500 daily users. Writes and reads use the same data shape. Step 1: Evaluate whether CQRS is appropriate here. Step 2: Identify the cost of applying CQRS unnecessarily. Step 3: Recommend the right approach. What do you tell the team?"
options:
  - A: Use CQRS — it's always better to separate reads and writes
  - B: Skip CQRS — the read/write patterns don't diverge, and the added complexity (two models, synchronization, eventual consistency) outweighs any benefit for this scale
  - C: Use CQRS but with a shared database to reduce complexity
  - D: Use event sourcing instead of CQRS for auditability
correct: B
explanation: "CQRS is overkill when read and write patterns are similar and the scale doesn't justify the complexity. A single well-indexed model is simpler, faster to develop, and easier to debug. CQRS pays off when reads and writes genuinely diverge in shape, volume, or latency requirements."
trade_offs: "If the blog CMS later needs complex analytics dashboards or multi-model views, you might retrofit CQRS for those specific features. Don't over-engineer early — you can introduce CQRS incrementally for the parts that need it, rather than applying it everywhere from day one."
difficulty: 4
