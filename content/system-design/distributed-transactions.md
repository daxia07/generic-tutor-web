# Distributed Transactions

## Definition
A distributed transaction is a transaction that spans multiple independent services or databases, requiring coordination to ensure all participants either commit or rollback together, preserving atomicity and consistency across system boundaries without relying on a single shared storage engine.

## Key Terms
- **2PC (Two-Phase Commit)**: A coordination protocol where a coordinator first asks all participants to prepare (vote), then either commits or aborts based on unanimous votes.
- **3PC (Three-Phase Commit)**: An extension of 2PC that adds a pre-commit phase to reduce blocking when the coordinator crashes.
- **Saga Pattern**: A sequence of local transactions where each step publishes an event or command to trigger the next, with compensating transactions to undo prior steps on failure.
- **Choreography-Based Saga**: Decentralized saga execution where each service listens for events and acts independently without a central coordinator.
- **Orchestration-Based Saga**: A central orchestrator directs each step of the saga, telling participants which operation to execute next.
- **Compensating Transaction**: A semantically reversed operation that undoes the effects of a previously committed local transaction when the overall saga cannot complete.
- **Outbox Pattern**: A technique where events are written to the same database as the business data (in an outbox table), then a relay process publishes them, ensuring atomicity between state changes and event publishing.
- **Exactly-Once Semantics**: A message processing guarantee that each message is processed one and only one time, avoiding both duplicates and losses.
- **Idempotency**: The property where performing the same operation multiple times yields the same result as performing it once, critical for safe retries in distributed systems.
- **Temporal Workflow Engine**: A durable execution framework that manages long-running transactions and sagas with automatic retries, timeouts, and state persistence (e.g., Temporal, Cadence).
- **CAP Theorem**: The principle that a distributed system can provide at most two of three guarantees: Consistency, Availability, and Partition tolerance, forcing trade-offs in transaction design.

## Why It Matters
Distributed transactions are central to building reliable microservice architectures where business operations span multiple services. Naive approaches—such as naive event-driven chains without compensation—lead to inconsistent states, orphaned data, and silent failures that are extremely difficult to debug in production. Understanding the trade-offs between consistency (2PC), availability (Saga), and operational complexity (orchestration vs choreography) is essential for making sound architectural decisions.

Interview candidates who can articulate why 2PC is rarely used in microservices, how the outbox pattern solves the dual-write problem, and when a temporal workflow engine is preferable to hand-rolled sagas demonstrate real-world systems thinking rather than textbook knowledge.

## Interview Questions
1. "What is the blocking problem in Two-Phase Commit and how does Three-Phase Commit attempt to address it?"
2. "When would you choose choreography over orchestration for a Saga, and what are the operational trade-offs?"
3. "How does the outbox pattern ensure atomicity between a database write and event publishing?"
4. "Why is idempotency critical for achieving exactly-once semantics in distributed systems?"
5. "What are the implications of the CAP theorem for choosing a distributed transaction strategy?"

## Gotchas
- Assuming 2PC works well across microservices—it creates tight coupling and single points of failure that defeat the purpose of decomposition.
- Forgetting that compensating transactions are semantic rollbacks, not physical rollbacks; they may not perfectly restore prior state (e.g., refunding a payment does not undo the fact that the payment was made).
- Implementing sagas without idempotency, leading to duplicate side effects when messages are retried.
- Dual-writing to a database and a message broker without the outbox pattern, risking inconsistency if one write fails.
- Assuming exactly-once semantics can be achieved with a single mechanism; in practice it requires at-least-once delivery plus idempotent consumers.

## Questions

### Q1
type: multiple-choice
stem: "In Two-Phase Commit, what happens if the coordinator crashes after all participants have voted 'prepared' but before sending the commit decision?"
options:
  - A: All participants automatically abort after a timeout
  - B: All participants remain blocked, holding locks until the coordinator recovers
  - C: Participants query each other and decide to commit by majority vote
  - D: Participants roll back safely using the pre-commit phase
correct: B
explanation: "This is the fundamental blocking problem of 2PC. Participants that voted 'prepared' have promised to commit and cannot unilaterally abort; they must hold locks and wait for the coordinator to recover and send its decision."
difficulty: 1

