#!/usr/bin/env tsx
// Script to add ## Questions sections to all system-design markdown files
// Run: npx tsx scripts/add-questions.ts

import fs from "fs";
import path from "path";

const CONTENT_DIR = path.join(process.cwd(), "content", "system-design");

interface QuestionDef {
  type: "multiple-choice" | "fill-in-blank" | "select-all" | "order";
  stem: string;
  options?: string[];
  correct?: string;
  answers?: string[];
  correctAnswers?: string[];
  items?: string[];
  correctOrder?: number[];
  explanation: string;
  hint?: string;
  wordBank?: string[];
  difficulty?: number;
}

// Map of filename → questions
const questionMap: Record<string, QuestionDef[]> = {
  caching: [
    {
      type: "multiple-choice",
      stem: "Which caching strategy writes data to both cache and database simultaneously?",
      options: ["A: Cache-aside", "B: Write-through", "C: Write-behind", "D: Read-through"],
      correct: "B",
      explanation: "Write-through writes to cache and DB at the same time, ensuring consistency at the cost of write latency.",
      difficulty: 2,
    },
    {
      type: "fill-in-blank",
      stem: "When many threads simultaneously experience a cache miss and all hit the database, this is called a cache ______.",
      answers: ["stampede"],
      explanation: "A cache stampede (or thundering herd) occurs when many requests miss the cache simultaneously.",
      difficulty: 3,
    },
    {
      type: "select-all",
      stem: "Which are valid cache eviction policies?",
      options: ["A: LRU", "B: Round-robin", "C: LFU", "D: FIFO"],
      correctAnswers: ["A", "C", "D"],
      explanation: "LRU (Least Recently Used), LFU (Least Frequently Used), and FIFO are all valid eviction policies. Round-robin is a load balancing strategy.",
      difficulty: 2,
    },
  ],
  "cap-theorem": [
    {
      type: "multiple-choice",
      stem: "According to the CAP theorem, a distributed system can guarantee at most how many of the three properties simultaneously?",
      options: ["A: One", "B: Two", "C: Three", "D: All of them"],
      correct: "B",
      explanation: "The CAP theorem states you can only guarantee 2 of 3: Consistency, Availability, Partition tolerance.",
      difficulty: 1,
    },
    {
      type: "fill-in-blank",
      stem: "CAP stands for Consistency, ______, and Partition Tolerance.",
      answers: ["Availability"],
      explanation: "CAP = Consistency, Availability, Partition Tolerance.",
      difficulty: 1,
    },
    {
      type: "multiple-choice",
      stem: "Which CAP trade-off does a system choose when it remains available during a network partition but may return stale data?",
      options: ["A: CP", "B: CA", "C: AP", "D: PA"],
      correct: "C",
      explanation: "AP systems choose Availability over Consistency during partitions — they serve requests but may return stale data.",
      difficulty: 2,
    },
  ],
  "load-balancing": [
    {
      type: "multiple-choice",
      stem: "Which load balancing algorithm sends requests to the server with the fewest active connections?",
      options: ["A: Round-robin", "B: Least connections", "C: IP hash", "D: Random"],
      correct: "B",
      explanation: "Least connections tracks active connections per server and routes to the least busy one.",
      difficulty: 1,
    },
    {
      type: "select-all",
      stem: "Which are Layer 7 (application layer) load balancing features?",
      options: ["A: URL-based routing", "B: SSL termination", "C: IP-based routing", "D: Header-based routing"],
      correctAnswers: ["A", "D"],
      explanation: "Layer 7 can route based on URL paths and HTTP headers. IP-based routing is Layer 4. SSL termination can happen at either layer.",
      difficulty: 3,
    },
    {
      type: "fill-in-blank",
      stem: "A ______ check determines if a backend server is healthy enough to receive traffic.",
      answers: ["health", "health check"],
      explanation: "Health checks (active or passive) determine if a server should remain in the load balancer's pool.",
      difficulty: 1,
    },
  ],
  sharding: [
    {
      type: "multiple-choice",
      stem: "What is the primary challenge when a shard becomes disproportionately large?",
      options: ["A: Network latency", "B: Hot spot / data skew", "C: Replication lag", "D: Cache invalidation"],
      correct: "B",
      explanation: "Data skew creates hot spots where one shard receives far more traffic or data than others.",
      difficulty: 2,
    },
    {
      type: "fill-in-blank",
      stem: "The process of moving data between shards to rebalance load is called shard ______.",
      answers: ["rebalancing", "resplitting"],
      explanation: "Shard rebalancing redistributes data across shards when load becomes uneven.",
      difficulty: 3,
    },
    {
      type: "multiple-choice",
      stem: "Which sharding key strategy makes it easiest to add new shards without rehashing all data?",
      options: ["A: Hash-based", "B: Range-based", "C: Directory-based", "D: Random"],
      correct: "C",
      explanation: "Directory-based sharding uses a lookup table, making it easy to add shards by updating the mapping. Hash-based requires rehashing.",
      difficulty: 3,
    },
  ],
  replication: [
    {
      type: "multiple-choice",
      stem: "Which replication strategy provides the strongest consistency guarantee?",
      options: ["A: Asynchronous replication", "B: Synchronous replication", "C: Semi-synchronous", "D: Eventual consistency"],
      correct: "B",
      explanation: "Synchronous replication waits for all replicas to confirm the write before acknowledging, providing strong consistency.",
      difficulty: 1,
    },
    {
      type: "fill-in-blank",
      stem: "The delay between a write on the primary and its propagation to a replica is called replication ______.",
      answers: ["lag"],
      explanation: "Replication lag is the time difference between primary and replica data states.",
      difficulty: 2,
    },
    {
      type: "select-all",
      stem: "Which are valid replication topologies?",
      options: ["A: Single-leader", "B: Multi-leader", "C: Leaderless", "D: No-leader"],
      correctAnswers: ["A", "B", "C"],
      explanation: "Single-leader, multi-leader, and leaderless (peer-to-peer) are the three main replication topologies.",
      difficulty: 2,
    },
  ],
  "consistent-hashing": [
    {
      type: "multiple-choice",
      stem: "What data structure does consistent hashing typically use to minimize data movement when nodes are added?",
      options: ["A: Binary tree", "B: Hash ring", "C: B-tree", "D: Linked list"],
      correct: "B",
      explanation: "Consistent hashing places nodes and keys on a circular hash ring, so adding/removing nodes only affects adjacent keys.",
      difficulty: 2,
    },
    {
      type: "fill-in-blank",
      stem: "Virtual nodes (______) in consistent hashing help distribute load more evenly across physical nodes.",
      answers: ["VNodes", "vnodes"],
      explanation: "VNodes are virtual points on the hash ring assigned to physical nodes, improving load distribution.",
      difficulty: 3,
    },
    {
      type: "multiple-choice",
      stem: "In consistent hashing, when a node is removed, its data is redistributed to which node(s)?",
      options: ["A: All nodes equally", "B: The next node clockwise on the ring", "C: A random node", "D: The primary replica"],
      correct: "B",
      explanation: "When a node leaves, its data moves to the next node clockwise on the hash ring.",
      difficulty: 2,
    },
  ],
  "api-gateway": [
    {
      type: "multiple-choice",
      stem: "Which is NOT a typical responsibility of an API gateway?",
      options: ["A: Rate limiting", "B: Request routing", "C: Business logic", "D: Authentication"],
      correct: "C",
      explanation: "API gateways handle cross-cutting concerns like routing, auth, and rate limiting. Business logic belongs in backend services.",
      difficulty: 1,
    },
    {
      type: "select-all",
      stem: "Which are common API gateway features?",
      options: ["A: SSL termination", "B: Request transformation", "C: Circuit breaking", "D: Data persistence"],
      correctAnswers: ["A", "B", "C"],
      explanation: "API gateways handle SSL termination, request/response transformation, and circuit breaking. Data persistence is not a gateway concern.",
      difficulty: 2,
    },
    {
      type: "fill-in-blank",
      stem: "The pattern where a single API endpoint handles requests for multiple microservices is called the ______ gateway pattern.",
      answers: ["API", "api"],
      explanation: "An API gateway provides a single entry point for all microservice requests.",
      difficulty: 1,
    },
  ],
  "message-queues": [
    {
      type: "multiple-choice",
      stem: "Which messaging pattern delivers each message to exactly one consumer in a group?",
      options: ["A: Pub/Sub", "B: Point-to-point (queue)", "C: Broadcast", "D: Scatter"],
      correct: "B",
      explanation: "Point-to-point queues deliver each message to one consumer. Pub/Sub delivers to all subscribers.",
      difficulty: 1,
    },
    {
      type: "fill-in-blank",
      stem: "Ensuring a message is processed exactly once, even in the presence of failures, is called ______ delivery.",
      answers: ["exactly-once", "exactly once"],
      explanation: "Exactly-once delivery ensures no duplicates and no lost messages, even during failures.",
      difficulty: 3,
    },
    {
      type: "select-all",
      stem: "Which are message delivery guarantees supported by most message queues?",
      options: ["A: At-most-once", "B: At-least-once", "C: Exactly-once", "D: Best-effort"],
      correctAnswers: ["A", "B", "C"],
      explanation: "The three standard delivery guarantees are at-most-once, at-least-once, and exactly-once.",
      difficulty: 2,
    },
  ],
  "circuit-breaker": [
    {
      type: "multiple-choice",
      stem: "In which state does a circuit breaker immediately reject requests without calling the downstream service?",
      options: ["A: Closed", "B: Open", "C: Half-open", "D: Recovering"],
      correct: "B",
      explanation: "In the Open state, the circuit breaker rejects all requests immediately, giving the downstream service time to recover.",
      difficulty: 2,
    },
    {
      type: "order",
      stem: "Order the circuit breaker states as they typically cycle during a failure → recovery scenario:",
      items: ["Closed", "Open", "Half-Open"],
      correctOrder: [0, 1, 2],
      explanation: "Closed (normal) → Open (failures detected, reject all) → Half-Open (test if recovered).",
      difficulty: 2,
    },
    {
      type: "fill-in-blank",
      stem: "The ______ state allows a limited number of test requests through to check if the downstream service has recovered.",
      answers: ["half-open", "half open"],
      explanation: "Half-open state allows a few test requests to probe if the service is healthy again.",
      difficulty: 2,
    },
  ],
  "rate-limiting": [
    {
      type: "multiple-choice",
      stem: "Which rate limiting algorithm uses a sliding time window to provide smoother rate control?",
      options: ["A: Fixed window counter", "B: Sliding window log", "C: Token bucket", "D: Leaky bucket"],
      correct: "B",
      explanation: "Sliding window log tracks timestamps of each request and counts within a sliding window, providing smooth rate control.",
      difficulty: 2,
    },
    {
      type: "fill-in-blank",
      stem: "The ______ bucket rate limiting algorithm adds tokens at a fixed rate and allows a burst up to the bucket capacity.",
      answers: ["token"],
      explanation: "Token bucket allows bursts up to bucket capacity while maintaining a long-term rate limit.",
      difficulty: 2,
    },
    {
      type: "select-all",
      stem: "Which are common rate limiting strategies?",
      options: ["A: Token bucket", "B: Leaky bucket", "C: Fixed window", "D: Random drop"],
      correctAnswers: ["A", "B", "C"],
      explanation: "Token bucket, leaky bucket, and fixed window are all standard rate limiting algorithms. Random drop is not.",
      difficulty: 2,
    },
  ],
  "database-indexing": [
    {
      type: "multiple-choice",
      stem: "Which data structure is most commonly used for database indexes?",
      options: ["A: Hash table", "B: B-tree / B+ tree", "C: Linked list", "D: Graph"],
      correct: "B",
      explanation: "B-trees and B+ trees are the most common index structures because they maintain sorted order and support range queries.",
      difficulty: 1,
    },
    {
      type: "fill-in-blank",
      stem: "An index on multiple columns is called a ______ index.",
      answers: ["composite", "compound", "multi-column"],
      explanation: "Composite (compound) indexes cover multiple columns, with column order affecting query optimization.",
      difficulty: 2,
    },
    {
      type: "multiple-choice",
      stem: "What is the main trade-off when adding more indexes to a table?",
      options: ["A: Faster reads, slower writes", "B: Faster writes, slower reads", "C: Both faster", "D: No impact"],
      correct: "A",
      explanation: "Indexes speed up reads but slow down writes because each index must be updated on insert/update/delete.",
      difficulty: 1,
    },
  ],
  "acid-vs-base": [
    {
      type: "multiple-choice",
      stem: "Which ACID property ensures that a transaction either completes entirely or not at all?",
      options: ["A: Consistency", "B: Isolation", "C: Atomicity", "D: Durability"],
      correct: "C",
      explanation: "Atomicity guarantees all-or-nothing: either all operations in a transaction succeed, or none do.",
      difficulty: 1,
    },
    {
      type: "order",
      stem: "Order the ACID properties alphabetically:",
      items: ["Atomicity", "Consistency", "Durability", "Isolation"],
      correctOrder: [0, 1, 3, 2],
      explanation: "A-C-I-D: Atomicity, Consistency, Isolation, Durability.",
      difficulty: 1,
    },
    {
      type: "fill-in-blank",
      stem: "BASE stands for Basically Available, ______ state, and Eventually consistent.",
      answers: ["Soft"],
      explanation: "BASE = Basically Available, Soft state, Eventually consistent — the opposite of ACID.",
      difficulty: 2,
    },
  ],
  "sql-vs-nosql": [
    {
      type: "multiple-choice",
      stem: "Which type of database is typically better for unstructured or semi-structured data?",
      options: ["A: Relational (SQL)", "B: NoSQL", "C: Both equally", "D: Neither"],
      correct: "B",
      explanation: "NoSQL databases (document, key-value, graph) handle unstructured/semi-structured data more naturally than fixed-schema SQL databases.",
      difficulty: 1,
    },
    {
      type: "select-all",
      stem: "Which are types of NoSQL databases?",
      options: ["A: Document stores", "B: Key-value stores", "C: Column-family stores", "D: Graph databases"],
      correctAnswers: ["A", "B", "C", "D"],
      explanation: "All four are NoSQL database types: Document (MongoDB), Key-value (Redis), Column-family (Cassandra), Graph (Neo4j).",
      difficulty: 2,
    },
    {
      type: "fill-in-blank",
      stem: "SQL databases enforce a fixed ______ that defines the structure of data in tables.",
      answers: ["schema"],
      explanation: "SQL databases require a predefined schema (table structure). NoSQL databases are typically schema-flexible.",
      difficulty: 1,
    },
  ],
  "microservices-vs-monolith": [
    {
      type: "multiple-choice",
      stem: "What is a key advantage of microservices over a monolith?",
      options: ["A: Simpler deployment", "B: Independent scaling", "C: Fewer network calls", "D: Easier debugging"],
      correct: "B",
      explanation: "Microservices allow independent scaling of components. However, they add deployment complexity, network overhead, and debugging challenges.",
      difficulty: 1,
    },
    {
      type: "select-all",
      stem: "Which are challenges of microservices architecture?",
      options: ["A: Distributed tracing", "B: Network latency", "C: Data consistency", "D: Service discovery"],
      correctAnswers: ["A", "B", "C", "D"],
      explanation: "All four are microservice challenges: tracing across services, network overhead, eventual consistency, and dynamic service discovery.",
      difficulty: 2,
    },
    {
      type: "fill-in-blank",
      stem: "The ______ pattern breaks down a monolith by gradually extracting services one at a time.",
      answers: ["strangler fig", "strangler"],
      explanation: "The Strangler Fig pattern incrementally replaces monolith functionality with microservices.",
      difficulty: 3,
    },
  ],
  scalability: [
    {
      type: "multiple-choice",
      stem: "Scaling by adding more servers is called ______ scaling.",
      options: ["A: Vertical", "B: Horizontal", "C: Diagonal", "D: Linear"],
      correct: "B",
      explanation: "Horizontal scaling adds more machines. Vertical scaling adds more power (CPU/RAM) to an existing machine.",
      difficulty: 1,
    },
    {
      type: "fill-in-blank",
      stem: "Scaling up by adding more CPU or RAM to a single server is called ______ scaling.",
      answers: ["vertical"],
      explanation: "Vertical scaling (scaling up) increases a single machine's resources. It has a hard upper limit.",
      difficulty: 1,
    },
    {
      type: "select-all",
      stem: "Which techniques help achieve horizontal scalability?",
      options: ["A: Load balancing", "B: Sharding", "C: Caching", "D: Adding more RAM to one server"],
      correctAnswers: ["A", "B", "C"],
      explanation: "Load balancing, sharding, and caching all distribute load across multiple servers. Adding RAM is vertical scaling.",
      difficulty: 2,
    },
  ],
  cdn: [
    {
      type: "multiple-choice",
      stem: "What is the primary purpose of a Content Delivery Network (CDN)?",
      options: ["A: Database replication", "B: Reduce latency by serving content from edge locations", "C: Message queuing", "D: API gateway"],
      correct: "B",
      explanation: "CDNs serve content from geographically distributed edge servers, reducing latency for end users.",
      difficulty: 1,
    },
    {
      type: "fill-in-blank",
      stem: "CDN servers located closer to end users are called ______ servers.",
      answers: ["edge"],
      explanation: "Edge servers are CDN nodes positioned close to users for low-latency content delivery.",
      difficulty: 1,
    },
    {
      type: "multiple-choice",
      stem: "Which type of content benefits MOST from CDN caching?",
      options: ["A: Real-time chat messages", "B: Static assets (images, CSS, JS)", "C: Database writes", "D: WebSocket connections"],
      correct: "B",
      explanation: "Static assets are cacheable and benefit most from CDN edge caching. Dynamic content like chat requires real-time delivery.",
      difficulty: 1,
    },
  ],
  grpc: [
    {
      type: "multiple-choice",
      stem: "Which protocol does gRPC use for communication?",
      options: ["A: HTTP/1.1", "B: HTTP/2", "C: WebSocket", "D: TCP raw"],
      correct: "B",
      explanation: "gRPC uses HTTP/2 for multiplexed streams, binary framing, and header compression.",
      difficulty: 1,
    },
    {
      type: "fill-in-blank",
      stem: "gRPC uses ______ as its Interface Definition Language to define service contracts.",
      answers: ["Protocol Buffers", "Protobuf", "protobuf"],
      explanation: "Protocol Buffers (protobuf) define the service interface and message types in gRPC.",
      difficulty: 2,
    },
    {
      type: "select-all",
      stem: "Which are gRPC communication patterns?",
      options: ["A: Unary", "B: Server streaming", "C: Client streaming", "D: Bidirectional streaming"],
      correctAnswers: ["A", "B", "C", "D"],
      explanation: "gRPC supports all four: Unary (request-response), server streaming, client streaming, and bidirectional streaming.",
      difficulty: 2,
    },
  ],
  "distributed-consensus": [
    {
      type: "multiple-choice",
      stem: "Which consensus algorithm is used by etcd and ZooKeeper?",
      options: ["A: Paxos", "B: Raft", "C: Two-phase commit", "D: Gossip"],
      correct: "B",
      explanation: "etcd uses Raft. ZooKeeper uses ZAB (which is Raft-like). Paxos is used by Google's Chubby.",
      difficulty: 2,
    },
    {
      type: "fill-in-blank",
      stem: "In the Raft algorithm, a node must receive votes from a ______ of nodes to become leader.",
      answers: ["majority", "quorum", "majority (quorum)"],
      explanation: "Raft requires a majority (quorum) of nodes to elect a leader, ensuring at most one leader per term.",
      difficulty: 2,
    },
    {
      type: "multiple-choice",
      stem: "What problem does distributed consensus solve?",
      options: ["A: Load balancing", "B: Agreeing on a value across distributed nodes", "C: Caching", "D: Rate limiting"],
      correct: "B",
      explanation: "Distributed consensus ensures all nodes agree on the same data/value, critical for consistency in distributed systems.",
      difficulty: 1,
    },
  ],
  "event-driven-architecture": [
    {
      type: "multiple-choice",
      stem: "In event-driven architecture, what is an event?",
      options: ["A: A database query", "B: A significant change in state that has occurred", "C: An API call", "D: A log entry"],
      correct: "B",
      explanation: "An event represents something that happened (a state change). Consumers react to events asynchronously.",
      difficulty: 1,
    },
    {
      type: "select-all",
      stem: "Which are common event routing patterns?",
      options: ["A: Event notification", "B: Event-carried state transfer", "C: Event sourcing", "D: CQRS"],
      correctAnswers: ["A", "B", "C"],
      explanation: "Event notification, event-carried state transfer, and event sourcing are event routing patterns. CQRS is a related but separate pattern.",
      difficulty: 3,
    },
    {
      type: "fill-in-blank",
      stem: "The pattern where all changes to application state are stored as a sequence of events is called event ______.",
      answers: ["sourcing"],
      explanation: "Event sourcing persists all state changes as immutable events, enabling complete state reconstruction.",
      difficulty: 2,
    },
  ],
  "payment-systems": [
    {
      type: "multiple-choice",
      stem: "What is idempotency in the context of payment systems?",
      options: ["A: Processing payments faster", "B: Ensuring duplicate requests produce the same result", "C: Encrypting payment data", "D: Load balancing"],
      correct: "B",
      explanation: "Idempotency ensures that retrying a payment request (e.g., due to timeout) doesn't charge the customer twice.",
      difficulty: 2,
    },
    {
      type: "fill-in-blank",
      stem: "A ______ ledger records every financial transaction as an immutable entry.",
      answers: ["double-entry", "double entry"],
      explanation: "Double-entry bookkeeping records each transaction as both a debit and credit, ensuring balances always match.",
      difficulty: 2,
    },
    {
      type: "select-all",
      stem: "Which are critical requirements for payment systems?",
      options: ["A: Idempotency", "B: Auditability", "C: Strong consistency", "D: Eventual consistency"],
      correctAnswers: ["A", "B", "C"],
      explanation: "Payment systems need idempotency (no double charges), auditability (transaction logs), and strong consistency (accurate balances). Eventual consistency is insufficient for money.",
      difficulty: 2,
    },
  ],
  "blob-storage": [
    {
      type: "multiple-choice",
      stem: "Which access tier in cloud blob storage is cheapest for long-term archival?",
      options: ["A: Hot", "B: Cool", "C: Archive", "D: Premium"],
      correct: "C",
      explanation: "Archive tier has the lowest storage cost but highest retrieval cost and latency (hours to access).",
      difficulty: 1,
    },
    {
      type: "fill-in-blank",
      stem: "Amazon S3 provides ______ durability by replicating data across multiple facilities.",
      answers: ["99.999999999", "11 nines"],
      explanation: "S3 provides 99.999999999% (11 nines) durability by storing data redundantly across multiple Availability Zones.",
      difficulty: 2,
    },
    {
      type: "multiple-choice",
      stem: "What is the maximum size of a single object in Amazon S3?",
      options: ["A: 1 GB", "B: 5 GB", "C: 5 TB", "D: Unlimited"],
      correct: "C",
      explanation: "A single S3 object can be up to 5 TB. Larger uploads must use multipart upload.",
      difficulty: 2,
    },
  ],
  "sql-fundamentals": [
    {
      type: "multiple-choice",
      stem: "Which SQL clause filters rows BEFORE grouping?",
      options: ["A: WHERE", "B: HAVING", "C: GROUP BY", "D: ORDER BY"],
      correct: "A",
      explanation: "WHERE filters before GROUP BY. HAVING filters after grouping.",
      difficulty: 1,
    },
    {
      type: "fill-in-blank",
      stem: "The SQL ______ clause filters groups after the GROUP BY clause.",
      answers: ["HAVING"],
      explanation: "HAVING is like WHERE but operates on grouped/aggregated results.",
      difficulty: 1,
    },
    {
      type: "order",
      stem: "Order the SQL query execution sequence:",
      items: ["FROM", "WHERE", "GROUP BY", "SELECT"],
      correctOrder: [0, 1, 2, 3],
      explanation: "SQL executes: FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY → LIMIT.",
      difficulty: 2,
    },
  ],
  cqrs: [
    {
      type: "multiple-choice",
      stem: "What does CQRS stand for?",
      options: ["A: Central Query and Response System", "B: Command Query Responsibility Segregation", "C: Consistent Query Replication Service", "D: Cache Query Routing Strategy"],
      correct: "B",
      explanation: "CQRS = Command Query Responsibility Segregation — separating read and write models.",
      difficulty: 1,
    },
    {
      type: "fill-in-blank",
      stem: "In CQRS, the ______ model handles creating and updating data, while the query model handles reads.",
      answers: ["command"],
      explanation: "Commands handle writes (create/update/delete). Queries handle reads. They use separate models.",
      difficulty: 2,
    },
    {
      type: "select-all",
      stem: "Which are benefits of CQRS?",
      options: ["A: Independent scaling of reads and writes", "B: Optimized read models", "C: Simpler system design", "D: Eventual consistency support"],
      correctAnswers: ["A", "B", "D"],
      explanation: "CQRS enables independent scaling, optimized reads, and eventual consistency. It actually adds complexity, not simplifies.",
      difficulty: 2,
    },
  ],
  "cqrs-event-sourcing": [
    {
      type: "multiple-choice",
      stem: "In Event Sourcing, how is the current state of an entity determined?",
      options: ["A: Read from a database table", "B: Replay all events from the event store", "C: Cache the latest value", "D: Query an API"],
      correct: "B",
      explanation: "Event Sourcing stores all state changes as events. Current state is derived by replaying the event sequence.",
      difficulty: 2,
    },
    {
      type: "fill-in-blank",
      stem: "A ______ in event sourcing is a snapshot of the current state, used to avoid replaying all events from the beginning.",
      answers: ["snapshot", "checkpoint"],
      explanation: "Snapshots periodically capture the current state to avoid replaying the full event history.",
      difficulty: 3,
    },
    {
      type: "select-all",
      stem: "Which are advantages of Event Sourcing?",
      options: ["A: Complete audit trail", "B: Time travel (replay to any point)", "C: Simpler queries", "D: Natural event-driven integration"],
      correctAnswers: ["A", "B", "D"],
      explanation: "Event Sourcing provides full audit trails, time travel, and natural event-driven integration. Queries are actually more complex (need projections).",
      difficulty: 3,
    },
  ],
  "airwallex-payment-system": [
    {
      type: "multiple-choice",
      stem: "In a payment system, what is the purpose of a ledger?",
      options: ["A: Cache payment data", "B: Record all financial transactions immutably", "C: Route API requests", "D: Encrypt card data"],
      correct: "B",
      explanation: "A ledger is an immutable record of all financial transactions, serving as the source of truth for account balances.",
      difficulty: 1,
    },
    {
      type: "fill-in-blank",
      stem: "A ______ key in a payment API ensures that retrying a request doesn't create a duplicate charge.",
      answers: ["idempotency"],
      explanation: "Idempotency keys allow the server to recognize and deduplicate retried requests.",
      difficulty: 2,
    },
    {
      type: "select-all",
      stem: "Which are important considerations for cross-border payment systems?",
      options: ["A: Currency conversion", "B: Regulatory compliance", "C: Settlement timing", "D: Local payment methods"],
      correctAnswers: ["A", "B", "C", "D"],
      explanation: "Cross-border payments must handle FX rates, regulations (KYC/AML), settlement delays, and local payment method preferences.",
      difficulty: 2,
    },
  ],
};

