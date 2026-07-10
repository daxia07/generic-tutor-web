# Replication

## Definition
Database replication copies data across multiple servers to improve availability, fault tolerance, and read throughput. The main challenge is keeping replicas consistent with the primary (leader).

## Key Terms
- **Leader-follower (primary-replica)**: One leader handles writes, followers replicate and serve reads.
- **Multi-leader**: Multiple nodes accept writes — higher availability but conflict resolution needed.
- **Leaderless**: Any node accepts reads/writes (e.g., Dynamo, Cassandra). Uses quorum reads/writes.
- **Synchronous replication**: Leader waits for follower confirmation before acknowledging write. Durable but slow.
- **Asynchronous replication**: Leader doesn't wait — faster but risk of data loss on failover.
- **Semi-synchronous**: At least one follower is synchronous, rest async. Common compromise.
- **Replication lag**: Time between leader write and follower replication. Causes stale reads.
- **Failover**: Promoting a follower to leader when the current leader fails.
- **Split-brain**: Two nodes both think they're leader — leads to data inconsistency.
- **Read replicas**: Followers dedicated to serving read traffic.

## Why It Matters
Replication is fundamental to high availability. Every production database uses it. Interviewers want to hear you reason about consistency vs availability trade-offs in replication strategies.

## Interview Questions
1. "How would you make this database highly available?"
2. "What happens when the primary goes down?"
3. "How do you handle replication lag for read-after-write consistency?"

## Gotchas
- Async replication means failover can lose data — know your durability requirements.
- Split-brain is a real operational risk — need fencing mechanisms or consensus protocols.
- Reading from replicas immediately after writing can return stale data (read-after-write inconsistency).
- Replication doesn't help with write scaling (in leader-follower setup) — only reads.
- Failover isn't instant — there's always a brief unavailability window.

## Questions

### Q1
type: multiple-choice
stem: "Which replication strategy provides the strongest consistency guarantee?"
options:
  - A: Asynchronous replication
  - B: Synchronous replication
  - C: Semi-synchronous
  - D: Eventual consistency
correct: B
explanation: "Synchronous replication waits for all replicas to confirm the write before acknowledging, providing strong consistency."
difficulty: 1

### Q2
type: scenario
stem: "Your application writes to a primary database and reads from a replica. A user writes a comment but immediately sees the page without their comment. What consistency model is this, and how do you fix it?"
options:
  - A: Strong consistency — switch to synchronous replication
  - B: Eventual consistency with replication lag — read from primary for recently-written data
  - C: Weak consistency — add a caching layer
  - D: Causal consistency — use vector clocks
correct: B
explanation: "Asynchronous replication introduces lag between primary and replica. The fix is 'read-your-writes' consistency: route reads for a user's own data to the primary, or wait for replication catch-up."
trade_offs: "Reading from primary adds load to one server. For global apps, you can use session stickiness or replication wait with a timeout instead."
difficulty: 2

### Q3
type: select-all
stem: "Which are valid replication topologies?"
options:
  - A: Single-leader
  - B: Multi-leader
  - C: Leaderless
  - D: No-leader
correct:
  - A
  - B
  - C
explanation: "Single-leader, multi-leader, and leaderless (peer-to-peer) are the three main replication topologies."
difficulty: 2
