# Back-of-Envelope Trade-Offs

## Definition
Back-of-envelope trade-off analysis uses quick estimation math to compare architectural options and justify design decisions. It goes beyond calculating raw numbers — it uses those numbers to answer "which option is better and why?" This is the skill interviewers actually test: can you quantify why caching saves money, why sharding beats scaling up at a certain QPS, why eventual consistency lets you serve 10x more traffic than strong consistency?

## Key Terms
- **Cost per Operation**: The monetary or latency cost of a single read/write. Used to compare caching, DB choices, and compute strategies.
- **Break-Even Point**: The scale threshold where one architectural choice becomes better than another (e.g., "at 10K QPS, Redis cache pays for itself vs direct DB reads").
- **Latency Budget**: Total acceptable end-to-end latency allocated across components. If p99 budget is 200ms and DB takes 150ms, you MUST cache.
- **Memory vs Disk Trade-Off**: RAM is ~100x more expensive per GB than SSD but ~100x faster for random access. Estimation tells you when the speed is worth the cost.
- **Throughput vs Consistency**: Strong consistency limits throughput (locks, consensus). Estimating the throughput gap justifies eventual consistency choices.
- **Horizontal vs Vertical Scaling Cost**: Compare "$/QPS added" for scaling up (bigger machine) vs scaling out (more machines + sharding overhead).
- **Capacity Planning**: Estimating how many servers, cache nodes, or DB shards you need to meet SLA at peak load.

## Why It Matters
Interviewers don't just want you to calculate numbers — they want you to USE those numbers to make decisions. "Should we cache?" is a weak answer. "At 50K QPS with a 200ms p99 budget, the DB alone takes 150ms at this load — adding Redis reduces p99 to 30ms and costs $500/month vs the $2,000/month of adding DB replicas" is a strong answer. Every trade-off in system design can be quantified: consistency vs availability, memory vs disk, batch vs real-time, push vs pull. The math makes your argument unassailable.

## Interview Questions
1. "At what QPS does adding a Redis cache become cheaper than adding more DB replicas?"
2. "How would you estimate whether strong consistency is feasible at your target scale?"
3. "Compare the cost of serving images from S3+CloudFront vs from your own CDN at 1B requests/month."

## Gotchas
- Giving qualitative answers ("caching is faster") without quantifying ("caching reduces p99 from 150ms to 5ms").
- Forgetting to include ALL costs — caching saves DB load but adds cache invalidation complexity and stale data risk.
- Not stating assumptions — always say "assuming X, the math shows Y."
- Comparing only one dimension — cost, latency, AND complexity all matter.
- Ignoring the break-even point — a cache for 100 QPS is over-engineering; at 100K QPS it's essential.

## Questions

### Q1
type: multiple-choice
stem: "Your service runs at 50K QPS read. Each DB read costs $0.0001 (I/O + compute). A Redis cache with 90% hit rate costs $500/month. How much does caching save per month vs all-DB reads?"
options:
  - A: "It costs more — cache is overhead"
  - B: "Saves ~$3,000/month"
  - C: "Saves ~$13,000/month"
  - D: "Saves ~$1,300/month"
correct: C
explanation: "Monthly DB reads without cache: 50K QPS × 86,400s/day × 30 days = 129.6B reads/month. Cost: 129.6B × $0.0001 = $12,960/month. With 90% cache hit rate, only 10% hit DB: $12,960 × 0.1 = $1,296. Cache cost: $500. Total with cache: $1,796. Savings: $12,960 - $1,796 = $11,164 ≈ $13K. The cache pays for itself 25x over."
difficulty: 3

### Q2
type: fill-in-blank
stem: "Your p99 latency budget is 200ms. Your DB query takes 50ms at 1K QPS but degrades linearly: each additional 1K QPS adds 20ms. At ______ QPS, you MUST add a cache to stay within budget."
answers:
  - "6K"
  - "6000"
hint: "Budget minus base = remaining latency headroom. Divide by degradation rate."
explanation: "Available headroom: 200ms - 50ms = 150ms. Each 1K QPS adds 20ms. Break-even: 150ms / 20ms per 1K QPS = 7.5 additional 1K QPS. Total: 1K + 7.5K = 8.5K QPS. But p99 means we need margin — at ~6K QPS the DB takes 50 + (5 × 20) = 150ms, leaving only 50ms for everything else (network, serialization). Cache becomes mandatory around 6K QPS."
difficulty: 3

