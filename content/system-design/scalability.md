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
