# CAP Theorem

## Definition
In a distributed system, you can only guarantee two of three properties simultaneously: **Consistency** (all nodes see the same data), **Availability** (every request gets a response), and **Partition tolerance** (system works despite network failures). Since network partitions are inevitable, the real choice is between CP and AP.

## Key Terms
- **Consistency**: Every read receives the most recent write or an error.
- **Availability**: Every request receives a (non-error) response, without guarantee it's the most recent write.
- **Partition tolerance**: System continues to operate despite network partitions between nodes.
- **CP system**: Sacrifices availability for consistency (e.g., HBase, MongoDB in certain configs).
- **AP system**: Sacrifices consistency for availability (e.g., Cassandra, DynamoDB).
- **PACELC extension**: Even when no partition exists, there's a trade-off between latency and consistency.

## Why It Matters
CAP theorem frames every distributed database decision. Interviewers use it to test whether you understand trade-offs — there's no "right" answer, only context-dependent choices.

## Interview Questions
1. "Is this system CP or AP? Why?"
2. "Can you have both consistency and availability?"
3. "How does PACELC extend CAP?"

## Gotchas
- Saying "pick two of three" is oversimplified — partitions are unavoidable, so it's really CP vs AP.
- Most real systems are "eventually consistent" — a spectrum, not binary.
- CAP doesn't mean you can't have consistency AND availability most of the time — it's about behavior during partitions.
- Confusing CAP consistency (all nodes same) with ACID consistency (data integrity constraints).

## Questions

### Q1
type: multiple-choice
stem: "According to the CAP theorem, a distributed system can guarantee at most how many of the three properties simultaneously?"
options:
  - A: One
  - B: Two
  - C: Three
  - D: All of them
correct: B
explanation: "The CAP theorem states you can only guarantee 2 of 3: Consistency, Availability, Partition tolerance."
difficulty: 1

### Q2
type: fill-in-blank
stem: "CAP stands for Consistency, ______, and Partition Tolerance."
answers:
  - "Availability"
explanation: "CAP = Consistency, Availability, Partition Tolerance."
difficulty: 1

### Q3
type: multiple-choice
stem: "Which CAP trade-off does a system choose when it remains available during a network partition but may return stale data?"
options:
  - A: CP
  - B: CA
  - C: AP
  - D: PA
correct: C
explanation: "AP systems choose Availability over Consistency during partitions — they serve requests but may return stale data."
difficulty: 2
