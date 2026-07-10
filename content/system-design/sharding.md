# Sharding (Data Partitioning)

## Definition
Sharding distributes data across multiple database instances (shards) so each shard holds a subset of the data. It's horizontal scaling at the database level — each shard is an independent database that handles a portion of the total workload.

## Key Terms
- **Shard key**: The column used to determine which shard a row belongs to. Critical decision.
- **Range sharding**: Shard by value ranges (e.g., user IDs 1-1M on shard 1, 1M-2M on shard 2).
- **Hash sharding**: Shard by hash of key — uniform distribution but range queries span all shards.
- **Directory sharding**: Lookup table maps keys to shards. Flexible but adds a dependency.
- **Hotspot**: One shard receiving disproportionate traffic (poor shard key choice).
- **Cross-shard query**: Query that needs data from multiple shards — expensive, avoid when possible.
- **Resharding**: Redistributing data when adding/removing shards. Painful — plan for it early.
- **Shard rebalancing**: Moving data between shards to maintain even distribution.

## Why It Matters
When a single database can't handle the write throughput or data volume, sharding is the answer. But it's a one-way door — hard to undo. Interviewers test whether you understand the operational implications.

## Interview Questions
1. "How would you shard a user table with 1 billion rows?"
2. "What shard key would you choose for this system?"
3. "How do you handle cross-shard queries?"

## Gotchas
- Choosing a bad shard key creates hotspots — user_id is often better than country or timestamp.
- Cross-shard joins are expensive — design your data model to minimize them.
- Resharding is a massive operational challenge — consistent hashing helps but doesn't eliminate it.
- Auto-increment IDs break across shards — use UUIDs or Snowflake IDs.
- Transactions across shards are complex — 2PC is slow, saga pattern is eventual consistency.

## Questions

### Q1
type: multiple-choice
stem: "What is the primary challenge when a shard becomes disproportionately large?"
options:
  - A: Network latency
  - B: Hot spot / data skew
  - C: Replication lag
  - D: Cache invalidation
correct: B
explanation: "Data skew creates hot spots where one shard receives far more traffic or data than others."
difficulty: 2

### Q2
type: scenario
stem: "You shard your social media database by user_id. A few power users generate 100x more posts than average, making their shards disproportionately large. What is this problem called and what's the best fix?"
options:
  - A: Hot partition / data skew — use hash-based sharding or composite keys
  - B: Replication lag — add more replicas for hot shards
  - C: Network bottleneck — upgrade shard server bandwidth
  - D: Index fragmentation — rebuild indexes on the hot shard
correct: A
explanation: "Data skew (hot partition) occurs when a sharding key doesn't distribute data evenly. Hash-based sharding spreads load more uniformly. Composite keys (user_id + timestamp) can also distribute time-series data better."
trade_offs: "Hash-based sharding makes range queries harder (can't scan all of one user's data in one shard). Range-based sharding keeps data together but risks hot spots."
difficulty: 3

### Q3
type: multiple-choice
stem: "Which sharding key strategy makes it easiest to add new shards without rehashing all data?"
options:
  - A: Hash-based
  - B: Range-based
  - C: Directory-based
  - D: Random
correct: C
explanation: "Directory-based sharding uses a lookup table, making it easy to add shards by updating the mapping. Hash-based requires rehashing."
difficulty: 3
