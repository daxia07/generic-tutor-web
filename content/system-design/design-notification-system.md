# Design a Notification System

## Definition
A notification system is a distributed platform responsible for delivering messages to users across multiple channels—push notifications, email, and SMS—reliably and at scale. It abstracts the complexity of interacting with third-party delivery providers (APNs, FCM, SES, Twilio), handles user preference management, deduplication, rate limiting, template rendering, and provides delivery tracking and analytics.

## Key Terms
- **Fan-out on write**: A pattern where a notification event is immediately replicated to all recipient queues or inboxes at write time, as opposed to fan-out on read where aggregation happens at query time.
- **Device Token**: A unique identifier issued by push providers (APNs for iOS, FCM for Android) that identifies a specific app installation on a specific device; tokens must be refreshed and managed over time.
- **Rate Limiting**: Controlling the frequency of notifications sent to a user or through a specific channel to prevent spam and respect user preferences.
- **Template Rendering**: The process of merging dynamic data into a pre-defined notification template to produce the final message content for each channel.
- **At-least-once Delivery**: A reliability guarantee ensuring every notification is delivered at least once, possibly with duplicates, which must be handled by deduplication on the consumer side.
- **Deduplication**: The process of detecting and suppressing duplicate notifications, typically using a unique notification ID and a short-lived cache or database check.
- **Aggregation/Batching**: Combining multiple notifications into a single delivery (e.g., "You have 5 new likes") to reduce notification fatigue and delivery cost.
- **Priority Level**: A classification (e.g., high, normal, low) that determines delivery urgency, queue ordering, and whether a notification bypasses rate limits or quiet hours.

## Why It Matters
Notification systems are critical user-facing infrastructure that directly impacts engagement, retention, and user experience. A poorly designed system can spam users (causing opt-outs), lose critical messages (causing missed appointments or security alerts), or collapse under load during peak events like product launches. The challenge lies in balancing reliability, latency, cost, and user control across heterogeneous delivery channels, each with its own throughput limits, failure modes, and pricing models.

In interviews, this problem tests your ability to design for high throughput with fan-out patterns, reason about reliability guarantees and idempotency, manage cross-channel orchestration, and make trade-offs between immediate delivery and aggregation. It also touches on operational concerns like token lifecycle management, monitoring delivery rates, and graceful degradation when third-party providers experience outages.

## Interview Questions
1. "How would you design a notification system that supports push, email, and SMS with user preference controls?"
2. "How does fan-out on write differ from fan-out on read in the context of sending notifications to millions of users?"
3. "What strategies would you use to prevent duplicate notifications in an at-least-once delivery system?"
4. "How do you handle device token invalidation and refresh for APNs and FCM at scale?"

## Gotchas
- Forgetting that device tokens can expire or be invalidated; stale tokens must be removed and refreshed, not retried indefinitely.
- Assuming exactly-once delivery; in distributed systems, at-least-once is realistic, and deduplication must be handled downstream.
- Overlooking rate limiting per channel—each provider (APNs, FCM, SES, Twilio) has its own throughput limits and quotas.
- Sending every notification individually without aggregation, leading to notification fatigue and unnecessary cost.
- Not respecting user notification preferences (quiet hours, channel opt-outs), which can cause mass unsubscriptions.
- Treating all notifications with the same priority; security alerts must bypass quiet hours while marketing messages should not.

## Questions

### Q1
type: multiple-choice
stem: "Which pattern is most suitable for delivering a notification to millions of followers in real-time when a popular user posts new content?"
options:
  - A: Fan-out on read, where each follower queries their own inbox on demand
  - B: Fan-out on write, where the notification is immediately pushed to each follower's queue
  - C: Batch processing, where notifications are grouped and sent hourly
  - D: Direct database query, where followers pull notifications from a shared table
correct: B
explanation: "Fan-out on write pushes the notification to each recipient's queue at event time, enabling low-latency delivery. Fan-out on read adds latency per query and does not scale well for real-time push. Batch processing introduces unacceptable delay for real-time scenarios."
difficulty: 1

### Q2
type: multiple-choice
stem: "When APNs returns a feedback response indicating a device token is invalid, what should the notification system do?"
options:
  - A: Retry sending the notification with exponential backoff
  - B: Mark the token as invalid and stop sending to it, then trigger a token refresh flow
  - C: Queue the notification and wait for the user to reopen the app
  - D: Switch the delivery channel to email automatically without user consent
correct: B
explanation: "APNs feedback explicitly indicates the token is no longer valid (app uninstalled, device wiped). Retrying is wasteful and can harm sender reputation. The correct action is to deactivate the token and rely on the client app to register a new token on next launch. Silently switching channels violates user preference controls."
difficulty: 2

### Q3
type: fill-in-blank
stem: "To suppress duplicate notifications in an at-least-once delivery system, each notification is assigned a unique ID and checked against a short-lived ___ before delivery."
answers:
  - "cache"
  - "deduplication cache"
  - "idempotency key store"
  - "bloom filter"
explanation: "A short-lived deduplication cache stores previously seen notification IDs, allowing the system to detect and suppress duplicates before delivery in an at-least-once system."
difficulty: 2

### Q4
type: fill-in-blank
stem: "The service provided by Apple for delivering push notifications to iOS devices is called ___, and the equivalent Google service for Android is called ___."
answers:
  - "APNs"
  - "Apple Push Notification service"
  - "APNS"
  - "FCM"
  - "Firebase Cloud Messaging"
  - "GCM"
  - "Google Cloud Messaging"
