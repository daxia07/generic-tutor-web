# Design a Chat System

## Definition
A chat system enables real-time messaging between users, supporting both one-on-one and group conversations. The core challenge is delivering messages with low latency at massive scale while maintaining ordering, delivery guarantees, and presence awareness — all over unreliable network connections.

## Key Terms
- **WebSocket**: Full-duplex, persistent TCP connection enabling real-time bidirectional communication between client and server.
- **Long-polling**: Client holds an HTTP request open until the server has data (or a timeout), then reconnects. Simpler but higher overhead than WebSocket.
- **SSE (Server-Sent Events)**: Unidirectional server-to-client streaming over HTTP. Simpler than WebSocket but client cannot send data over the same channel.
- **Presence**: Online/offline/last-seen status of a user, typically maintained via heartbeat signals.
- **Fan-out**: Delivering a message to all recipients. 1:1 chat fans out to 1 device; group chat fans out to N members x M devices.
- **Sequence number**: Monotonically increasing counter per conversation used to establish total ordering of messages.
- **Delivery receipt**: Acknowledgment stages — sent (server acknowledged), delivered (reached recipient device), read (recipient opened the message).
- **Offline message sync**: When a user reconnects, the server delivers all messages with sequence numbers greater than the client's last acknowledged sequence.
- **Connection manager**: Service that maintains persistent connections with clients, handles heartbeat/keepalive, and routes incoming messages to the appropriate chat server.
- **Chat server**: Stateful server holding WebSocket connections for a subset of online users. Routes messages between users, potentially via a message queue for cross-server delivery.

## Why It Matters
Chat systems are a classic system design interview topic because they touch nearly every distributed systems concept: real-time communication, connection management at scale, message ordering, delivery guarantees, and fan-out strategies. WhatsApp handles 100B+ messages per day with a small engineering team, making it a compelling study in efficiency.

Interviewers use chat systems to test whether you can reason about the full stack — from the transport protocol choice (WebSocket vs long-polling) to the storage layer (write-heavy message stores) to the edge cases (offline sync, duplicate messages, ordering under concurrent sends).

## Interview Questions
1. "How would you design WhatsApp?"
2. "How do you handle message delivery when the recipient is offline?"
3. "How do you ensure messages appear in the correct order in a group chat?"

## Gotchas
- Using WebSocket without a fallback — corporate firewalls and proxies often block WebSocket connections.
- Ignoring multi-device support — a user may be online on phone and desktop simultaneously.
- Assuming sequence numbers can be generated client-side — clock skew between devices makes this unreliable.
- Forgetting that presence updates themselves create fan-out load — broadcasting "user X is online" to all their contacts can be expensive at scale.
- Storing all messages in a single table without sharding — message tables grow extremely fast and become hot partitions.
- Using the same connection for chat and presence — a single slow presence update can block message delivery.

## Questions

### Q1
type: multiple-choice
stem: "Which transport protocol provides full-duplex, persistent, bidirectional communication for a chat system?"
options:
  - A: HTTP long-polling
  - B: Server-Sent Events (SSE)
  - C: WebSocket
  - D: HTTP/2 multiplexing
correct: C
explanation: "WebSocket provides full-duplex bidirectional communication over a single persistent TCP connection. SSE is server-to-client only, and long-polling requires a new HTTP request per message."
difficulty: 1

### Q2
type: multiple-choice
stem: "A user sends a message in a group chat with 200 members. What is the fan-out factor assuming each member has 2 devices on average?"
options:
  - A: 200
  - B: 400
  - C: 201
  - D: 1
correct: B
explanation: "Fan-out = number of recipients x devices per recipient. 200 members x 2 devices = 400 delivery operations. The sender's own devices may add 2 more, but the core fan-out for recipients is 400."
difficulty: 2

### Q3
type: fill-in-blank
stem: "When a user comes back online, the client sends its last acknowledged ______ to the server, which then delivers all newer messages."
answers:
  - "sequence number"
  - "sequence_number"
  - "seq number"
  - "seq num"
  - "seqnum"
explanation: "Sequence numbers enable efficient offline sync — the server simply returns all messages with a sequence number greater than the client's last ack, avoiding duplicate delivery."
difficulty: 1

### Q4
type: fill-in-blank
stem: "In the three-stage delivery receipt model, the stages are sent, ______, and read."
answers:
  - "delivered"
explanation: "The three stages are: sent (server received the message), delivered (reached the recipient's device), and read (recipient opened/viewed the message). This mirrors the single/double/blue-tick pattern in messaging apps."
difficulty: 1

### Q5
type: select-all
stem: "Which of the following are valid approaches for real-time message delivery in a chat system?"
options:
  - A: WebSocket
  - B: HTTP long-polling
  - C: Server-Sent Events
  - D: HTTP request-response per message
correct:
  - A
  - B
  - C
explanation: "WebSocket, long-polling, and SSE are all used for real-time delivery. WebSocket is preferred for bidirectional chat. SSE works for one-way streams (e.g., receiving messages). Long-polling is a fallback when WebSocket is blocked. Per-message HTTP requests are too slow and expensive for real-time chat."
difficulty: 2

