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
