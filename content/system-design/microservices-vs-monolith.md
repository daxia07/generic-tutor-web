# Microservices vs Monolith

## Definition
A **monolith** is a single deployable unit containing all application logic. **Microservices** decompose the application into small, independently deployable services, each owning its data and business logic. The choice is a trade-off between simplicity and scalability.

## Key Terms
- **Service boundary**: How you draw the lines between services (by domain, by team, by data).
- **Service mesh**: Infrastructure layer for service-to-service communication (Istio, Linkerd).
- **API Gateway**: Single entry point that routes requests to appropriate microservices.
- **Service discovery**: How services find each other (Consul, Eureka, DNS-based).
- **Distributed tracing**: Tracking requests across services (Jaeger, Zipkin, OpenTelemetry).
- **Domain-Driven Design (DDD)**: Methodology for defining service boundaries around business domains.
- **Bounded context**: A clear boundary where a particular domain model applies.
- **Strangler fig pattern**: Incrementally migrating from monolith to microservices.
- **CQRS**: Separate read and write models — common in microservice architectures.
- **Shared database vs database-per-service**: Microservices should own their data.

## Why It Matters
This is one of the most debated topics in software architecture. Interviewers want to hear nuanced reasoning — not "microservices are always better." The right choice depends on team size, complexity, and organizational maturity.

## Interview Questions
1. "When would you choose microservices over a monolith?"
2. "How would you decompose this monolith into microservices?"
3. "What are the challenges of microservices?"

## Gotchas
- "Microservices are more scalable" — true, but a well-designed monolith can scale surprisingly far.
- Microservices add massive operational complexity: deployment, monitoring, debugging, networking.
- Distributed transactions are hard — sagas, eventual consistency, compensating transactions.
- Start with a monolith, split when you have a clear need and organizational maturity.
- "Nano-services" (too fine-grained) are worse than a monolith — network overhead dominates.

## Questions

### Q1
type: multiple-choice
stem: "What is a key advantage of microservices over a monolith?"
options:
  - A: Simpler deployment
  - B: Independent scaling
  - C: Fewer network calls
  - D: Easier debugging
correct: B
explanation: "Microservices allow independent scaling of components. However, they add deployment complexity, network overhead, and debugging challenges."
difficulty: 1

### Q2
type: select-all
stem: "Which are challenges of microservices architecture?"
options:
  - A: Distributed tracing
  - B: Network latency
  - C: Data consistency
  - D: Service discovery
correct:
  - A
  - B
  - C
  - D
explanation: "All four are microservice challenges: tracing across services, network overhead, eventual consistency, and dynamic service discovery."
difficulty: 2

### Q3
type: fill-in-blank
stem: "The ______ pattern breaks down a monolith by gradually extracting services one at a time."
answers:
  - "strangler fig"
  - "strangler"
explanation: "The Strangler Fig pattern incrementally replaces monolith functionality with microservices."
difficulty: 3
