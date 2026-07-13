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
type: scenario
stem: "Your financial compliance team requires a complete, immutable audit trail of every state change in the order processing system. Which pattern provides this?"
options:
  - A: Command Query Responsibility Segregation (CQRS)
  - B: Event Sourcing — store every state change as an immutable event
  - C: Change Data Capture (CDC) — log database changes
  - D: Write-ahead logging (WAL)
correct: B
explanation: "Event Sourcing persists every domain event (OrderCreated, PaymentReceived, OrderShipped) as the source of truth. Current state is derived by replaying events. This gives a full, immutable audit trail."
trade_offs: "Event Sourcing adds complexity: event schema evolution, snapshotting for performance, and eventual consistency between write and read models. Use it only when audit trails are genuinely required."
difficulty: 2

### Q4
type: fill-in-blank
stem: "The property where processing the same event multiple times produces the same result is called ______."
answers:
  - "idempotency"
  - "idempotence"
explanation: "Idempotency ensures that duplicate event delivery (common in at-least-once systems) does not cause incorrect state. Consumers must be designed so that reprocessing an event is safe."
difficulty: 2

### Q5
type: select-all
stem: "Which of the following are challenges specific to event-driven architecture compared to synchronous request-response?"
options:
  - A: Eventual consistency — consumers may see stale state temporarily
  - B: Debugging distributed event flows across multiple services
  - C: Event schema evolution — changing event formats without breaking consumers
  - D: Higher latency for individual request-response cycles
correct:
  - A
  - B
  - C
explanation: "Event-driven systems trade immediate consistency for eventual consistency, make debugging harder (no single call stack), and require careful schema versioning. Higher per-request latency (D) is not a challenge — event-driven systems are often lower latency for the producer since it doesn't wait for the consumer."
difficulty: 3

### Q6
type: scenario
stem: "Step 1: Your e-commerce system uses choreography for order processing: OrderService emits OrderPlaced, InventoryService reacts and emits InventoryReserved, PaymentService reacts and emits PaymentCompleted. Step 2: PaymentService fails and emits PaymentFailed. Step 3: InventoryService needs to release the reserved items. Step 4: You discover it is difficult to trace which step failed and trigger the correct compensating action. What pattern would better address this?"
options:
  - A: Add more events to handle each failure case in choreography
  - B: Switch to orchestration — a saga orchestrator centrally manages the workflow, tracks each step's status, and triggers compensating transactions explicitly
  - C: Replace events with synchronous API calls between all services
  - D: Use a single monolithic database transaction across all services
correct: B
explanation: "Choreography becomes difficult to manage as the number of services and failure paths grows. An orchestrator provides a central view of the saga state, knows which steps completed, and can trigger the correct compensating actions in reverse order. This is the orchestration variant of the saga pattern."
trade_offs: "The orchestrator becomes an additional service that must be highly available (single point of coordination, not failure if made redundant). Choreography remains simpler for small, stable workflows. Choose orchestration when workflows are complex or frequently changing."
difficulty: 3

### Q7
type: scenario
stem: "Step 1: Your event consumer processes PaymentCompleted events and updates the order status in a database. Step 2: The broker guarantees at-least-once delivery. Step 3: A network timeout causes the consumer to process the same event twice, resulting in a duplicate shipment. Step 4: You need to prevent this. What is the most effective approach?"
options:
  - A: Switch to a broker with exactly-once delivery guarantees
  - B: Make the consumer idempotent — use the event ID as a deduplication key and check if the event has already been processed before applying the state change
  - C: Reduce the network timeout duration
  - D: Process events in larger batches to reduce the chance of duplicates
correct: B
explanation: "At-least-once delivery means duplicates are possible. The standard solution is idempotent consumers: store processed event IDs and check before applying changes. This makes duplicate delivery harmless. Exactly-once delivery (A) is extremely difficult to achieve end-to-end and most systems still require idempotent consumers as a safety net."
trade_offs: "Storing processed event IDs adds storage overhead and a lookup on every event. You need a retention policy (expire old IDs) or use a compacted topic. Alternatively, make the operation naturally idempotent (e.g., SET status = 'shipped' rather than INCREMENT shipment_count) so duplicates have no harmful effect."
difficulty: 3

### Q8
type: scenario
stem: "Step 1: Your team built an event-driven system where OrderService publishes events to Kafka. Step 2: A new consumer team wants to subscribe to OrderPlaced events but needs the event to include customer email, which the current schema does not contain. Step 3: You add the email field to the OrderPlaced event. Step 4: An older consumer crashes because it does not expect the new field. How should you have handled this schema change?"
options:
  - A: Force all consumers to update simultaneously — deploy everything at once
  - B: Use schema evolution best practices: make new fields optional, use a schema registry for compatibility checking, and follow forward/backward compatibility rules
  - C: Remove the old consumer and rebuild it from scratch
  - D: Create a completely new topic for the enriched event and migrate consumers gradually
correct: B
explanation: "Schema registries (e.g., Confluent Schema Registry) enforce compatibility rules. Making new fields optional preserves backward compatibility (new consumers can read old events) and forward compatibility (old consumers can read new events by ignoring unknown fields). Protobuf and Avro natively support schema evolution with these rules."
trade_offs: "Schema evolution adds governance overhead: all changes must be reviewed for compatibility. In some cases, a breaking change is unavoidable and a new topic/event type (D) is the correct approach. The trade-off is migration complexity vs. schema flexibility."
difficulty: 4
