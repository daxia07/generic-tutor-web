# Load Balancing

## Definition
A load balancer distributes incoming network traffic across multiple backend servers to ensure no single server is overwhelmed. It sits between clients and servers, routing requests based on various algorithms.

## Key Terms
- **Round-robin**: Requests distributed sequentially (1, 2, 3, 1, 2, 3...).
- **Weighted round-robin**: More powerful servers get proportionally more requests.
- **Least connections**: Route to the server with fewest active connections.
- **IP hash**: Route based on client IP — ensures same client hits same server (sticky sessions).
- **Health checks**: Periodic probes to detect and remove unhealthy servers from the pool.
- **Layer 4 vs Layer 7**: L4 routes based on IP/port (fast), L7 routes based on content (flexible).
- **Sticky session**: Binding a client to one server for the duration of a session.
- **Reverse proxy**: Load balancer that sits in front of servers (vs forward proxy in front of clients).

## Why It Matters
Load balancers are the entry point of any scalable architecture. They enable horizontal scaling, high availability, and zero-downtime deployments. Every system design diagram includes one.

## Interview Questions
1. "How would you distribute traffic across 10 servers?"
2. "What happens when a server goes down behind a load balancer?"
3. "How do you handle sticky sessions with horizontal scaling?"

## Gotchas
- Forgetting health checks — without them, traffic goes to dead servers.
- Sticky sessions break horizontal scaling benefits — externalize session state instead.
- Single load balancer is a single point of failure — need redundancy (active-passive or active-active).
- Not considering that L7 load balancing adds latency vs L4.

## Questions

### Q1
type: multiple-choice
stem: "Which load balancing algorithm sends requests to the server with the fewest active connections?"
options:
  - A: Round-robin
  - B: Least connections
  - C: IP hash
  - D: Random
correct: B
explanation: "Least connections tracks active connections per server and routes to the least busy one."
difficulty: 1

### Q2
type: select-all
stem: "Which are Layer 7 (application layer) load balancing features?"
options:
  - A: URL-based routing
  - B: SSL termination
  - C: IP-based routing
  - D: Header-based routing
correct:
  - A
  - D
explanation: "Layer 7 can route based on URL paths and HTTP headers. IP-based routing is Layer 4. SSL termination can happen at either layer."
difficulty: 3

### Q3
type: scenario
stem: "Your load balancer continues sending traffic to a backend server that crashed 30 seconds ago. Users see 502 errors. What mechanism should have prevented this?"
options:
  - A: Round-robin rotation to skip the crashed server
  - B: Active health checks — periodically probe backends and remove unhealthy ones from the pool
  - C: Increasing the number of backend servers
  - D: Client-side retry logic
correct: B
explanation: "Health checks (HTTP, TCP, or custom) periodically verify backend availability. When a check fails N consecutive times, the load balancer removes that backend from the rotation. Active checks catch failures faster than passive detection."
trade_offs: "Health check intervals create a detection gap (crash to removal). Too frequent = overhead. Too slow = user-facing errors. Typical interval: 5-10s with 2-3 failure threshold."
difficulty: 1

### Q4
type: fill-in-blank
stem: "A load balancing algorithm that routes requests to the same backend server based on the client's IP address is called ______ hash."
answers:
  - "IP"
  - "ip"
  - "source IP"
  - "source ip"
explanation: "IP hash (also called source IP hash) maps a client's IP address to a specific backend server using a hash function. This provides session affinity (sticky sessions) without requiring cookies or application-level session tracking."
difficulty: 2

