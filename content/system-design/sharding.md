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

### Q4
type: fill-in-blank
stem: "A query that requires data from multiple shards is called a ______ query."
answers:
  - "cross-shard"
  - "cross shard"
  - "cross-shard query"
explanation: "Cross-shard queries span multiple shards and are expensive because they require fan-out queries to all relevant shards and merging results."
difficulty: 2

### Q5
type: select-all
stem: "Which of the following are valid strategies for resharding with minimal downtime?"
options:
  - A: Consistent hashing with virtual nodes
  - B: Dual-write to old and new shard layouts simultaneously
  - C: Stop all writes, migrate data, then resume
  - D: Background data migration with traffic gradually shifted
correct:
  - A
  - B
  - D
explanation: "Consistent hashing minimizes data movement (A). Dual-writing keeps both layouts in sync during migration (B). Gradual traffic shifting allows validation before cutover (D). A full stop (C) causes unacceptable downtime in production systems."
difficulty: 3

### Q6
type: scenario
stem: "Step 1: You are designing a messaging app where each user has a message store. Step 2: You choose user_id as the shard key. Step 3: Celebrity users receive millions of messages while most users receive few. What problem does this create and how should you address it?"
options:
  - A: Cross-shard joins — use directory sharding to colocate celebrity data
  - B: Hot partition / data skew — shard celebrities separately or use a composite key like (user_id, bucket)
  - C: Replication lag — add more read replicas for celebrity shards
  - D: No problem — hash-based sharding on user_id distributes evenly
correct: B
explanation: "Celebrity users create hot partitions when sharding by user_id because their message volume is orders of magnitude higher. Composite keys (user_id + bucket) or dedicated celebrity shards distribute the load."
trade_offs: "Composite keys make retrieving all messages for one user require cross-bucket queries. Dedicated celebrity shards add operational complexity and require a mechanism to identify and migrate hot users."
difficulty: 3

### Q7
type: scenario
stem: "Step 1: Your e-commerce platform shards orders by order_id using hash sharding. Step 2: The analytics team needs to run reports like 'total sales per month' which scan all orders. Step 3: These cross-shard queries are too slow. What architecture change would best solve this?"
options:
  - A: Add more shards to reduce per-shard scan time
  - B: Use CQRS — maintain a separate read-optimized replica aggregated by date
  - C: Switch to range sharding on created_at
  - D: Cache all query results in Redis
correct: B
explanation: "CQRS separates the write model (sharded by order_id) from a read model optimized for analytics (partitioned or indexed by date). This avoids cross-shard queries entirely for reporting."
trade_offs: "CQRS adds eventual consistency between write and read models. Range sharding on date would help analytics but creates hot partitions for recent orders and hurts per-customer lookups. Caching doesn't solve the fundamental scan problem."
difficulty: 4

### Q8
type: scenario
stem: "Step 1: You shard a multi-tenant SaaS application by tenant_id. Step 2: A new enterprise customer onboards who needs 10x the storage of typical tenants. Step 3: Placing this tenant on any single shard would exceed that shard's capacity. What is the best approach?"
options:
  - A: Refuse the customer — the system cannot handle them
  - B: Vertically scale all shards to accommodate the large tenant
  - C: Allow the large tenant to span multiple shards using a tenant-aware routing layer
  - D: Move the large tenant to a dedicated unsharded database
correct: C
explanation: "A tenant-aware routing layer can map one tenant's data across multiple shards (e.g., shard key = tenant_id + sub_key). This preserves the sharding architecture while accommodating oversized tenants."
trade_offs: "Multi-shard tenants add routing complexity and cross-shard queries within one tenant. A dedicated database (D) avoids this but loses shared infrastructure benefits. Vertically scaling all shards (B) is wasteful for other tenants."
difficulty: 4