function formatQuestion(q: QuestionDef, index: number): string {
  let lines: string[] = [];
  lines.push(`### Q${index + 1}`);
  lines.push(`type: ${q.type}`);
  lines.push(`stem: "${q.stem}"`);

  if (q.options && q.options.length > 0) {
    lines.push(`options:`);
    for (const opt of q.options) {
      lines.push(`  - ${opt}`);
    }
  }

  if (q.correct) {
    lines.push(`correct: ${q.correct}`);
  }
  if (q.answers && q.answers.length > 0) {
    lines.push(`answers:`);
    for (const a of q.answers) {
      lines.push(`  - "${a}"`);
    }
  }
  if (q.correctAnswers && q.correctAnswers.length > 0) {
    lines.push(`correct:`);
    for (const a of q.correctAnswers) {
      lines.push(`  - ${a}`);
    }
  }
  if (q.items && q.items.length > 0) {
    lines.push(`items:`);
    for (const item of q.items) {
      lines.push(`  - "${item}"`);
    }
  }
  if (q.correctOrder && q.correctOrder.length > 0) {
    lines.push(`correct_order: [${q.correctOrder.join(", ")}]`);
  }

  lines.push(`explanation: "${q.explanation}"`);

  if (q.hint) {
    lines.push(`hint: "${q.hint}"`);
  }
  if (q.wordBank && q.wordBank.length > 0) {
    lines.push(`word_bank:`);
    for (const w of q.wordBank) {
      lines.push(`  - "${w}"`);
    }
  }
  if (q.difficulty) {
    lines.push(`difficulty: ${q.difficulty}`);
  }

  return lines.join("\n");
}

function main() {
  const files = fs.readdirSync(CONTENT_DIR).filter((f) => f.endsWith(".md"));
  let updated = 0;

  for (const file of files) {
    const conceptId = path.basename(file, ".md");
    const questions = questionMap[conceptId];

    if (!questions) {
      console.log(`  ⏭️  No questions defined for ${conceptId}, skipping`);
      continue;
    }

    const filePath = path.join(CONTENT_DIR, file);
    let content = fs.readFileSync(filePath, "utf-8");

    // Check if Questions section already exists
    if (content.includes("## Questions")) {
      console.log(`  ⏭️  ${conceptId} already has Questions section, skipping`);
      continue;
    }

    // Build the questions section
    let section = "\n## Questions\n";
    questions.forEach((q, i) => {
      section += "\n" + formatQuestion(q, i) + "\n";
    });

    // Append to file
    content = content.trimEnd() + "\n" + section;
    fs.writeFileSync(filePath, content, "utf-8");
    console.log(`  ✅ Added ${questions.length} questions to ${conceptId}`);
    updated++;
  }

  console.log(`\nDone! Updated ${updated} files.`);
}

main();
