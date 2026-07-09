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
