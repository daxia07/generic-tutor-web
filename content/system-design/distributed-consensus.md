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