### Q5
type: select-all
stem: "Which of the following are reasons to use Layer 7 load balancing instead of Layer 4?"
options:
  - A: You need to route requests based on URL path (e.g., /api/* vs /web/*)
  - B: You need to perform SSL/TLS termination
  - C: You need the lowest possible latency with minimal overhead
  - D: You need to route based on HTTP headers or cookies
correct:
  - A
  - D
explanation: "Layer 7 (application layer) can inspect HTTP content: URLs, headers, cookies for routing decisions. SSL termination (B) can be done at both L4 and L7. If lowest latency is the priority (C), L4 is preferred because it doesn't parse application-layer content."
difficulty: 2

### Q6
type: scenario
stem: "Step 1: Your web application stores user session data in memory on each application server. Step 2: You add a load balancer with round-robin routing. Step 3: Users report being logged out randomly — their session data is on a different server than where the load balancer sent their next request. Step 4: You consider using IP hash to fix this. What is a better long-term solution?"
options:
  - A: Use IP hash for sticky sessions — it solves the problem permanently
  - B: Externalize session state to a shared store (e.g., Redis, database) so any server can serve any user's request
  - C: Add more application servers to reduce the chance of hitting a different server
  - D: Use a single application server with no load balancer
correct: B
explanation: "IP hash / sticky sessions is a workaround, not a long-term solution — it breaks if a server goes down (those users lose sessions) and impedes even load distribution. Externalizing session state to Redis or a shared store makes any server stateless, allowing true horizontal scaling and seamless failover."
trade_offs: "External session stores add latency (network round-trip per request) and a new dependency (Redis must be highly available). However, this is the standard pattern for horizontally scaled web applications. Sticky sessions are acceptable for simple deployments but break down during failures or scaling events."
difficulty: 3

### Q7
type: scenario
stem: "Step 1: Your infrastructure uses a single load balancer as the entry point for all traffic. Step 2: The load balancer itself fails, and all services become unreachable despite backend servers being healthy. Step 3: You need to prevent this single point of failure. How should you design the load balancer topology?"
options:
  - A: Add a second load balancer in active-passive mode with a virtual IP (VIP) that fails over if the primary dies
  - B: Add a second load balancer in active-active mode using DNS round-robin or Anycast to distribute traffic across both
  - C: Replace the load balancer with a DNS-based routing solution
  - D: Both A and B are valid approaches depending on requirements
correct: D
explanation: "Active-passive (A) uses a VIP with failover — simple but wastes the standby's capacity. Active-active (B) uses both LBs simultaneously — more efficient but requires state synchronization for sticky sessions. DNS-based routing (C) alone has slow failover due to TTL caching. Both A and B are industry-standard approaches chosen based on cost, complexity, and performance needs."
trade_offs: "Active-passive: simpler, but the standby LB sits idle. Active-active: better resource utilization, but requires state sharing (connection tracking, session persistence) between LBs, adding complexity. Anycast-based active-active is used by cloud providers (AWS ALB, Cloudflare) for global load balancing."
difficulty: 3

### Q8
type: scenario
stem: "Step 1: Your load balancer routes traffic to 5 backend servers using weighted round-robin (weights: 5, 3, 1, 1, 1). Step 2: Server A (weight 5) is significantly more powerful than the others. Step 3: A deployment pushes a memory-intensive version to all servers simultaneously. Step 4: Server A runs out of memory and starts responding slowly (5s response time), but it still passes health checks because the health endpoint is lightweight. What problem does this reveal and how do you fix it?"
options:
  - A: The weighted round-robin algorithm is incorrect — switch to least connections
  - B: Health checks are too simplistic — use deep health checks that verify actual application functionality (e.g., query a database, check memory usage), and switch to least connections to drain traffic from overloaded servers
  - C: Remove Server A from the pool permanently
  - D: Increase Server A's memory capacity
correct: B
explanation: "Shallow health checks (HTTP 200 on /health) don't reflect real application health — a server can be alive but degraded. Deep health checks verify dependencies and resource usage. Switching to least connections (or least latency) helps because the algorithm detects that Server A has many long-lived connections and routes new traffic elsewhere, even if the health check passes."
trade_offs: "Deep health checks are more expensive and slower, potentially increasing detection time for true hard failures. A hybrid approach is common: fast shallow checks for hard failures plus circuit breakers / outlier detection for degraded performance. Least connections requires the LB to track connection state, which adds memory overhead."
difficulty: 4