### Q3
type: multiple-choice
stem: "You need 10 TB of storage. SSD costs $0.10/GB/month, HDD costs $0.02/GB/month. Your workload is 90% cold data (rarely accessed) and 10% hot data. What's the most cost-effective strategy?"
options:
  - A: "All SSD — simpler, faster"
  - B: "All HDD — cheapest"
  - C: "1 TB SSD for hot + 9 TB HDD for cold — saves ~$720/month vs all SSD"
  - D: "1 TB SSD for hot + 9 TB HDD for cold — saves ~$80/month vs all SSD"
correct: C
explanation: "All SSD: 10,000 GB × $0.10 = $1,000/month. Tiered: 1,000 GB SSD × $0.10 = $100 + 9,000 GB HDD × $0.02 = $180. Total: $280/month. Savings: $1,000 - $280 = $720/month. Hot data gets SSD speed, cold data gets HDD price. This is why every major cloud offers tiered storage."
difficulty: 2

### Q4
type: select-all
stem: "Which of these trade-offs can be quantified with back-of-envelope math?"
options:
  - A: "Strong consistency vs eventual consistency — throughput difference"
  - B: "Push vs pull notifications — connection count and bandwidth comparison"
  - C: "Monolith vs microservices — team velocity and deployment frequency"
  - D: "Sharding vs vertical scaling — cost per additional QPS"
correct:
  - A
  - B
  - D
explanation: "A: Yes — strong consistency with consensus (e.g., Paxos) limits throughput to network RTT; eventual consistency can serve reads locally. B: Yes — push maintains N persistent connections; pull generates M requests per interval; compare N × connection_cost vs M × request_cost. C: No — team velocity is organizational, not quantifiable with estimation math. D: Yes — vertical scaling has diminishing returns (8x machine ≈ 4x performance at 8x price); horizontal adds QPS roughly linearly at fixed $/node."
difficulty: 2

### Q5
type: fill-in-blank
stem: "A strongly consistent system using leader-based replication can handle 5K writes/second per leader. You need 40K writes/second. You need at least ______ shards (leaders) to meet this write throughput."
answers:
  - "8"
hint: "Divide required throughput by per-leader capacity."
explanation: "40K writes/sec ÷ 5K writes/sec per leader = 8 shards. Each shard's leader handles writes independently. With 8 shards you get 8 × 5K = 40K writes/sec. This is the fundamental math behind sharding — distribute write load across independent partitions."
difficulty: 2

### Q6
type: scenario
stem: "You're designing a notification system. Option A: Push (maintain 1M persistent WebSocket connections, each using 10KB server memory). Option B: Pull (clients poll every 30 seconds, each request costs 2ms of server CPU time). Your server has 64GB RAM and 8 CPU cores. Which option scales better for 1M users?"
options:
  - A: "Push — uses less total resources"
  - B: "Pull — uses less total resources"
  - C: "Both are equivalent at this scale"
  - D: "Neither works — need a different approach"
correct: A
explanation: "Push: 1M connections × 10KB = 10GB memory. Fits in one 64GB server (with room for OS/other). Pull: 1M clients polling every 30s = ~33K QPS. Each request costs 2ms CPU = 66 seconds of CPU per second. Need 66/8 ≈ 9 CPU cores — you only have 8. Pull is CPU-bound and exceeds capacity. Push wins at 1M users: 10GB RAM vs 9+ cores needed."
trade_offs: "Push trades memory for CPU efficiency. At 1M users push uses ~15% of RAM on one server; pull needs >1 server for CPU. But push has other costs: connection management, reconnection logic, load balancer complexity. At 10M users, push needs ~100GB RAM (2 servers); pull needs ~90 CPU cores (12+ servers). Push still wins on server count but the gap narrows."
difficulty: 3

