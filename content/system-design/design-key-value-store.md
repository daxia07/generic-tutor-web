# Design a Key-Value Store

## Definition
A key-value store is a distributed storage system designed for high availability and horizontal scalability, where data is accessed via a simple put(key, value)/get(key) interface. Systems like Amazon Dynamo and Apache Cassandra use consistent hashing to partition data across nodes, replicate across multiple replicas for durability, and employ eventual consistency with conflict-resolution mechanisms such as vector clocks, trading strong consistency guarantees for always-writable behavior and low latency at scale.

## Key Terms
- **Consistent Hashing**: A partitioning scheme where keys are mapped to a hash ring, and each node owns the region of the ring between its position and the previous node, minimizing data movement when nodes join or leave.
- **Virtual Node (VNode)**: A lightweight abstraction where each physical node is assigned multiple positions on the hash ring, improving load distribution and making it easier to handle heterogeneous hardware.
- **Replication Factor (N)**: The number of copies of each key maintained across different nodes in the cluster.
- **Vector Clock**: A mechanism for tracking causal history of a data item across replicas, enabling detection of concurrent updates and conflict resolution.
- **SSTable (Sorted String Table)**: An immutable, sorted file format stored on disk that maps keys to values, enabling efficient lookups via sparse indexes.
- **LSM Tree (Log-Structured Merge Tree)**: A write-optimized data structure that batches writes in an in-memory memtable and flushes to disk as SSTables, merging them in background compaction.
- **Bloom Filter**: A space-efficient probabilistic data structure used to test whether a key may exist in an SSTable, eliminating unnecessary disk reads for absent keys.
- **Compaction**: The process of merging multiple SSTables into fewer, larger files to reclaim space from tombstones and overlaps, with strategies including size-tiered and leveled.
- **Tombstone**: A deletion marker written instead of immediately removing data, ensuring that deletes propagate correctly to replicas during eventual consistency.
- **Quorum**: A consistency level for reads and writes defined by R and W such that W + R > N guarantees that any read sees at least one replica with the latest write.
- **Hinted Handoff**: A technique where a write destined for a downed replica is temporarily stored on another live node and delivered when the target comes back online.
- **Read Repair**: A mechanism triggered during a read that compares data across replicas and updates stale replicas with the latest version, proactively reducing inconsistency.
- **Anti-Entropy (Merkle Tree)**: A background synchronization process where nodes exchange Merkle tree hashes to detect and repair divergent data ranges between replicas.
- **Eventual Consistency**: A consistency model guaranteeing that if no new updates are made, all replicas will eventually converge to the same value, accepting temporary divergence.

## Why It Matters
Key-value stores are the backbone of many large-scale internet services that prioritize availability and partition tolerance over strong consistency, as described by the CAP theorem. Understanding their design is essential because almost every modern distributed database borrows techniques from Dynamo-style architectures — consistent hashing, gossip protocols, vector clocks, and tunable quorums appear across Cassandra, Riak, DynamoDB, and even portions of Spanner. Interviewers test this topic because it demonstrates that you can reason about the fundamental trade-offs in distributed systems: consistency vs. availability, read vs. write optimization, and latency vs. durability.

These systems also illustrate how real-world engineering navigates the gap between theory and practice. For example, vector clocks detect conflicts but require application-level reconciliation; LSM trees deliver fast writes but create read amplification that bloom filters and compaction must mitigate. Mastering these interlocking mechanisms shows you can design systems that work under production constraints rather than just in textbooks.

## Interview Questions
1. "How does consistent hashing with virtual nodes improve load balancing compared to naive consistent hashing?"
2. "Explain the W + R > N quorum condition and what consistency guarantees it provides."
3. "How do vector clocks detect concurrent updates, and what must the application do when a conflict is found?"
4. "Why do LSM-tree-based stores need compaction, and what are the trade-offs between size-tiered and leveled compaction?"
5. "What role do bloom filters play in reducing read latency in an SSTable-based storage engine?"

## Gotchas
- Assuming quorum reads always return the latest value — clock skew and network partitions can still cause anomalies even when W + R > N.
- Forgetting that tombstones must be retained through a grace period (e.g., gc_grace_seconds in Cassandra) before removal during compaction, or deletes can resurrect stale data.
- Confusing eventual consistency with "no guarantees" — eventual consistency still promises convergence, and read repair plus anti-entropy are what deliver that promise.
- Overlooking read amplification in LSM trees: a single read may need to check memtable + multiple SSTables, which is why bloom filters and sparse indexes are critical.
- Ignoring the impact of virtual node count on rebalancing — too few vnodes re-introduces hotspots; too many increases gossip overhead.
- Treating hinted handoff as a durability guarantee — hints are dropped if the handoff node also fails or the hint window expires.