### Q2
type: multiple-choice
stem: "Which pattern guarantees that a domain event is published if and only if the corresponding database transaction commits, without distributed locking?"
options:
  - A: Two-Phase Commit between the database and message broker
  - B: Saga with compensating transactions
  - C: Transactional outbox pattern
  - D: Three-Phase Commit
correct: C
explanation: "The outbox pattern writes the event to an outbox table in the same database transaction as the business data, then a separate relay process reads and publishes the events. This ensures atomicity without requiring distributed locking or 2PC across systems."
difficulty: 2

### Q3
type: fill-in-blank
stem: "The Saga pattern that uses a central coordinator to direct each step is called ______-based saga."
answers:
  - "orchestration"
  - "orchestration-based"
  - "orchestrated"
difficulty: 1
explanation: "In orchestration-based sagas, a central orchestrator component decides which participant should execute which operation and handles compensation logic, as opposed to choreography where each service reacts to events independently."

### Q4
type: fill-in-blank
stem: "A ______ transaction is a semantically reversed operation that undoes the visible effects of a previously committed local transaction in a saga."
answers:
  - "compensating"
  - "compensation"
  - "compensate"
difficulty: 3
explanation: "Compensating transactions provide semantic rollback in sagas. Unlike physical rollbacks in ACID transactions, they apply a forward operation that logically undoes the effect—for example, issuing a refund instead of deleting a payment record."

### Q5
type: select-all
stem: "Which of the following are valid strategies for achieving exactly-once processing semantics in a distributed system?"
options:
  - A: At-least-once delivery combined with idempotent consumers
  - B: Distributed locks on every message before processing
  - C: Exactly-once delivery supported natively by certain message brokers (e.g., Kafka with transactional consumers)
  - D: Writing a unique request ID to a deduplication table within the same transaction as the business logic
  - E: Retrying failed messages without any deduplication
correct:
  - A
  - C
  - D
difficulty: 3
explanation: "Exactly-once is typically achieved through at-least-once plus idempotent consumers (A), broker-native transactional delivery (C), or deduplication via a shared request ID stored atomically with business data (D). Distributed locks on every message (B) are impractical at scale, and retrying without deduplication (E) leads to duplicate processing."

### Q6
type: scenario
stem: "You are designing an e-commerce order system spanning three services: Order, Payment, and Inventory. Step 1: Consider that Payment and Inventory must both succeed for an order to be valid. Step 2: The system must remain available even if the Payment service is temporarily slow. Which Saga approach do you choose and how do you handle the case where Payment succeeds but Inventory fails to reserve stock?"
explanation: "Use an orchestration-based saga where the orchestrator calls Payment first, then Inventory. If Payment succeeds but Inventory fails, the orchestrator triggers a compensating transaction (refund) on Payment. The orchestrator should be fault-tolerant to avoid becoming a single point of failure."
  trade_offs: "Orchestration provides centralized visibility and easier compensation logic but introduces a single coordinator that must be highly available. Choreography is more decoupled but makes the overall flow harder to trace and debug. Choosing availability over strong consistency means accepting eventual consistency and designing robust compensating actions."
difficulty: 2
answer: "Use an orchestration-based saga where the orchestrator calls Payment first, then Inventory. If Payment succeeds but Inventory fails, the orchestrator triggers a compensating transaction on Payment (issue a refund). The orchestrator should be made fault-tolerant (e.g., using a temporal workflow engine) so it does not become a single point of failure. The system favors availability: orders may temporarily show 'payment pending' while compensation completes, rather than blocking the entire flow on Inventory availability."