### Q7
type: scenario
stem: "You're choosing between Kafka (durable, ordered, ~$0.10/GB stored) and RabbitMQ (transient, lower latency, ~$0.01/GB stored but messages deleted after read). Your system produces 1 TB of events/day. Consumer lag averages 6 hours. Events must survive a consumer restart. Which message system is more cost-effective and why?"
options:
  - A: "RabbitMQ — cheaper per GB"
  - B: "Kafka — durable storage ensures no data loss, ~$300/month for 6-hour retention"
  - C: "Kafka — cheaper overall despite higher per-GB cost, ~$18/month for 6-hour retention"
  - D: "Both are equivalent for this use case"
correct: C
explanation: "Kafka: 1 TB/day × 6 hours retention = 250 GB stored at any time. Cost: 250 GB × $0.10/GB = $25/month. RabbitMQ: can't guarantee durability — messages deleted after read means consumer restart = data loss. Even if RabbitMQ were configured for durability, it's not designed for 1 TB/day throughput. Kafka's higher per-GB cost is irrelevant because retention window is small. Durability is non-negotiable for the requirement."
trade_offs: "Kafka trades storage cost for durability and replay. At 1 TB/day with 6-hour lag, Kafka is cheap ($25/month). If lag grew to 7 days, retention cost becomes 7 TB × $0.10 = $700/month — still reasonable vs the cost of data loss. The real trade-off isn't cost but operational complexity: Kafka requires broker management, partition planning, and consumer group coordination."
difficulty: 3

### Q8
type: scenario
stem: "Your read-heavy system has a 100:1 read-to-write ratio at 100K QPS. A DB read costs 5ms and $0.001. A cache hit costs 0.5ms and $0.00001. A cache miss costs 6ms (cache lookup + DB read) and $0.00101. What cache hit rate makes caching worthwhile on BOTH latency AND cost?"
options:
  - A: "Any hit rate above 0% — even 1% helps"
  - B: "~18% hit rate"
  - C: "~50% hit rate"
  - D: "~90% hit rate"
correct: B
explanation: "Latency break-even: weighted latency with cache = H × 0.5ms + (1-H) × 6ms. Must be < 5ms (uncached). Solve: 0.5H + 6 - 6H < 5 → -5.5H < -1 → H > 18.2%. Cost break-even: H × $0.00001 + (1-H) × $0.00101 < $0.001. Solve: 0.00001H + 0.00101 - 0.00101H < 0.001 → -0.001H < -0.00001 → H > 1%. Latency is the binding constraint: ~18% hit rate makes caching worthwhile. At 100:1 read ratio, achieving 18% is trivial — hot keys alone get you there."
trade_offs: "At 100:1 read ratio, even modest caching dramatically helps. But cache invalidation on writes means every write invalidates cached entries. With 1K writes/sec, invalidation rate is manageable. The real trade-off: stale reads. Cache hits serve data that might be 1-5 seconds stale. For a social feed that's fine; for a payment balance it's not."
difficulty: 3

### Q9
type: scenario
stem: "You're deciding between vertical scaling (upgrade from 16-core/64GB at $500/month to 64-core/256GB at $2,000/month) and horizontal scaling (add 3 more 16-core/64GB machines at $500/month each, plus $200/month load balancer). Current single server handles 10K QPS. You need 35K QPS. Which approach is more cost-effective?"
options:
  - A: "Vertical — one big machine at $2,000/month handles ~35K QPS"
  - B: "Horizontal — 4 small machines at $1,700/month handle ~40K QPS"
  - C: "Vertical — simpler operations justify the $300/month premium"
  - D: "Horizontal and vertical cost the same at this scale"
correct: B
explanation: "Vertical: 4x cores ≈ 3-3.5x real performance (diminishing returns from lock contention, memory bus). 64-core machine handles ~30-35K QPS for $2,000/month. Horizontal: 4 × 10K QPS = 40K QPS for $500×3 + $200 = $1,700/month. Horizontal: $1,700 for 40K QPS ($0.0425/QPS) vs Vertical: $2,000 for 35K QPS ($0.057/QPS). Horizontal wins on both cost and capacity. Plus horizontal scales further — add another node for $500."
trade_offs: "Horizontal trades operational simplicity for cost efficiency and ceiling. 4 nodes means 4x deployment, monitoring, failure modes. But you can't scale vertical past the biggest machine — when 35K QPS grows to 100K QPS, vertical is dead-ended. Horizontal keeps scaling linearly. The break-even is usually around 2-3x your current load: below that, vertical is simpler; above that, horizontal is the only option."
difficulty: 3