## Questions

### Q1
type: multiple-choice
stem: "In consistent hashing, what problem do virtual nodes primarily solve?"
options:
  - A: They reduce the number of network hops required to locate a key
  - B: They eliminate the need for a gossip protocol
  - C: They improve load distribution by giving each physical node multiple positions on the ring, preventing hotspots from uneven key distributions
  - D: They guarantee strong consistency across replicas
correct: C
explanation: "Without virtual nodes, a physical node owns a single contiguous ring segment; if keys hash unevenly, some nodes become overloaded. Virtual nodes assign each physical node many small, scattered segments, averaging out skew."
difficulty: 1

### Q2
type: multiple-choice
stem: "A Dynamo-style key-value store uses replication factor N=3, write quorum W=2, and read quorum R=2. Which statement best describes the consistency guarantee?"
options:
  - A: All reads will always see the most recent write because the system provides linearizability
  - B: Reads are guaranteed to see at least one replica that has the latest write since W + R > N, but concurrent writes can still cause conflicts resolved by vector clocks
  - C: The system guarantees partition tolerance but sacrifices availability under any network issue
  - D: With W=2 and R=2, no read will ever return stale data regardless of clock skew
correct: B
explanation: "W + R > N ensures that the read quorum overlaps with the write quorum, so at least one replica in the read set has the latest version. However, this is not linearizability — concurrent writes can create sibling versions that vector clocks detect, requiring reconciliation."
difficulty: 2

### Q3
type: fill-in-blank
stem: "In Dynamo-style systems, the condition that ensures a read quorum overlaps with at least one replica from the write quorum is expressed as W + R ___ N, where the blank must be filled with a comparison operator and the relationship must be strict."
answers:
  - "> N"
  - "greater than N"
  - "strictly greater than N"
  - ">N"
explanation: "The strict inequality W + R > N ensures the read quorum and write quorum overlap by at least one replica, guaranteeing that any read sees at least one node that has the latest write."
difficulty: 1

### Q4
type: fill-in-blank
stem: "A ___ is a special marker written to indicate that a key has been deleted, ensuring the deletion propagates to all replicas instead of the data being silently resurrected from a stale replica during read repair."
answers:
  - "tombstone"
  - "tombstones"
  - "tomb stone"
  - "tombstones marker"
explanation: "A tombstone is a deletion marker written instead of physically removing data, ensuring that the delete propagates to all replicas during eventual consistency and preventing stale replicas from resurrecting the deleted key during read repair."
difficulty: 3

### Q5
type: select-all
stem: "Which of the following mechanisms help reduce or repair replica divergence in a Dynamo/Cassandra-style key-value store?"
options:
  - A: Read repair
  - B: Hinted handoff
  - C: Anti-entropy using Merkle trees
  - D: Bloom filters
  - E: Size-tiered compaction
correct:
  - A
  - B
  - C
explanation: "Read repair fixes stale replicas on the read path, hinted handoff delivers missed writes when a replica comes back online, and anti-entropy with Merkle trees detects and repairs divergence in the background. Bloom filters reduce read latency but do not repair divergence. Compaction reclaims disk space and merges SSTables but is not a replica synchronization mechanism."
difficulty: 3

### Q6
type: scenario
stem: "You are designing a Dynamo-style key-value store for a shopping cart service that must remain always-writable even during network partitions. Step 1: Consider what consistency model and conflict-resolution strategy allow writes to succeed on any available replica. Step 2: Determine how the system will detect and reconcile conflicting versions when partitions heal. Which design choices best satisfy these requirements?"
options:
  - A: Strong consistency with two-phase commit; conflicts are prevented by locking
  - B: Eventual consistency with vector clocks; concurrent versions are stored as siblings and reconciled by the application on read
  - C: Eventual consistency with last-write-wins using synchronized clocks; no siblings are ever stored
  - D: Causal consistency with CRDTs; all operations are commutative and conflicts are mathematically impossible
correct: B
explanation: "Dynamo's design prioritizes availability by allowing writes to any replica (eventual consistency). Vector clocks track causal history so that when partitions heal, the system can detect concurrent (sibling) versions rather than silently overwriting data. The application — which understands the domain (e.g., merging shopping carts) — reconciles siblings on read. Last-write-wins (C) risks data loss from clock skew. CRDTs (D) would work but require the data type to be a CRDT, which the question does not specify. Two-phase commit (A) sacrifices availability."
difficulty: 2
trade_offs: "Always-writable behavior comes at the cost of potential sibling conflicts that the application must resolve; last-write-wins avoids siblings but can silently drop updates; CRDTs eliminate conflicts but constrain data model design and increase storage overhead."