### Q7
type: scenario
stem: "Your team is building a financial transfer service that moves money between accounts stored in two separate databases. Step 1: Evaluate whether 2PC or a Saga is appropriate given that both consistency and auditability are regulatory requirements. Step 2: Design the solution ensuring that no money is ever lost or duplicated even during network partitions. How do you implement this?"
explanation: "Use a Saga with orchestration: debit the source account and write an outbox event atomically, credit the target account upon receiving the event, and if the credit fails, compensate by reversing the debit. Use idempotency keys on both operations and store all actions in an immutable audit log to satisfy regulatory requirements."
  trade_offs: "2PC gives strong consistency but blocks during partitions and creates tight coupling between databases, risking unavailability. A Saga with compensating transactions provides availability but only eventual consistency, meaning intermediate states where totals appear incorrect are visible. For financial systems, regulatory auditability often favors the Saga approach with a complete audit trail of forward and compensating actions."
difficulty: 3
answer: "Use a Saga with orchestration. Implement the transfer as: (1) debit source account and write an outbox event atomically, (2) credit target account upon receiving the event, (3) if step 2 fails, compensate by reversing the debit. Use idempotency keys on both debit and credit operations to prevent duplicates. Store all forward and compensating actions in an immutable audit log. In a network partition, the Saga pauses rather than blocking both databases; when connectivity resumes, the orchestrator continues or compensates. This satisfies auditability while avoiding 2PC's blocking risk."

### Q8
type: scenario
stem: "A microservice needs to update its own database and publish an event to Kafka. The team initially wrote code that performs both operations sequentially. Step 1: Identify what can go wrong with this dual-write approach. Step 2: Propose an architecture that eliminates this risk while keeping the service decoupled from Kafka's availability. What pattern and implementation do you choose?"
explanation: "Adopt the transactional outbox pattern: write both the business data and the event to an outbox table within the same local database transaction, then use a separate relay process (or CDC via Debezium) to publish events to Kafka, guaranteeing atomicity without dual-write inconsistency."
  trade_offs: "Dual-write risks inconsistency: if the DB commit succeeds but the Kafka publish fails, the system state and the event are out of sync; if Kafka publish succeeds but the DB commit fails, downstream consumers see a phantom event. The outbox pattern solves this but adds operational complexity (a relay process or CDC pipeline) and introduces slight latency between the DB commit and event visibility."
difficulty: 4
answer: "Adopt the transactional outbox pattern. Write both the business data and the event to an outbox table within the same local database transaction—this guarantees they commit or roll back together. Then use a separate relay process (or CDC via Debezium) to read the outbox table and publish events to Kafka. If Kafka is unavailable, the relay simply retries; events are never lost because they are durably stored in the outbox. The business service remains decoupled from Kafka's availability. Ensure the relay marks events as published or uses Kafka's idempotent producer to avoid duplicate publications."

### Q9
type: scenario
stem: "Your company runs a multi-step workflow for customer onboarding that spans five services: Identity verification, Account creation, Notification, Billing setup, and CRM sync. Step 1: Consider that the workflow can take hours (Identity verification may require manual review), individual steps can fail transiently, and the business needs full visibility into which step each onboarding is at. Step 2: Evaluate whether to implement this with a hand-rolled Saga or a temporal workflow engine. What do you choose and why?"
explanation: "Choose a temporal workflow engine (e.g., Temporal): it provides automatic state persistence for long-running workflows, configurable retry policies for transient failures, timeout handling for steps like manual review, and a query API for operational visibility into each onboarding's progress."
  trade_offs: "A hand-rolled Saga requires building retry logic, timeout handling, state persistence, and observability from scratch—high engineering cost and bug surface area. A temporal workflow engine provides built-in durability, retries, timeouts, and queryability but introduces a new infrastructure dependency and a learning curve for the team. For long-running workflows with many steps and the need for operational visibility, the workflow engine's benefits typically outweigh its costs."
difficulty: 4
answer: "Choose a temporal workflow engine (e.g., Temporal). The onboarding workflow is long-running (hours), has multiple failure modes, and requires operational visibility—exactly the problems workflow engines solve. The engine provides: automatic state persistence so the workflow survives service restarts, configurable retry policies for transient failures, timeout handling for steps like manual identity review, and a query API to inspect which step any onboarding is at. The compensating logic for each step is codified in the workflow definition. This eliminates the need to hand-roll state machines, retry queues, and status tracking tables, reducing both engineering effort and operational risk. The team should invest in learning the engine's programming model and ensure the Temporal server cluster is operated with appropriate redundancy."
