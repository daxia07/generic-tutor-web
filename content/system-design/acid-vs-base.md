# ACID vs BASE

## Definition
**ACID** (Atomicity, Consistency, Isolation, Durability) is the transaction model for traditional relational databases — strong guarantees but harder to scale. **BASE** (Basically Available, Soft state, Eventually consistent) is the model for many NoSQL databases — weaker guarantees but better scalability and availability.

## Key Terms
- **Atomicity**: All operations in a transaction succeed or all fail — no partial state.
- **Consistency**: Transaction brings the database from one valid state to another.
- **Isolation**: Concurrent transactions don't interfere with each other.
- **Durability**: Once committed, data survives crashes (written to disk/WAL).
- **Basically Available**: System guarantees a response (but it may not be the latest data).
- **Soft state**: System state may change over time even without new input (due to replication).
- **Eventually consistent**: Given enough time without new updates, all replicas converge.
- **Isolation levels**: Read uncommitted, read committed, repeatable read, serializable.
- **Write-Ahead Log (WAL)**: Log writes before applying — ensures durability.

## Why It Matters
This is the theoretical foundation for database trade-offs. Interviewers use it to test whether you understand what guarantees you're giving up when you choose NoSQL, and when those guarantees actually matter.

## Interview Questions
1. "Does this system need ACID transactions or is eventual consistency OK?"
2. "What isolation level would you use for this use case?"
3. "How do you handle eventual consistency in the application layer?"

## Gotchas
- "We need ACID" — do you really? Many operations tolerate eventual consistency.
- Serializable isolation is the safest but slowest — most apps work fine with read committed.
- BASE doesn't mean "no consistency" — it means consistency is managed at the application level.
- Distributed transactions (2PC) try to give ACID across services but are slow and complex.
- Financial systems almost always need ACID for monetary operations — but not for everything else.

## Questions

### Q1
type: multiple-choice
stem: "Which ACID property ensures that a transaction either completes entirely or not at all?"
options:
  - A: Consistency
  - B: Isolation
  - C: Atomicity
  - D: Durability
correct: C
explanation: "Atomicity guarantees all-or-nothing: either all operations in a transaction succeed, or none do."
difficulty: 1

### Q2
type: scenario
stem: "A bank transfer debits account A but the credit to account B fails mid-transaction. Which ACID property ensures the debit is rolled back?"
options:
  - A: Consistency
  - B: Isolation
  - C: Atomicity
  - D: Durability
correct: C
explanation: "Atomicity guarantees all-or-nothing: either both operations commit or neither does. Without atomicity, partial transactions would leave the database in an inconsistent state."
trade_offs: "Atomicity requires transaction logs (write-ahead logs) which add write overhead. In high-throughput systems, some accept eventual consistency instead."
difficulty: 2

### Q3
type: scenario
stem: "Your e-commerce product catalog shows stale prices after a backend update. Customers occasionally see the old price for a few seconds. Which consistency model is this?"
options:
  - A: Strong consistency
  - B: Sequential consistency
  - C: Eventual consistency (BASE)
  - D: Linearizability
correct: C
explanation: "BASE systems accept stale reads temporarily — the data will converge eventually. Strong consistency would show the new price immediately but at the cost of higher latency."
trade_offs: "Eventual consistency works for product catalogs but is dangerous for inventory counts or payment balances where stale data causes real errors."
difficulty: 2

### Q4
type: fill-in-blank
stem: "The technique where a database logs changes to a persistent log before applying them to the main data files, ensuring durability after a crash, is called ______."
answers:
  - "write-ahead logging"
  - "write ahead logging"
  - "WAL"
  - "write-ahead log"
  - "write ahead log"
explanation: "Write-Ahead Logging (WAL) ensures durability by writing changes to a log before applying them. On crash recovery, the log is replayed to restore committed transactions."
difficulty: 2

### Q5
type: select-all
stem: "Which of the following are characteristics of BASE systems?"
options:
  - A: Guaranteed immediate consistency after a write
  - B: System prioritizes availability over strong consistency
  - C: State may change over time due to replication lag
  - D: All replicas converge given enough time without new updates
correct:
  - B
  - C
  - D
explanation: "BASE stands for Basically Available (B), Soft state (C), and Eventually consistent (D). Immediate consistency after a write (A) is a property of ACID systems, not BASE."
difficulty: 2

### Q6
type: scenario
stem: "You are designing a ride-sharing app. Driver location updates arrive every 3 seconds. Riders searching for nearby drivers can tolerate a 5-second delay in location data. Step 1: Identify whether strong or eventual consistency is needed. Step 2: Determine what would go wrong with strong consistency at this write volume. Which model do you choose?"
options:
  - A: Strong consistency — riders must never see stale locations
  - B: Eventual consistency — the update volume is high and a few seconds of staleness is acceptable for rider searches
  - C: Serializable isolation — prevents phantom reads of driver locations
  - D: Read-after-write consistency with distributed locks on each driver's location
correct: B
explanation: "Driver locations update every 3 seconds, creating massive write throughput. Riders can tolerate 5-second staleness, making eventual consistency acceptable. Strong consistency would require coordination across replicas for every update, adding latency and reducing availability at scale."
trade_offs: "Eventual consistency means a rider might see a driver who already moved or became unavailable. The app should handle 'driver unavailable' gracefully. For trip assignment (when money is involved), switch to strong consistency for that specific operation."
difficulty: 3

### Q7
type: scenario
stem: "Your financial platform processes wire transfers. The product team wants to use a NoSQL database for scalability. Step 1: Identify which ACID properties are critical for wire transfers. Step 2: Evaluate whether BASE can satisfy those requirements. Step 3: Propose an architecture that balances both needs. What do you recommend?"
options:
  - A: Use BASE for everything — eventual consistency is fine since transfers settle in days
  - B: Use ACID for the transfer transaction itself, and BASE for ancillary features like notifications and audit dashboards
  - C: Use BASE with application-level compensating transactions to simulate ACID
  - D: Use a NoSQL database with distributed 2PC for all operations
correct: B
explanation: "Wire transfers require atomicity (debit and credit must both succeed or both fail) and durability (once committed, the transfer must not be lost). BASE cannot guarantee these. The hybrid approach uses ACID for the critical path and BASE for features that tolerate eventual consistency."
trade_offs: "Maintaining two data stores adds operational complexity and you must handle data synchronization between them. However, this is a proven pattern in financial systems — keep the strong guarantees where they matter, relax them where they don't."
difficulty: 4

### Q8
type: scenario
stem: "Your application uses read committed isolation. A bug appears where two concurrent transactions read the same row, both compute a new value based on what they read, and both overwrite each other's update — the second write overwrites the first. Step 1: Identify the concurrency anomaly. Step 2: Determine which isolation level prevents it. Step 3: Evaluate the performance cost of that isolation level. What is happening?"
options:
  - A: Phantom read — use serializable isolation
  - B: Lost update — use repeatable read or serializable isolation, or use optimistic locking
  - C: Dirty read — use read committed isolation
  - D: Write skew — use snapshot isolation
correct: B
explanation: "This is a lost update anomaly: two transactions read the same data, compute based on it, and one overwrites the other. Read committed doesn't prevent this. Repeatable read or serializable isolation prevents it, or you can use optimistic locking (version check on write) at the application level."
trade_offs: "Serializable isolation eliminates all anomalies but is the slowest due to strict ordering. Optimistic locking at read committed is often the practical choice — it catches conflicts without the full overhead of serializable, but you must handle retry logic when conflicts occur."
difficulty: 3