### Q7
type: scenario
stem: "Your key-value store uses LSM trees for storage. After heavy write traffic, read latency has degraded significantly. Step 1: Identify the root cause — why do LSM trees suffer from read amplification? Step 2: Evaluate which combination of mechanisms can restore read performance without sacrificing write throughput. What is the best approach?"
options:
  - A: Switch to a B-tree storage engine to eliminate read amplification entirely
  - B: Add bloom filters to skip SSTables that do not contain the key and use leveled compaction to limit the number of SSTables per level, reducing the number of files checked per read
  - C: Increase the memtable size to 100% of memory so all data stays in RAM
  - D: Disable compaction to avoid CPU overhead and rely solely on bloom filters
correct: B
explanation: "LSM reads must check the memtable and potentially many SSTables across levels, causing read amplification. Bloom filters probabilistically eliminate SSTables that cannot contain the key, and leveled compaction ensures at most one SSTable per key per level, bounding the number of files checked. Switching to B-trees (A) fixes reads but sacrifices write throughput. Disabling compaction (D) causes unbounded SSTable growth, worsening reads over time."
difficulty: 3
trade_offs: "Leveled compaction reduces read amplification but increases write amplification and CPU cost from more frequent merges; size-tiered compaction minimizes write amplification but allows more SSTables per level, increasing read amplification. Bloom filters add memory overhead and can produce false positives."

### Q8
type: scenario
stem: "A replica node in your cluster has been down for 2 hours. During this time, writes to keys it owns were handled by other replicas using hinted handoff. The node comes back online. Step 1: Consider what happens if the hinted handoff window has expired and the hints were dropped. Step 2: Determine which mechanism can still bring the returning replica back to consistency with the rest of the cluster. What is the primary mechanism?"
options:
  - A: Synchronous replication replay from the coordinator
  - B: Anti-entropy process using Merkle trees to detect and repair divergent ranges
  - C: The node performs a full data copy from a seed node
  - D: Vector clocks automatically merge the differences without any background process
correct: B
explanation: "When hinted handoff expires, the downed node misses writes permanently unless a background repair mechanism runs. Anti-entropy using Merkle trees compares hash trees of key ranges between replicas, efficiently identifying divergent ranges and transferring only the missing data. Synchronous replay (A) does not apply retroactively. A full copy (C) works but is extremely wasteful compared to Merkle-tree-based differential repair. Vector clocks (D) only detect conflicts; they do not transfer missing data."
difficulty: 3
trade_offs: "Anti-entropy is thorough but computationally expensive; hinted handoff is lightweight but only works within the hint window; read repair is lazy and only fixes keys that are read. A full node repair is simplest but transfers far more data than necessary."

### Q9
type: scenario
stem: "You are tuning consistency levels for a social media feed stored in a Cassandra-like key-value store with N=3. The feed must tolerate one node failure without losing availability, and users should see their own posts immediately (strong consistency for own writes) but can tolerate slightly stale data from others. Step 1: Determine the minimum W and R values that satisfy W + R > N for general reads and writes. Step 2: Decide whether to use a higher write quorum for the user's own feed and a lower read quorum for others' feeds, or uniform quorums. Which configuration best meets the requirements?"
options:
  - A: W=1, R=1 for all operations — maximum availability with best latency
  - B: W=2, R=2 for all operations — guarantees overlap but adds latency to every request
  - C: W=QUORUM (2) for writes on the user's own feed to ensure durability, R=1 for reading others' feeds for low latency, with the client reading at QUORUM (2) when reading own feed to guarantee seeing own writes
  - D: W=3, R=1 for all operations — writes are fully replicated so any single read succeeds
correct: C
explanation: "Using W=2 for own-feed writes ensures the post is durable on at least two replicas. Reading own feed at R=2 guarantees overlap with the write quorum (2+2>3), so the user sees their own post. Reading others' feeds at R=1 trades freshness for latency, which is acceptable since stale data from others is tolerable. Uniform W=2/R=2 (B) works but adds unnecessary latency to reads of others' feeds. W=1/R=1 (A) fails W+R>N, risking stale reads. W=3 (D) sacrifices write availability if one node is down."
difficulty: 4
trade_offs: "Per-operation consistency tuning optimizes for each use case but increases client complexity and makes behavior harder to reason about; uniform quorums are simpler but may over-provision consistency where it is not needed. Higher write quorums improve durability but increase write latency and reduce write availability; lower read quorums reduce latency but risk stale reads."
