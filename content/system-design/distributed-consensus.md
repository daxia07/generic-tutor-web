# Distributed Consensus

## Definition
Distributed consensus is the problem of getting multiple nodes to agree on a single value or sequence of values, even in the presence of failures. It's fundamental to distributed systems — leader election, distributed locking, and replicated state machines all depend on it.

## Key Terms
- **Raft**: Understandable consensus algorithm — leader election + log replication. Used by etcd, Consul.
- **Paxos**: The classic consensus algorithm — correct but notoriously hard to understand and implement.
- **Leader election**: Process of selecting one node as the leader/primary.
- **Log replication**: Replicating a sequence of operations across all nodes in order.
- **Quorum**: Majority of nodes must agree (e.g., 3 of 5). Ensures only one partition can make progress.
- **Split-brain**: Two nodes believe they are leader — quorum prevents this.
- **Fencing token**: Monotonically increasing token to prevent stale leaders from acting.
- **ZAB (ZooKeeper Atomic Broadcast)**: ZooKeeper's consensus protocol.
- **Byzantine fault tolerance**: Consensus even when nodes can lie (not just crash). Rare in practice.

## Why It Matters
Consensus underpins critical infrastructure: ZooKeeper for coordination, etcd for Kubernetes, Consul for service discovery. Interviewers test this to see if you understand the foundations of distributed systems.

## Interview Questions
1. "How does leader election work in a distributed system?"
2. "How would you implement a distributed lock?"
3. "What's the role of quorum in consensus?"

## Gotchas
- Don't implement your own consensus — use ZooKeeper, etcd, or Consul.
- Distributed locks are tricky: lock expiry, fencing tokens, clock skew.
- Quorum size: need (N/2 + 1) nodes available. 3-node cluster tolerates 1 failure, 5 tolerates 2.
- Consensus is expensive — don't use it for every operation, only for coordination.
- Network partitions can cause temporary unavailability — that's the CAP trade-off.

## Questions

### Q1
type: multiple-choice
stem: "Which consensus algorithm is used by etcd and ZooKeeper?"
options:
  - A: Paxos
  - B: Raft
  - C: Two-phase commit
  - D: Gossip
correct: B
explanation: "etcd uses Raft. ZooKeeper uses ZAB (which is Raft-like). Paxos is used by Google's Chubby."
difficulty: 2

### Q2
type: scenario
stem: "A 5-node cluster experiences a network partition: 2 nodes are isolated from the other 3. Can the group of 3 nodes still make progress (accept writes and elect a leader)?"
options:
  - A: No — all nodes must be reachable for consensus
  - B: Yes — 3 out of 5 is a majority (quorum), so they can elect a leader and continue
  - C: Only if the partitioned nodes voluntarily step down
  - D: Yes, but only for reads, not writes
correct: B
explanation: "In Raft/Paxos, a quorum is ⌊N/2⌋ + 1. For 5 nodes, quorum = 3. The group of 3 can elect a leader and commit entries. The isolated 2 nodes cannot achieve quorum and will not make progress."
trade_offs: "During a partition, two competing leaders could emerge (split-brain). Raft prevents this by requiring majority vote. However, the isolated minority becomes unavailable until the partition heals."
difficulty: 2

### Q3
type: multiple-choice
stem: "What problem does distributed consensus solve?"
options:
  - A: Load balancing
  - B: Agreeing on a value across distributed nodes
  - C: Caching
  - D: Rate limiting
correct: B
explanation: "Distributed consensus ensures all nodes agree on the same data/value, critical for consistency in distributed systems."
difficulty: 1

### Q4
type: fill-in-blank
stem: "A monotonically increasing token used to prevent a stale leader from issuing commands after a network partition heals is called a ______ token."
answers:
  - "fencing"
  - "fence"
explanation: "A fencing token is a number that increases every time a new leader is elected. Storage systems check the token and reject requests with lower numbers, ensuring a stale leader from a previous term cannot make changes."
difficulty: 2

