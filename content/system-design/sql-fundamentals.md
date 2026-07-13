---
tags:
  - sql
  - interview-prep
  - airwallex
last-updated: 2026-06-22
type: concept
---

# SQL Fundamentals — Interview Guide

> [!tip] Airwallex OA includes SQL tasks: JOINs, GROUP BY, nested queries. 75 min total.

## Core Concepts

### SELECT — Retrieving Data

```sql
-- Basic select
SELECT column1, column2 FROM table_name;

-- Filter rows
SELECT * FROM payments WHERE status = 'completed';

-- Limit results
SELECT * FROM payments ORDER BY created_at DESC LIMIT 10;
```

### WHERE — Filtering

```sql
-- Comparison operators
WHERE amount > 100
WHERE status != 'pending'
WHERE currency IN ('USD', 'AUD', 'EUR')
WHERE created_at BETWEEN '2026-01-01' AND '2026-06-30'
WHERE merchant_name LIKE '%airwallex%'  -- % = wildcard
WHERE description IS NULL
```

### JOIN — Combining Tables

**This is the #1 SQL interview topic.**

```sql
-- INNER JOIN: only matching rows
SELECT p.id, p.amount, m.name
FROM payments p
INNER JOIN merchants m ON p.merchant_id = m.id;

-- LEFT JOIN: all rows from left, matching from right
SELECT m.name, COUNT(p.id) as payment_count
FROM merchants m
LEFT JOIN payments p ON m.id = p.merchant_id
GROUP BY m.name;

-- RIGHT JOIN: all rows from right, matching from left
-- (rarely used — usually rewrite as LEFT JOIN)

-- FULL OUTER JOIN: all rows from both tables
SELECT * FROM table_a
FULL OUTER JOIN table_b ON table_a.id = table_b.a_id;
```

**Visual explanation:**
```
INNER JOIN:    A ∩ B  (only matching)
LEFT JOIN:     A      (all of A + matching B)
RIGHT JOIN:    B      (all of B + matching A)
FULL JOIN:     A ∪ B  (everything)
```

### GROUP BY — Aggregation

```sql
-- Count per group
SELECT currency, COUNT(*) as count
FROM payments
GROUP BY currency;

-- Multiple aggregations
SELECT
    currency,
    COUNT(*) as count,
    SUM(amount) as total,
    AVG(amount) as average,
    MAX(amount) as largest
FROM payments
WHERE status = 'completed'
GROUP BY currency
HAVING COUNT(*) > 10  -- Filter AFTER grouping
ORDER BY total DESC;
```

**Key distinction:**
- `WHERE` filters rows BEFORE grouping
- `HAVING` filters groups AFTER grouping

### Subqueries (Nested Queries)

```sql
-- Subquery in WHERE
SELECT * FROM payments
WHERE merchant_id IN (
    SELECT id FROM merchants WHERE country = 'AU'
);

-- Subquery in FROM (derived table)
SELECT currency, avg_amount
FROM (
    SELECT currency, AVG(amount) as avg_amount
    FROM payments
    GROUP BY currency
) AS currency_stats
WHERE avg_amount > 1000;

-- Correlated subquery (references outer query)
SELECT m.name, (
    SELECT COUNT(*)
    FROM payments p
    WHERE p.merchant_id = m.id
) as payment_count
FROM merchants m;
```

### Window Functions (Advanced)

```sql
-- Running total
SELECT
    id, amount,
    SUM(amount) OVER (ORDER BY created_at) as running_total
FROM payments;

-- Rank within groups
SELECT
    merchant_id, amount,
    RANK() OVER (PARTITION BY merchant_id ORDER BY amount DESC) as rank
FROM payments;

-- Lead/Lag (compare with previous/next row)
SELECT
    id, amount,
    LAG(amount) OVER (ORDER BY created_at) as prev_amount,
    amount - LAG(amount) OVER (ORDER BY created_at) as difference
FROM payments;
```

## Common Interview Patterns

### Pattern 1: "Find top N per group"
```sql
-- Top 3 payments per merchant
SELECT * FROM (
    SELECT
        merchant_id, amount,
        ROW_NUMBER() OVER (PARTITION BY merchant_id ORDER BY amount DESC) as rn
    FROM payments
) ranked
WHERE rn <= 3;
```

### Pattern 2: "Find duplicates"
```sql
SELECT column1, COUNT(*)
FROM table_name
GROUP BY column1
HAVING COUNT(*) > 1;
```

### Pattern 3: "Year-over-year comparison"
```sql
SELECT
    EXTRACT(YEAR FROM created_at) as year,
    SUM(amount) as total
FROM payments
GROUP BY EXTRACT(YEAR FROM created_at)
ORDER BY year;
```

### Pattern 4: "Find missing records"
```sql
-- Merchants with no payments
SELECT m.name
FROM merchants m
LEFT JOIN payments p ON m.id = p.merchant_id
WHERE p.id IS NULL;
```

### Pattern 5: "Cumulative/Running aggregation"
```sql
SELECT
    created_at, amount,
    SUM(amount) OVER (ORDER BY created_at) as cumulative
FROM payments;
```

## Airwallex OA Specifics

Based on Reddit/Glassdoor:
- **Topics:** Hash tables, trees, CAP theorem, consistency models (MCQ)
- **SQL:** JOINs, GROUP BY, nested queries
- **Duration:** 75 min total (coding + MCQ + SQL)
- **Languages:** C++, Java, Python, Kotlin, Go

## Quick Reference

