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
type: fill-in-blank
stem: "SQL databases enforce a fixed ______ that defines the structure of data in tables."
answers:
  - "schema"
explanation: "SQL databases require a predefined schema (table structure). NoSQL databases are typically schema-flexible."
difficulty: 1