### Q6
type: scenario
stem: "Step 1: Consider you are designing a chat system that must work behind corporate firewalls that sometimes block WebSocket connections. Step 2: Think about what fallback mechanism you would implement and when it should activate. Which approach best handles this real-world constraint?"
options:
  - A: Use only SSE — it works over HTTP and supports bidirectional communication
  - B: Use WebSocket as primary with long-polling fallback — try WebSocket first, fall back to long-polling on connection failure
  - C: Use only long-polling — it is simpler and works everywhere
  - D: Use HTTP/2 server push — it bypasses firewalls and provides full-duplex
correct: B
explanation: "WebSocket is the best experience (low latency, full-duplex, efficient), but corporate firewalls may block it. The standard pattern is: attempt WebSocket connection, if it fails or times out, fall back to long-polling over HTTP which almost always works through firewalls."
trade_offs: "WebSocket gives lower latency and less overhead but may be blocked. Long-polling works almost everywhere but has higher latency and more HTTP overhead (new connection per poll cycle). Supporting both adds client complexity but is necessary for reliability at scale."
difficulty: 2

### Q7
type: scenario
stem: "Step 1: Consider a user who is online on both their phone and laptop. Step 2: Think about how the system routes an incoming message to all their devices and how ordering is maintained across devices. What is the key design decision for multi-device message delivery?"
options:
  - A: Route messages to only the most recently active device to save bandwidth
  - B: Each device maintains its own independent message sequence, synced periodically
  - C: All devices share a per-conversation sequence number — the server fans out the message with the same sequence number to every connected device for that user
  - D: Use a leader device that forwards messages to other devices peer-to-peer
correct: C
explanation: "A per-conversation sequence number (not per-device) ensures all devices see the same message order. The server fans out to every connected device for that user using the same sequence number, so each device can independently detect gaps and request missing messages."
trade_offs: "Fan-out to all devices increases server load (N devices per user), but ensures consistency. Per-device sequences would create ordering conflicts that are extremely hard to resolve. The shared sequence number approach is simple and correct, at the cost of slightly more fan-out work."
difficulty: 3

### Q8
type: scenario
stem: "Step 1: Consider a group chat with 500 members where one person sends a message. Step 2: Think about how this message reaches all 500 members — some online, some offline. Step 3: Consider what happens to the server load if 10 active users each send a message in the same second. Which architecture best handles this fan-out challenge?"
options:
  - A: The sender's chat server directly pushes to all 500 members' connections — fast but creates hot spots on popular users' chat servers
  - B: The sender's chat server publishes to a message queue (topic per group), and each recipient's chat server consumes and delivers — distributes load but adds queue latency
  - C: Each member polls the server every second for new messages — simple but wastes bandwidth and adds latency
  - D: Use a central broadcast service that maintains all active connections — single point of failure
correct: B
explanation: "A message queue (e.g., Kafka topic per group chat) decouples the sender from all recipients. The sender's server publishes once; each recipient's chat server consumes and pushes to its local connections. This distributes fan-out load across many servers and prevents any single chat server from becoming a bottleneck."
trade_offs: "The queue adds 5-20ms latency per hop but prevents hot spots — without it, a popular group chat could overwhelm one server with 500 outbound pushes. Polling (option C) is too slow and wasteful. Direct push (option A) creates the exact hot spot problem that makes the system unscalable for large groups."
difficulty: 3

### Q9
type: scenario
stem: "Step 1: Consider that your chat system has 10M concurrent WebSocket connections, each needing a heartbeat every 30 seconds. Step 2: Think about how to distribute these connections across servers and what happens when a server crashes. Step 3: Consider how disconnected users reconnect and receive missed messages. What is the most robust connection management architecture?"
options:
  - A: All connections route through a single load balancer to any chat server — simple but no affinity, so server crash loses all connection state and requires every user to reconnect and resync
  - B: Sticky routing (consistent hashing on user ID) to chat servers, with presence service tracking which server holds each user's connection, and per-conversation sequence numbers for efficient resync after reconnection
  - C: Each user connects to a random server each time, and servers gossip to find which server holds a recipient's connection — adds cross-server gossip overhead on every message
  - D: Clients maintain two WebSocket connections to two different servers for redundancy — doubles connection load and creates ordering conflicts
correct: B
explanation: "Consistent hashing on user ID ensures a user always routes to the same chat server (or its replica), making it easy to look up where a recipient is connected. The presence service tracks user-to-server mappings. When a server crashes, clients reconnect to the next node in the hash ring and resync using sequence numbers — the server delivers all messages after the client's last acked sequence."
trade_offs: "Sticky routing simplifies lookups but means a server crash affects a known subset of users (those in its hash range). Consistent hashing minimizes this: only users in the crashed server's range need to reconnect. Random routing (option C) requires expensive lookup on every message. Dual connections (option D) double infrastructure cost and complicate ordering."
difficulty: 4