| Keyword | Purpose | Example |
|---------|---------|---------|
| SELECT | Choose columns | `SELECT name, amount` |
| FROM | Source table | `FROM payments` |
| WHERE | Filter rows | `WHERE status = 'completed'` |
| JOIN | Combine tables | `JOIN merchants ON ...` |
| GROUP BY | Aggregate | `GROUP BY currency` |
| HAVING | Filter groups | `HAVING COUNT(*) > 5` |
| ORDER BY | Sort | `ORDER BY amount DESC` |
| LIMIT | Cap results | `LIMIT 10` |
| DISTINCT | Unique values | `SELECT DISTINCT currency` |
| UNION | Combine results | `SELECT ... UNION SELECT ...` |

## Questions

### Q1
type: multiple-choice
stem: "Which SQL clause filters rows BEFORE grouping?"
options:
  - A: WHERE
  - B: HAVING
  - C: GROUP BY
  - D: ORDER BY
correct: A
explanation: "WHERE filters before GROUP BY. HAVING filters after grouping."
difficulty: 1

### Q2
type: scenario
stem: "You write: SELECT department, COUNT(*) FROM employees GROUP BY department ______ COUNT(*) > 5. Which clause goes in the blank and why?"
options:
  - A: WHERE — because it filters rows before grouping
  - B: HAVING — because it filters groups after aggregation
  - C: LIMIT — because it caps the result count
  - D: DISTINCT — because it removes duplicate groups
correct: B
explanation: "HAVING filters after GROUP BY aggregates the data. You can't use WHERE with aggregate functions like COUNT(*) because WHERE runs before grouping."
trade_offs: "For simple pre-group filters (e.g., only active employees), use WHERE first — it reduces the rows fed into GROUP BY, improving performance."
difficulty: 2

### Q3
type: order
stem: "Order the SQL query execution sequence:"
items:
  - "FROM"
  - "WHERE"
  - "GROUP BY"
  - "SELECT"
correct_order: [0, 1, 2, 3]
explanation: "SQL executes: FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY → LIMIT."
difficulty: 2

### Q4
type: fill-in-blank
stem: "A ______ function performs a calculation across a set of rows related to the current row without collapsing them into groups (unlike GROUP BY)."
answers:
  - "window"
  - "window function"
  - "analytic"
  - "analytical"
explanation: "Window functions (OVER clause) compute values across a window of related rows while preserving each individual row in the result, unlike GROUP BY which collapses rows."
difficulty: 2

### Q5
type: select-all
stem: "Which SQL clauses or keywords can be used with aggregate functions?"
options:
  - A: HAVING
  - B: WHERE
  - C: SELECT
  - D: OVER (window function)
correct:
  - A
  - C
  - D
explanation: "HAVING filters groups after aggregation (A). SELECT can display aggregate results (C). OVER applies aggregates across window frames (D). WHERE cannot use aggregate functions because it runs before grouping."
difficulty: 2

### Q6
type: scenario
stem: "Step 1: You need to find the top 3 highest-paid employees in each department. Step 2: You try GROUP BY department but that collapses each department into one row — you lose individual employee data. Step 3: Which SQL technique preserves individual rows while ranking within groups?"
options:
  - A: Self-join with aggregation
  - B: ROW_NUMBER() OVER (PARTITION BY department ORDER BY salary DESC)
  - C: GROUP BY department, employee_name
  - D: SELECT DISTINCT with ORDER BY
correct: B
explanation: "ROW_NUMBER() with PARTITION BY assigns a rank within each department while keeping all rows. Filter with WHERE rn <= 3 in an outer query to get the top 3 per group."
trade_offs: "Self-joins work but are verbose and slow. GROUP BY on department + name doesn't give rankings. Window functions are the idiomatic, efficient solution for top-N-per-group problems."
difficulty: 3

### Q7
type: scenario
stem: "Step 1: You write a query that joins three tables: orders → customers → countries. Step 2: Some customers have no orders, and you still want them in the result. Step 3: The query uses INNER JOIN throughout and these customers disappear. What join type should you use for the orders → customers join?"
options:
  - A: Keep INNER JOIN — missing customers are irrelevant
  - B: Change to LEFT JOIN starting from customers — preserves all customers regardless of orders
  - C: Change to RIGHT JOIN on orders — preserves all orders
  - D: Use FULL OUTER JOIN on all three tables
correct: B
explanation: "LEFT JOIN from customers to orders preserves all customer rows, showing NULL for order data when a customer has no orders. This is the standard pattern for 'find all X even if they have no Y'."
trade_offs: "LEFT JOIN produces NULLs for missing order data which your application must handle. FULL OUTER JOIN is overkill here (includes orders with no customer — likely invalid data). Starting the join chain from the table you want to preserve is the key insight."
difficulty: 3

### Q8
type: scenario
stem: "Step 1: Your query needs a running total of daily revenue. Step 2: You try: SELECT date, SUM(revenue) FROM sales GROUP BY date. Step 3: This gives daily totals, not a running cumulative sum. Step 4: Which SQL feature produces a cumulative total that grows each day?"
options:
  - A: Nested subquery with WHERE date <= outer.date
  - B: SUM(revenue) OVER (ORDER BY date ROWS UNBOUNDED PRECEDING)
  - C: Self-join with aggregation on all prior dates
  - D: GROUP BY date with ROLLUP
correct: B
explanation: "SUM() OVER (ORDER BY date ROWS UNBOUNDED PRECEDING) computes a running cumulative total. Each row's result includes the sum of all rows from the start up to the current row."
trade_offs: "A correlated subquery or self-join produces the same result but is O(n²). Window functions compute running aggregates in O(n). ROLLUP adds subtotal rows but doesn't produce cumulative sums."
difficulty: 3
