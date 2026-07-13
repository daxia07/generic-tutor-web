# Database Indexing

## Definition
A database index is a data structure (typically B-tree or hash table) that speeds up data retrieval at the cost of additional storage and slower writes. Indexes allow the database to find rows without scanning the entire table.

## Key Terms
- **B-tree index**: Balanced tree structure — most common. Supports range queries, sorting, prefix matching.
- **Hash index**: O(1) exact-match lookups but no range queries. Rarely used in practice.
- **Composite index**: Index on multiple columns. Column order matters — leftmost prefix rule.
- **Covering index**: Index contains all columns needed by the query — no table lookup needed.
- **Clustered index**: The table data is physically ordered by this index (one per table in most DBs).
- **Non-clustered (secondary) index**: Separate structure pointing to row locations.
- **Index selectivity**: Ratio of distinct values to total rows. High selectivity = good index candidate.
- **Write amplification**: Every write must update the table AND all affected indexes.
- **EXPLAIN**: SQL command to see the query execution plan and index usage.

## Why It Matters
Indexing is the #1 performance optimization for databases. A missing index can turn a 1ms query into a 10s table scan. Interviewers often ask you to identify which queries need indexes.

## Interview Questions
1. "This query is slow — how would you optimize it?"
2. "What's the trade-off between read and write performance with indexes?"
3. "How would you design indexes for this table with these query patterns?"

## Gotchas
- Over-indexing: Every index slows writes and consumes storage. Index only what's queried.
- Column order in composite indexes: (A, B) serves queries on A or (A, B) but NOT on B alone.
- Indexes don't help with functions: WHERE UPPER(name) = 'X' won't use an index on name.
- Forgetting to analyze query patterns before indexing — index design is driven by queries, not tables.

## Questions

### Q1
type: multiple-choice
stem: "Which data structure is most commonly used for database indexes?"
options:
  - A: Hash table
  - B: B-tree / B+ tree
  - C: Linked list
  - D: Graph
correct: B
explanation: "B-trees and B+ trees are the most common index structures because they maintain sorted order and support range queries."
difficulty: 1

### Q2
type: fill-in-blank
stem: "An index on multiple columns is called a ______ index."
answers:
  - "composite"
  - "compound"
  - "multi-column"
explanation: "Composite (compound) indexes cover multiple columns, with column order affecting query optimization."
difficulty: 2

### Q3
type: multiple-choice
stem: "What is the main trade-off when adding more indexes to a table?"
options:
  - A: Faster reads, slower writes
  - B: Faster writes, slower reads
  - C: Both faster
  - D: No impact
correct: A
explanation: "Indexes speed up reads but slow down writes because each index must be updated on insert/update/delete."
difficulty: 1

### Q4
type: fill-in-blank
stem: "An index that includes all columns referenced in a query so that the database never needs to look up the actual table row is called a ______ index."
answers:
  - "covering"
  - "cover"
explanation: "A covering index contains every column the query needs, allowing the database to satisfy the query entirely from the index without a table lookup (bookmark lookup / heap fetch)."
difficulty: 2

### Q5
type: select-all
stem: "Which of the following queries can use a composite index on (last_name, first_name)?"
options:
  - A: WHERE last_name = 'Smith'
  - B: WHERE first_name = 'Alice'
  - C: WHERE last_name = 'Smith' AND first_name = 'Alice'
  - D: WHERE first_name = 'Alice' AND last_name = 'Smith'
correct:
  - A
  - C
  - D
explanation: "The leftmost prefix rule: a composite index on (last_name, first_name) serves queries filtering on last_name alone (A), or both columns (C, D — column order in the WHERE clause doesn't matter). Query (B) skips the leftmost column, so the index cannot be used."
difficulty: 3

### Q6
type: scenario
stem: "Step 1: Your Orders table has 50 million rows and a query filtering by status (5 distinct values) takes 12 seconds. Step 2: You add an index on status and the query still does a full table scan. Why?"
options:
  - A: The index is corrupt and needs to be rebuilt
  - B: Status has very low selectivity (only 5 distinct values) — the optimizer correctly chooses a full scan over an index scan + lookup
  - C: The database does not support indexing on string columns
  - D: You need to restart the database for the index to take effect
correct: B
explanation: "With only 5 distinct values across 50M rows, each value appears ~10M times. The optimizer estimates that reading the index then doing 10M row lookups is more expensive than a sequential table scan. Low-selectivity columns are poor index candidates unless used in a composite index or covering index."
trade_offs: "You could force the index with a hint, but that risks worse performance as data changes. Better approaches: add status to a composite index with a more selective column (e.g., status + created_at), or use a partial/partial index on specific status values."
difficulty: 3

### Q7
type: scenario
stem: "Step 1: Your application inserts 5,000 rows per second into a high-traffic logging table. Step 2: A DBA adds 6 indexes to support various reporting queries. Step 3: Insert throughput drops to 800 rows/second. What happened and how would you fix it?"
options:
  - A: The table is too large — partition it
  - B: Each insert must update 6 index structures (write amplification), drastically reducing throughput — remove unnecessary indexes and keep only those critical for queries
  - C: The indexes are using too much RAM — increase memory
  - D: The logging table needs to be converted to a NoSQL database
correct: B
explanation: "Write amplification: every INSERT must modify the table heap plus all 6 index structures. For 5K inserts/sec, that's 35K+ page writes/sec. Dropping indexes that aren't used by critical queries is the standard fix. For logging tables, consider a single well-chosen composite index or ETL into a separate reporting store."
trade_offs: "Removing indexes speeds up writes but slows down the reporting queries those indexes supported. Consider: offload reporting to a read replica, use a columnar store for analytics, or batch inserts to reduce per-row index overhead."
difficulty: 4

### Q8
type: scenario
stem: "Step 1: You have a query: SELECT email, name FROM users WHERE email LIKE 'alice@%'. Step 2: There is a B-tree index on the email column. Step 3: The query is still slow. Step 4: You change it to: SELECT email, name FROM users WHERE email LIKE 'alice@%' and add a covering index. What covering index would you create and why?"
options:
  - A: CREATE INDEX idx ON users(email, name) — the index can satisfy the query with a prefix scan on email and includes name, avoiding table lookups
  - B: CREATE INDEX idx ON users(name, email) — name comes first for alphabetical sorting
  - C: CREATE INDEX idx ON users(email) — the existing index is already sufficient
  - D: CREATE INDEX idx ON users(name) — filter by name instead
correct: A
explanation: "A B-tree index on (email, name) supports the prefix LIKE scan on email (leftmost prefix rule) and also contains name in the index, making it a covering index. The database can return results without touching the heap table. The existing index on email alone requires a lookup for each matching row to fetch name."
trade_offs: "The covering index (email, name) is larger than a single-column index on email, consuming more storage and slightly slower write performance. But if this query runs frequently, the read improvement outweighs the write cost. Alternatively, INCLUDE (name) syntax in some DBs adds name as an included column without affecting the index key order."
difficulty: 3
