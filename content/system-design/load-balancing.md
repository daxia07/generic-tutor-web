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
type: fill-in-blank
stem: "A ______ check determines if a backend server is healthy enough to receive traffic."
answers:
  - "health"
  - "health check"
explanation: "Health checks (active or passive) determine if a server should remain in the load balancer's pool."
difficulty: 1