explanation: "APNs (Apple Push Notification service) handles iOS push delivery, while FCM (Firebase Cloud Messaging) handles Android push delivery. These are the two major platform-specific push notification services."
difficulty: 1

### Q5
type: select-all
stem: "Which of the following should be considered when implementing notification rate limiting? Select all that apply."
options:
  - A: Per-user rate limits across all channels
  - B: Per-channel provider throughput quotas (e.g., APNs, Twilio rate limits)
  - C: User quiet hours and do-not-disturb settings
  - D: Notification priority level (high-priority messages may bypass limits)
  - E: Database storage capacity for notification history
  - F: Template rendering cache size
correct:
  - A
  - B
  - C
  - D
explanation: "Rate limiting must account for user-level limits (A), provider-level quotas (B), user preference quiet hours (C), and priority bypass rules (D). Database storage (E) and template cache size (F) are capacity concerns, not rate-limiting concerns."
difficulty: 2

### Q6
type: scenario
stem: "You are designing a notification system for a social media app with 100M users. A celebrity with 50M followers posts an update, and a notification must be sent to all followers. Step 1: Consider how to distribute the fan-out workload without overwhelming any single component. Step 2: Decide how to handle users who have disabled push notifications but still have email enabled. How would you architect this?"
explanation: "Use a message queue to distribute fan-out work across multiple workers, then resolve each recipient's channel preferences at delivery time—skipping push for users who disabled it and routing to their enabled channels (e.g., email only)."
  trade_offs: "Fan-out on write with a message queue per user provides low latency but requires massive write throughput and storage for 50M fan-out entries. Fan-out on read (timeline-style) reduces write amplification but adds latency at read time. Hybrid approaches where fan-out on write is used for active users and fan-out on read for inactive users can optimize cost. Channel routing adds complexity since each recipient may have different preference configurations that must be resolved at delivery time."
difficulty: 3

### Q7
type: scenario
stem: "Your notification system uses at-least-once delivery. Due to a queue retry bug, some users received the same notification 3 times. Step 1: Identify where in the pipeline deduplication should be enforced. Step 2: Propose a deduplication mechanism that works even when notification workers are horizontally scaled. How do you ensure idempotency?"
explanation: "Enforce deduplication server-side using a distributed cache (e.g., Redis) keyed by notification ID—before delivering, each worker checks the shared cache and skips if the ID was recently seen, ensuring idempotency across horizontally scaled workers."
  trade_offs: "Client-side deduplication (de-dup on the device) is simplest but unreliable across platforms and doesn't prevent wasted delivery cost. Server-side deduplication using a distributed cache (Redis) with a notification ID key is effective but adds latency and storage cost. Database-based deduplication with a unique constraint is strong but slower. The TTL of the deduplication window matters: too short and legitimate retries may produce duplicates, too long and storage grows. With horizontally scaled workers, you need a shared deduplication store rather than in-memory per-worker checks."
difficulty: 3

### Q8
type: scenario
stem: "Your e-commerce platform sends order confirmation, shipping update, and promotional notifications. Users are complaining about notification fatigue—receiving too many promotional messages—while missing critical order updates. Step 1: Design a priority and aggregation system that ensures high-priority notifications are delivered immediately while low-priority ones are batched. Step 2: Explain how you would implement notification preferences so users can opt out of promotional messages without missing transactional ones. What architecture changes are needed?"
explanation: "Implement priority queues where high-priority (transactional) notifications bypass batching and are delivered immediately, while low-priority (promotional) notifications are aggregated into batched summaries. Separate user preference controls by category so users can opt out of promotional messages without affecting transactional ones."
  trade_offs: "Adding priority levels requires priority queues or weighted scheduling, which increases system complexity. Aggregation/batching of low-priority notifications reduces delivery volume but introduces delay—users may not see a promotion until the batch window elapses. Implementing fine-grained preference controls (per category, per channel) adds storage and lookup overhead for every notification send. Strict separation of transactional vs. promotional notifications is critical for legal compliance (CAN-SPAM, GDPR) but requires clear categorization at the event source, which may not always be unambiguous."
difficulty: 4

### Q9
type: scenario
stem: "Your notification system needs to track delivery status (sent, delivered, clicked) across push, email, and SMS channels for analytics. Step 1: Design the event tracking pipeline that captures delivery callbacks from APNs/FCM, email open tracking (pixel-based), and SMS delivery receipts from Twilio. Step 2: Address how you would handle the unreliability of these callbacks—APNs does not confirm delivery for all notifications, email open pixels can be blocked, and SMS receipts may be delayed. How do you build accurate analytics despite incomplete data?"
explanation: "Build an event tracking pipeline that ingests callbacks from each provider (APNs/FCM delivery receipts, email open/click pixels, SMS receipts), normalizes them into a common schema, and stores them in a data warehouse. Use probabilistic modeling to estimate metrics where callbacks are incomplete, and clearly communicate confidence intervals."
  trade_offs: "Push delivery confirmation is limited—APNs only reliably reports failures, not successes, so analytics will undercount push deliveries. Email open tracking via pixels is increasingly blocked by privacy-focused email clients, making open rates unreliable; click tracking is more reliable but only captures engaged users. SMS delivery receipts vary by carrier and may be delayed hours. Building analytics on incomplete data requires probabilistic modeling and clearly communicating confidence intervals to stakeholders. Storing all raw callback events for later reconciliation adds storage cost but enables reprocessing. Real-time dashboards may show misleading metrics if callbacks are delayed."
difficulty: 4
