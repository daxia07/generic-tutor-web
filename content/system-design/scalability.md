# Scalability

## Definition
Scalability is the ability of a system to handle increased load by adding resources. Two primary approaches: **vertical scaling** (scaling up — bigger machine) and **horizontal scaling** (scaling out — more machines).

## Key Terms
- **Vertical scaling**: Adding CPU, RAM, or storage to a single server. Simple but has a ceiling.
- **Horizontal scaling**: Adding more servers behind a load balancer. Near-limitless but adds complexity.
- **Elasticity**: Auto-scaling based on demand (e.g., AWS Auto Scaling Groups).
- **Bottleneck**: The component that limits overall system throughput.
- **Throughput**: Requests per second a system can handle.
- **Latency**: Time to complete a single request.

## Why It Matters
Every system design interview starts here. Interviewers want to hear you reason about scale: "How many users? What's the read/write ratio? What's the data size?" These answers drive every downstream decision.

## Interview Questions
1. "You have a web app that's getting 10x more traffic. How do you scale it?"
2. "When would you choose vertical over horizontal scaling?"
3. "What are the challenges of horizontal scaling?"

## Gotchas
- Saying "just add more servers" without addressing stateful components (databases, sessions).
- Forgetting that horizontal scaling requires statelessness or externalized state.
- Not considering cost — vertical scaling hits diminishing returns fast.
- Ignoring that scaling introduces network latency between nodes.

## Questions

### Q1
type: multiple-choice
stem: "Scaling by adding more servers is called ______ scaling."
options:
  - A: Vertical
  - B: Horizontal
  - C: Diagonal
  - D: Linear
correct: B
explanation: "Horizontal scaling adds more machines. Vertical scaling adds more power (CPU/RAM) to an existing machine."
difficulty: 1

### Q2
type: fill-in-blank
stem: "Scaling up by adding more CPU or RAM to a single server is called ______ scaling."
answers:
  - "vertical"
explanation: "Vertical scaling (scaling up) increases a single machine's resources. It has a hard upper limit."
difficulty: 1

### Q3
type: select-all
stem: "Which techniques help achieve horizontal scalability?"
options:
  - A: Load balancing
  - B: Sharding
  - C: Caching
  - D: Adding more RAM to one server
correct:
  - A
  - B
  - C
explanation: "Load balancing, sharding, and caching all distribute load across multiple servers. Adding RAM is vertical scaling."
difficulty: 2

### Q4
type: fill-in-blank
stem: "The component that limits the overall throughput of a system is called a ______."
answers:
  - "bottleneck"
  - "bottlenecks"
explanation: "A bottleneck is the single component that restricts the entire system's performance. Identifying and removing bottlenecks is key to scaling."
difficulty: 2

### Q5
type: select-all
stem: "Which of the following are challenges introduced by horizontal scaling?"
options:
  - A: Distributed session management
  - B: Data consistency across nodes
  - C: Increased hardware cost per server
  - D: Service discovery and routing
correct:
  - A
  - B
  - D
explanation: "Horizontal scaling adds complexity: sessions must be externalized (A), data must be kept consistent across replicas (B), and nodes must find each other (D). Higher per-server cost is a vertical scaling issue, not horizontal."
difficulty: 2

### Q6
type: scenario
stem: "Step 1: Your e-commerce site handles 1,000 RPS with a single database server that is CPU-saturated. Step 2: You add read replicas to offload read traffic (80% of queries). Step 3: Writes now become the bottleneck since all writes still go to the primary. What scaling strategy should you consider next?"
options:
  - A: Add more RAM to the primary (vertical scaling)
  - B: Shard the database to distribute writes across multiple primaries
  - C: Add more read replicas
  - D: Switch to a NoSQL database
correct: B
explanation: "Read replicas solve read bottlenecks but all writes still hit one primary. Sharding distributes writes across multiple database instances, solving the write bottleneck."
trade_offs: "Sharding adds significant operational complexity (cross-shard queries, resharding). Vertical scaling of the primary is simpler but has a hard ceiling. More read replicas don't help writes."
difficulty: 3

### Q7
type: scenario
stem: "Step 1: You manage a batch processing system that runs nightly ETL jobs. Step 2: Data volume doubles every 6 months and jobs now exceed the nightly window. Step 3: You must reduce processing time without changing the job logic. Which approach is most appropriate?"
options:
  - A: Vertical scaling — upgrade the ETL server with more CPU cores
  - B: Horizontal scaling — partition data and run jobs in parallel on multiple workers
  - C: Caching — cache intermediate results between runs
  - D: Switch to streaming — process data in real-time instead of batch
correct: B
explanation: "Partitioning data and processing in parallel across workers is horizontal scaling for batch workloads. It directly reduces wall-clock time proportional to worker count."
trade_offs: "Parallel execution requires data to be partitionable and introduces coordination overhead. Vertical scaling has diminishing returns. Streaming is a fundamental architecture change, not a scaling adjustment."
difficulty: 3

### Q8
type: scenario
stem: "Step 1: A startup launches with a single server running both the web app and database. Step 2: Traffic grows 10x in one month — the server is overloaded. Step 3: The team must decide: upgrade the server (vertical) or add servers (horizontal). What factors should drive this decision?"
options:
  - A: Only current cost — always pick the cheaper option
  - B: Statelessness of the application, expected future growth, and operational maturity
  - C: Only latency requirements — if p99 < 200ms, stay vertical
  - D: Always go horizontal — vertical is never the right choice at scale
correct: B
explanation: "The decision depends on whether the app is stateless (horizontal is easier), how much more growth is expected (horizontal scales further), and whether the team can handle the operational complexity of distributed systems."
trade_offs: "Vertical scaling is simpler and faster to implement but has a ceiling. Horizontal scaling offers near-limitless growth but requires load balancers, externalized state, and monitoring. Early-stage startups may benefit from vertical first, then migrate."
difficulty: 4