### Q5
type: select-all
stem: "Which of the following are valid concerns when implementing a distributed lock?"
options:
  - A: Lock expiry — the lock holder may crash and never release the lock
  - B: Clock skew — different nodes' clocks are not perfectly synchronized
  - C: Fencing tokens — stale lock holders must be prevented from acting
  - D: Load balancing — distributing lock requests evenly
correct:
  - A
  - B
  - C
explanation: "Distributed locks face expiry (holder crashes), clock skew (leases rely on clocks), and stale holders (fencing tokens mitigate this). Load balancing is unrelated to the correctness of distributed locking."
difficulty: 3

### Q6
type: scenario
stem: "Step 1: A 3-node Raft cluster elects Node A as leader with term 3. Step 2: Node A gets isolated from Node B and Node C. Step 3: Node B and Node C elect Node B as leader with term 4. Step 4: The network partition heals and Node A sends an AppendEntries with term 3 to Node B. What happens?"
options:
  - A: Node B accepts the entries because Node A was the original leader
  - B: Node B rejects the AppendEntries because term 3 is less than term 4, and Node A steps down to follower
  - C: Node B forwards the entries to Node C for a majority vote
  - D: Split-brain occurs — both leaders accept writes
correct: B
explanation: "In Raft, a node always respects the higher term. Node B sees term 3 < term 4 and rejects the request, returning its current term. Node A receives the higher term response and immediately steps down as follower. This is how Raft prevents split-brain after partition healing."
trade_offs: "Node A's uncommitted entries from the isolated period may be overwritten. Raft guarantees safety (no two leaders commit in the same term) at the cost of availability during the partition. Some entries may need to be re-proposed by the new leader."
difficulty: 3

### Q7
type: scenario
stem: "Step 1: You are designing a system that needs distributed locking for 10,000 concurrent operations per second. Step 2: You consider using ZooKeeper for each lock acquisition. Step 3: Your benchmark shows ZooKeeper can handle only ~2,000 operations per second per ensemble. What should you do?"
options:
  - A: Use a larger ZooKeeper ensemble (7 nodes instead of 3)
  - B: Use a distributed lock only for coordination of critical sections, and use finer-grained locking or lease-based approaches to reduce contention — consider Redis with Redlock for high-throughput locks
  - C: Remove distributed locking entirely — it is always unnecessary
  - D: Add more memory to the ZooKeeper nodes
correct: B
explanation: "Consensus systems like ZooKeeper are designed for coordination (leader election, config management), not high-throughput locking. For 10K TPS locks, use lease-based approaches, striped locks, or Redis-based locks. Reduce the scope and duration of distributed locks to minimize consensus overhead."
trade_offs: "Redis with Redlock is faster but makes stronger assumptions (synchronized clocks, single Redis instances). ZooKeeper is slower but provides stronger guarantees. Choose based on whether you need correctness (ZooKeeper) or throughput (Redis). Stripe locks across multiple keys to reduce contention."
difficulty: 4

### Q8
type: scenario
stem: "Step 1: A client acquires a distributed lock with a 10-second lease from a coordination service. Step 2: The client begins a long-running operation (e.g., a database migration) that takes 30 seconds. Step 3: The lease expires while the operation is still running. Step 4: Another client acquires the same lock. What problem does this illustrate and how do you prevent it?"
options:
  - A: This is a deadlock — use a timeout to prevent it
  - B: This illustrates the problem of non-atomic lock ownership — use a fencing token: the storage layer rejects writes with older fencing tokens
  - C: This is a network partition — increase the lease duration
  - D: This is normal behavior and does not cause problems
correct: B
explanation: "If a lock holder's lease expires while it's still working, two clients may believe they hold the lock simultaneously. Fencing tokens solve this: each lock acquisition gets a higher token, and the storage system rejects operations with tokens lower than the latest one seen. The first client's writes would be rejected even though it thinks it still holds the lock."
trade_offs: "Increasing lease duration reduces the chance of expiry but increases the wait time if the holder crashes (no other client can acquire the lock until the lease expires). Fencing tokens decouple lock ownership from operation safety — the storage layer provides the real protection."
difficulty: 3
