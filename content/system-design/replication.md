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

### Q4
type: fill-in-blank
stem: "When two nodes both believe they are the primary leader after a network partition, this dangerous state is called ______."
answers:
  - "split-brain"
  - "split brain"
  - "splitbrain"
explanation: "Split-brain occurs when a network partition causes two nodes to assume leadership, leading to conflicting writes and data inconsistency. Fencing mechanisms or consensus protocols (like Raft) prevent this."
difficulty: 2

### Q5
type: select-all
stem: "Which are valid strategies to achieve read-your-writes consistency in an asynchronously replicated system?"
options:
  - A: Route the user's own reads to the leader for a short time after their write
  - B: Use session stickiness to always route a user's reads to the same replica
  - C: Wait for replication lag to catch up before serving reads from the replica
  - D: Switch all reads to go through the leader permanently
correct:
  - A
  - B
  - C
explanation: "Read-your-writes can be achieved by: routing recent-writer users to the leader, session stickiness, or waiting for replication confirmation. Permanently routing all reads to the leader defeats the purpose of read replicas."
difficulty: 2

### Q6
type: scenario
stem: "Step 1: Your database uses asynchronous leader-follower replication. Step 2: The leader crashes and the system automatically promotes the most up-to-date follower. Step 3: Some writes on the leader had not yet been replicated to the promoted follower. What happens to those writes?"
options:
  - A: The writes are automatically recovered from the old leader's log when it comes back online
  - B: The unreplicated writes are lost — this is the data loss window inherent in asynchronous replication
  - C: The promotion is blocked until the follower catches up with the leader's last write
  - D: The old leader replays its missing writes to the new leader upon reconnection
correct: B
explanation: "In async replication, the leader acknowledges writes before followers confirm them. If the leader crashes before replication completes, those writes are lost. This is the fundamental trade-off: async replication is faster but risks data loss on failover."
trade_offs: "Synchronous replication prevents this data loss but significantly increases write latency and reduces availability (if a follower goes down, writes block). Semi-synchronous replication is a common compromise — at least one follower confirms each write before ack, reducing (but not eliminating) the data loss window."
difficulty: 3

### Q7
type: scenario
stem: "Step 1: You're designing a globally distributed social media app with a leader-follower database. Step 2: Users in Asia write to the leader in the US. Users in Asia also read from a local Asian replica. Step 3: Replication lag is 200ms, but users expect to see their own posts immediately. How do you solve this read-after-write inconsistency?"
options:
  - A: Switch to synchronous replication so Asian reads always reflect the latest writes
  - B: Route the posting user's reads to the US leader for a short window (e.g., 1 second) after their write
  - C: Move the leader to Asia so all writes are local
  - D: Accept the 200ms lag — users won't notice for social media content
correct: B
explanation: "The standard solution is 'read-your-writes' consistency: after a user writes, route their subsequent reads to the leader (or a synchronous follower) for a short window. This gives the user immediate feedback while still serving most reads from low-latency replicas."
trade_offs: "Routing some reads to the US leader adds latency for those specific requests from Asian users. This is acceptable because it only applies to the user's own content for a brief window. Alternative: track the replication position and serve reads from the replica only after it has caught up to the user's write position."
difficulty: 3

### Q8
type: scenario
stem: "Step 1: You're choosing a replication topology for a collaborative document editing app. Step 2: Users in the US and Europe both need to edit documents simultaneously with low latency. Step 3: Using a single leader would add 150ms+ latency for one region's writes. Which topology and conflict resolution strategy do you choose?"
options:
  - A: Single-leader with synchronous replication — consistency is more important than latency for documents
  - B: Multi-leader replication with conflict-free replicated data types (CRDTs) or last-writer-wins with vector clocks for conflict resolution
  - C: Leaderless with quorum reads/writes (W=2, R=2) — this handles multi-region writes natively
  - D: Single-leader with an in-memory write buffer in the remote region to hide latency
correct: B
explanation: "Multi-leader replication lets both regions accept writes with local latency. Conflicts are inevitable, so you need a resolution strategy: CRDTs merge concurrent edits automatically, while last-writer-wins with vector clocks provides deterministic ordering based on causality."
trade_offs: "Multi-leader with CRDTs is complex to implement correctly — not all data types have good CRDT representations. Last-writer-wins can silently lose concurrent edits. You must also handle divergent states that need manual resolution. The complexity is justified only if low-latency writes in multiple regions are a hard requirement."
difficulty: 4
