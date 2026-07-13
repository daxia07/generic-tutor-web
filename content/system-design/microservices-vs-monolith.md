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
type: scenario
stem: "Your company has a 5-year-old monolith that's too risky to rewrite from scratch. How do you migrate to microservices incrementally?"
options:
  - A: Stop the monolith, rebuild each service, then switch all traffic at once
  - B: Extract one service at a time using the Strangler Fig pattern, routing traffic gradually
  - C: Keep the monolith forever and build new features as separate microservices alongside it
  - D: Create a microservices mesh and proxy all monolith calls through it
correct: B
explanation: "The Strangler Fig pattern incrementally replaces monolith functionality: route one API endpoint to a new microservice, verify it works, then move to the next. Zero big-bang risk."
trade_offs: "Running monolith + microservices simultaneously adds operational complexity. You need an API gateway to route traffic correctly during the transition period."
difficulty: 3

### Q4
type: fill-in-blank
stem: "In Domain-Driven Design, a ______ context defines the boundary where a particular domain model and its ubiquitous language apply consistently."
answers:
  - "bounded"
  - "bounded context"
explanation: "A bounded context is a central pattern in DDD — it defines the boundary within which a model has a single, unambiguous meaning. Service boundaries should align with bounded contexts."
difficulty: 2

### Q5
type: select-all
stem: "Which patterns and tools help manage cross-cutting concerns in a microservices architecture?"
options:
  - A: Service mesh (e.g., Istio)
  - B: API Gateway
  - C: Distributed tracing (e.g., Jaeger)
  - D: Shared database across all services
correct:
  - A
  - B
  - C
explanation: "Service mesh handles inter-service communication, API Gateway provides a unified entry point, and distributed tracing tracks requests across services. A shared database violates the database-per-service principle."
difficulty: 2

### Q6
type: scenario
stem: "Step 1: Your e-commerce monolith has a single Orders table that both the fulfillment and billing teams modify. Step 2: You want to split into Order-Fulfillment and Billing microservices. Step 3: Both services need order data but with different fields and different consistency requirements. Which approach do you take?"
options:
  - A: Both services share the same Orders database table but use different ORM models
  - B: Use the Strangler Fig pattern with a shared database until you can separate the data
  - C: Each service owns its own data store; use events to synchronize relevant order data between services
  - D: Create a third Order-Query service that both services call for order data
correct: C
explanation: "Database-per-service is a core microservices principle. Each service owns its data and publishes events (e.g., OrderPlaced) so other services can maintain their own projections. This avoids tight coupling through shared databases."
trade_offs: "Event-based synchronization introduces eventual consistency — Billing's view of an order may lag behind Fulfillment's. You also need infrastructure for event delivery and schema evolution, adding operational complexity."
difficulty: 3

### Q7
type: scenario
stem: "Step 1: A startup with 3 engineers is building an MVP marketplace. Step 2: A senior architect insists on using microservices from day one for scalability. Step 3: The team has no DevOps experience and needs to ship within 2 months. What do you recommend?"
options:
  - A: Start with microservices — it's easier to build them correctly from the start than to migrate later
  - B: Build a well-modularized monolith — the team can ship fast, and clean module boundaries make future extraction easier
  - C: Build a monolith with no internal structure — refactor later when the team grows
  - D: Use serverless functions for each endpoint to get microservice benefits without DevOps overhead
correct: B
explanation: "A well-modularized monolith lets a small team ship quickly while keeping clean boundaries that map to future service seams. Premature microservices would slow the team with operational overhead they can't yet support."
trade_offs: "A monolith requires discipline to maintain module boundaries — without it, the codebase can become a big ball of mud. The team must treat internal modules as if they were services (separate packages, defined interfaces) even within one deployable unit."
difficulty: 4

### Q8
type: scenario
stem: "Step 1: In your microservices system, Service A calls Service B which calls Service C to complete a business transaction. Step 2: Service C fails after Service B has already committed its local changes. Step 3: You need to roll back the entire operation. Which pattern do you implement?"
options:
  - A: Two-phase commit (2PC) across all three services
  - B: Saga pattern with compensating transactions to undo Service B's changes
  - C: Retry Service C indefinitely until it succeeds
  - D: Mark Service B's data as pending and run a cron job to reconcile
correct: B
explanation: "The Saga pattern orchestrates a sequence of local transactions, each with a compensating action. If Service C fails, the saga triggers Service B's compensating transaction to undo its changes, maintaining consistency without distributed locks."
trade_offs: "Sagas provide eventual consistency, not atomic transactions — intermediate states are visible. Compensating transactions must be idempotent and may not perfectly reverse the original operation (e.g., a refund vs a void). 2PC is avoided because it holds locks across services, creating tight coupling and availability risks."
difficulty: 4
