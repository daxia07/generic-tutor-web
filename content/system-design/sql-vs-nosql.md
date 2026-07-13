# SQL vs NoSQL

## Definition
**SQL databases** (relational) use structured tables with predefined schemas, ACID transactions, and SQL queries. **NoSQL databases** use flexible schemas and come in four types: document (MongoDB), key-value (Redis), wide-column (Cassandra), and graph (Neo4j). The choice depends on data structure, scale requirements, and consistency needs.

## Key Terms
- **Schema-on-write**: SQL — data must conform to schema before storage.
- **Schema-on-read**: NoSQL — data is interpreted when read, flexible structure.
- **ACID**: Atomicity, Consistency, Isolation, Durability — strong transaction guarantees.
- **BASE**: Basically Available, Soft state, Eventually consistent — NoSQL trade-off.
- **Document store**: JSON-like documents (MongoDB, CouchDB). Good for nested, variable data.
- **Key-value store**: Simple get/put by key (Redis, DynamoDB). Fastest for simple lookups.
- **Wide-column store**: Rows with dynamic columns (Cassandra, HBase). Good for time-series, IoT.
- **Graph database**: Nodes and edges (Neo4j, Amazon Neptune). Good for relationships, recommendations.
- **Polyglot persistence**: Using multiple database types in one system.

## Why It Matters
This is a foundational interview question. The right answer is "it depends" — and interviewers want to hear you reason about the trade-offs for the specific use case.

## Interview Questions
1. "Would you use SQL or NoSQL for this system? Why?"
2. "What are the trade-offs between MongoDB and PostgreSQL?"
3. "When would you choose a graph database?"

## Gotchas
- "NoSQL is faster" is a myth — it depends on the workload and access patterns.
- "SQL doesn't scale" is outdated — Citus, Vitess, CockroachDB scale SQL horizontally.
- Choosing NoSQL because "it's trendy" without analyzing data model is a red flag.
- Forgetting that NoSQL often means giving up joins — denormalization is required.
- Polyglot persistence is powerful but adds operational complexity.

## Questions

### Q1
type: multiple-choice
stem: "Which type of database is typically better for unstructured or semi-structured data?"
options:
  - A: Relational (SQL)
  - B: NoSQL
  - C: Both equally
  - D: Neither
correct: B
explanation: "NoSQL databases (document, key-value, graph) handle unstructured/semi-structured data more naturally than fixed-schema SQL databases."
difficulty: 1

### Q2
type: select-all
stem: "Which are types of NoSQL databases?"
options:
  - A: Document stores
  - B: Key-value stores
  - C: Column-family stores
  - D: Graph databases
correct:
  - A
  - B
  - C
  - D
explanation: "All four are NoSQL database types: Document (MongoDB), Key-value (Redis), Column-family (Cassandra), Graph (Neo4j)."
difficulty: 2

### Q3
type: scenario
stem: "Your startup builds a feature where each user can store custom attributes (different fields per user). SQL requires ALTER TABLE for new columns. Which database approach best fits?"
options:
  - A: SQL with a fixed schema — enforce structure for consistency
  - B: NoSQL document store — flexible schema handles varying fields naturally
  - C: SQL with EAV pattern — entity-attribute-value rows
  - D: Graph database — model attributes as edge properties
correct: B
explanation: "NoSQL document stores (MongoDB, DynamoDB) allow each record to have different fields without schema migrations. This is their core advantage for semi-structured or evolving data."
trade_offs: "EAV pattern works in SQL but makes queries complex and slow. Document stores sacrifice SQL's JOIN power and transaction guarantees across documents."
difficulty: 2

### Q4
type: fill-in-blank
stem: "The practice of using multiple different database types in a single system is called ______ persistence."
answers:
  - "polyglot"
  - "polyglot persistence"
explanation: "Polyglot persistence means choosing the right database type for each workload within one system — e.g., PostgreSQL for transactions, Redis for caching, Elasticsearch for search."
difficulty: 2

### Q5
type: select-all
stem: "Which are characteristics of BASE semantics in NoSQL databases?"
options:
  - A: Basically Available — system guarantees availability
  - B: Soft state — system state may change over time even without input
  - C: Eventually consistent — data converges to a consistent state over time
  - D: Immediate consistency — all reads see the latest write
correct:
  - A
  - B
  - C
explanation: "BASE stands for Basically Available, Soft state, Eventually consistent. It is the NoSQL counterpart to SQL's ACID guarantees, trading strong consistency for availability and partition tolerance."
difficulty: 2

### Q6
type: scenario
stem: "Step 1: You are building a social network where users follow each other and you need to answer 'find friends of friends' queries. Step 2: In SQL, this requires recursive self-joins on a follows table which become very slow at 3+ degrees of separation. Step 3: Which database type is purpose-built for this kind of relationship traversal?"
options:
  - A: Document store (MongoDB) — store relationships as nested arrays
  - B: Key-value store (Redis) — cache relationship lookups
  - C: Graph database (Neo4j) — traverse edges natively without joins
  - D: Wide-column store (Cassandra) — store adjacency lists in columns
correct: C
explanation: "Graph databases store data as nodes and edges, making relationship traversals (friends-of-friends, shortest path) efficient without recursive joins. This is their core design purpose."
trade_offs: "Graph databases add operational complexity and are overkill for simple lookups. SQL can handle shallow relationships adequately. Redis caching helps read-heavy access patterns but doesn't solve the traversal computation problem."
difficulty: 3

### Q7
type: scenario
stem: "Step 1: A financial trading platform requires that every trade is durably recorded and never lost, even during a server crash. Step 2: The team considers MongoDB for its write performance. Step 3: A senior engineer objects, citing consistency requirements. What is the core concern?"
options:
  - A: MongoDB is too slow for trading workloads
  - B: MongoDB's default write concern can acknowledge writes before they are durably persisted to disk
  - C: MongoDB does not support indexing
  - D: MongoDB cannot handle concurrent writes
correct: B
explanation: "MongoDB's default write concern (w:1) acknowledges a write after the primary journal, but with j:false the write may not be flushed to disk before acknowledgment. Financial systems need w:majority + j:true for durability, which reduces write throughput."
trade_offs: "Strong write durability in MongoDB (w:majority, j:true) significantly reduces write throughput compared to defaults. SQL databases with ACID transactions provide strong durability by default. The trade-off is performance vs. safety."
difficulty: 3

### Q8
type: scenario
stem: "Step 1: Your system uses PostgreSQL for transactional data and Elasticsearch for full-text search. Step 2: Keeping both in sync is fragile — sometimes Elasticsearch is stale after PostgreSQL updates. Step 3: The team debates whether to switch to a single database. What is the most pragmatic approach?"
options:
  - A: Abandon Elasticsearch — add full-text search to PostgreSQL using tsvector
  - B: Abandon PostgreSQL — use Elasticsearch as the primary store
  - C: Keep both — implement change data capture (CDC) from PostgreSQL to Elasticsearch for reliable sync
  - D: Keep both — just accept eventual consistency and move on
correct: C
explanation: "CDC (e.g., Debezium) captures PostgreSQL WAL changes and streams them to Elasticsearch reliably. This preserves each database's strengths while solving the sync problem with a proven pattern."
trade_offs: "CDC adds infrastructure (Kafka/Debezium) and operational complexity. PostgreSQL full-text search (A) works for basic needs but lacks Elasticsearch's relevance scoring and analyzers. Using Elasticsearch as primary (B) loses ACID transactions. Accepting staleness (D) may violate business requirements."
difficulty: 4
