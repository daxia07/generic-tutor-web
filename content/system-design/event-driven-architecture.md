# Event-Driven Architecture

## Definition
An architecture where services communicate by producing and consuming events rather than direct API calls. An event represents a state change (e.g., "order placed") that other services can react to asynchronously. This decouples producers from consumers and enables flexible, scalable systems.

## Key Terms
- **Event**: An immutable record of something that happened (past tense: "order_placed").
- **Event producer**: Service that emits events when state changes.
- **Event consumer**: Service that reacts to events (may be multiple consumers per event).
- **Event broker**: Middleware that routes events (Kafka, RabbitMQ, AWS EventBridge).
- **Event sourcing**: Storing all state changes as a sequence of events rather than current state.
- **Saga pattern**: Sequence of local transactions coordinated via events for distributed workflows.
- **Choreography**: Each service reacts to events independently — decentralized coordination.
- **Orchestration**: A central coordinator (saga orchestrator) manages the workflow sequence.
- **Eventual consistency**: System reaches consistent state over time, not immediately.
- **Idempotency**: Processing the same event multiple times has the same effect.

## Why It Matters
Event-driven architecture is the foundation of modern microservice systems. It enables loose coupling, scalability, and auditability. Interviewers test whether you understand when events are appropriate vs direct API calls.

## Interview Questions
1. "How would you handle a multi-step order process across services?"
2. "When would you use events vs synchronous API calls?"
3. "Explain the saga pattern — choreography vs orchestration."

## Gotchas
- Events add complexity: eventual consistency, debugging across services, event schema evolution.
- Choreography is simpler but harder to debug — no central view of the workflow.
- Orchestration is clearer but adds a single point of failure/coordination.
- Event schema changes (versioning) are a real operational challenge — plan for it.
- Don't use events for operations that need immediate consistency — use direct API calls.

## Questions

### Q1
type: multiple-choice
stem: "In event-driven architecture, what is an event?"
options:
  - A: A database query
  - B: A significant change in state that has occurred
  - C: An API call
  - D: A log entry
correct: B
explanation: "An event represents something that happened (a state change). Consumers react to events asynchronously."
difficulty: 1

### Q2
type: select-all
stem: "Which are common event routing patterns?"
options:
  - A: Event notification
  - B: Event-carried state transfer
  - C: Event sourcing
  - D: CQRS
correct:
  - A
  - B
  - C
explanation: "Event notification, event-carried state transfer, and event sourcing are event routing patterns. CQRS is a related but separate pattern."
difficulty: 3

### Q3
type: fill-in-blank
stem: "The pattern where all changes to application state are stored as a sequence of events is called event ______."
answers:
  - "sourcing"
explanation: "Event sourcing persists all state changes as immutable events, enabling complete state reconstruction."
difficulty: 2
