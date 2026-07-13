# Message Queues

## Definition
A message queue is an intermediary that enables asynchronous communication between services. Producers send messages to a queue, and consumers process them independently. This decouples services, handles load spikes, and enables reliable event processing.

## Key Terms
- **Producer**: Service that sends messages to the queue.
- **Consumer**: Service that reads and processes messages.
- **Queue vs Topic**: Queue = point-to-point (one consumer). Topic = pub/sub (multiple subscribers).
- **At-most-once delivery**: Message delivered once or not at all — may lose messages.
- **At-least-once delivery**: Message delivered at least once — may have duplicates. Most common.
- **Exactly-once delivery**: Ideal but hard — requires idempotent consumers + deduplication.
- **Dead letter queue (DLQ)**: Where failed/unprocessable messages go for manual review.
- **Backpressure**: When consumers can't keep up — queue grows, may need scaling or throttling.
- **Kafka**: Distributed log — durable, ordered, high-throughput. Good for event streaming.
- **RabbitMQ**: Traditional message broker — flexible routing, good for task queues.
- **SQS**: AWS managed queue — simple, scales automatically.
- **Idempotency**: Processing the same message multiple times produces the same result.

## Why It Matters
Message queues are the backbone of microservice architectures. They handle async workflows, decouple services, and smooth out traffic spikes. Interviewers test whether you know when to use sync vs async communication.

## Interview Questions
1. "How would you handle a spike in order processing?"
2. "What's the difference between Kafka and RabbitMQ?"
3. "How do you ensure messages aren't lost?"

## Gotchas
- At-least-once means consumers MUST be idempotent — duplicates will happen.
- Kafka maintains message order per partition, not globally — design partition keys carefully.
- DLQs are essential — without them, poison messages block the queue forever.
- Don't use message queues for request-response — they're for fire-and-forget or event-driven patterns.
- Consumer group scaling: Kafka = partition count limits parallelism. RabbitMQ = competing consumers.

## Questions

### Q1
type: multiple-choice
stem: "Which messaging pattern delivers each message to exactly one consumer in a group?"
options:
  - A: Pub/Sub
  - B: Point-to-point (queue)
  - C: Broadcast
  - D: Scatter
correct: B
explanation: "Point-to-point queues deliver each message to one consumer. Pub/Sub delivers to all subscribers."
difficulty: 1

### Q2
type: scenario
stem: "A customer clicks 'Pay' twice in quick succession. The payment service processes both messages, charging the customer twice. Which message delivery guarantee would have prevented this?"
options:
  - A: At-most-once — duplicate messages are dropped
  - B: Exactly-once — duplicate messages are detected and deduplicated
  - C: At-least-once — messages are never lost but may be delivered multiple times
  - D: Ordered delivery — messages arrive in sequence
correct: B
explanation: "Exactly-once delivery ensures each message is processed once, even if the producer retries or the network duplicates. It typically uses idempotency keys (like an order ID) to detect and skip duplicates."
trade_offs: "Exactly-once is expensive: it requires distributed coordination and transaction logs. Many systems use at-least-once + idempotent consumers instead (cheaper, achieves the same effect for idempotent operations)."
difficulty: 3

### Q3
type: select-all
stem: "Which are message delivery guarantees supported by most message queues?"
options:
  - A: At-most-once
  - B: At-least-once
  - C: Exactly-once
  - D: Best-effort
correct:
  - A
  - B
  - C
explanation: "The three standard delivery guarantees are at-most-once, at-least-once, and exactly-once."
difficulty: 2

### Q4
type: fill-in-blank
stem: "A ______ is where messages that cannot be processed after repeated attempts are sent for manual inspection."
answers:
  - "dead letter queue"
  - "DLQ"
  - "dead-letter queue"
explanation: "A dead letter queue (DLQ) isolates poison messages so they don't block processing of healthy messages. Without one, a single unprocessable message can stall the entire queue."
difficulty: 2

### Q5
type: select-all
stem: "Which strategies help handle backpressure in a message queue system?"
options:
  - A: Scale up consumers horizontally
  - B: Drop oldest messages from the queue
  - C: Throttle producers at the source
  - D: Increase the queue's maximum size indefinitely
correct:
  - A
  - B
  - C
explanation: "Scaling consumers, dropping messages (with policy), and throttling producers all manage backpressure. Growing the queue without bound just delays the problem and risks memory exhaustion."
difficulty: 2

### Q6
type: scenario
stem: "Step 1: Your event-driven system uses Kafka with a topic that has 3 partitions. Step 2: You need to scale consumer throughput from 1 consumer to 4 consumers in the same consumer group. What happens and what should you do?"
options:
  - A: All 4 consumers share the partitions equally — throughput increases 4x
  - B: One consumer sits idle because Kafka partitions limit parallelism — add a 4th partition first
  - C: Kafka automatically rebalances and creates a new partition for the 4th consumer
  - D: The 4th consumer joins but processes duplicate messages from existing partitions
correct: B
explanation: "In Kafka, a consumer group's parallelism is bounded by the number of partitions. With 3 partitions, only 3 consumers can actively consume. The 4th consumer is idle until you increase partitions to 4+."
trade_offs: "Adding partitions increases parallelism but reduces per-partition throughput and makes consumer rebalancing more expensive. You also cannot reduce partition count later — it's a one-way operation."
difficulty: 3

### Q7
type: scenario
stem: "Step 1: Your order service publishes an OrderCreated event to RabbitMQ. Step 2: The inventory service consumes it and decrements stock, but crashes before acknowledging. Step 3: RabbitMQ redelivers the message to another inventory consumer. What must the inventory service do to avoid double-decrementing stock?"
options:
  - A: Use at-most-once delivery so redelivery never happens
  - B: Make the stock decrement operation idempotent using the order ID as a deduplication key
  - C: Switch to Kafka which guarantees exactly-once delivery
  - D: Acknowledge the message before processing it
correct: B
explanation: "With at-least-once delivery, redelivery after a crash is expected. The consumer must be idempotent: check if the order ID was already processed before decrementing stock. This achieves effective exactly-once semantics without requiring exactly-once delivery."
trade_offs: "Idempotent consumers add storage overhead (deduplication store) and processing latency. However, this is the industry-standard approach — true exactly-once delivery in distributed systems is extremely hard and often not supported by the broker."
difficulty: 4

### Q8
type: scenario
stem: "Step 1: You're choosing between Kafka and RabbitMQ for a new microservice. Step 2: The service needs to replay historical events for audit purposes and maintain strict ordering per customer. Step 3: It also needs to route different message types to different handlers. Which broker do you choose and why?"
options:
  - A: RabbitMQ — its flexible routing with exchanges handles message type routing natively, and it stores messages durably
  - B: Kafka — its durable log with offset-based replay supports audit, and partitioning by customer ID preserves ordering
  - C: Either — both support replay and routing equally well
  - D: Neither — use a database for audit and a queue for routing
correct: B
explanation: "Kafka's append-only log with offset-based consumption enables replaying historical events (critical for audit). Partitioning by customer ID guarantees ordering within that partition. RabbitMQ removes messages after ack, making replay impossible without additional tooling."
trade_offs: "Kafka's routing capabilities are more limited than RabbitMQ's exchanges. For complex routing, you may need multiple Kafka topics or a routing layer. RabbitMQ excels at routing but lacks durable replay — choose based on which requirement is primary."
difficulty: 3
