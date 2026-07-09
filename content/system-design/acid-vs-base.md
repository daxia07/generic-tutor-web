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
type: order
stem: "Order the ACID properties alphabetically:"
items:
  - "Atomicity"
  - "Consistency"
  - "Durability"
  - "Isolation"
correct_order: [0, 1, 3, 2]
explanation: "A-C-I-D: Atomicity, Consistency, Isolation, Durability."
difficulty: 1

### Q3
type: fill-in-blank
stem: "BASE stands for Basically Available, ______ state, and Eventually consistent."
answers:
  - "Soft"
explanation: "BASE = Basically Available, Soft state, Eventually consistent — the opposite of ACID."
difficulty: 2
