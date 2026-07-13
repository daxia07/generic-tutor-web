# Consistent Hashing

## Definition
A distributed hashing technique that maps both servers and keys onto a hash ring. When a server is added or removed, only a fraction of keys need to be remapped (K/N on average), rather than all keys. Minimizes disruption during scaling events.

## Key Terms
- **Hash ring**: A circular hash space (0 to 2^32-1) where servers and keys are placed.
- **Virtual nodes (vnodes)**: Multiple positions per physical server on the ring — ensures even distribution.
- **Key remapping**: When a node is added/removed, only keys in the affected range move.
- **Hotspot**: A range of the ring receiving disproportionate key assignments.
- **Rendezvous hashing**: Alternative approach — compute hash(key + each server), pick highest. Simpler but O(N).

## Why It Matters
Any system that distributes data across nodes (databases, caches, CDNs) needs a key distribution strategy. Consistent hashing is the standard solution. Interviewers test this to see if you understand how data gets routed in distributed systems.

## Interview Questions
1. "How would you distribute user data across 100 database shards?"
2. "What happens when you add a new cache server?"
3. "Why not just use modulo hashing (key % N)?"

## Gotchas
- Modulo hashing (key % N) remaps almost ALL keys when N changes — disastrous for caches.
- Without virtual nodes, distribution is uneven — some servers get much more load.
- Consistent hashing doesn't solve the "how many vnodes" question — too few = imbalance, too many = memory overhead.
- Implementation details matter in interviews — know the ring lookup algorithm (binary search).

## Questions

### Q1
type: multiple-choice
stem: "What data structure does consistent hashing typically use to minimize data movement when nodes are added?"
options:
  - A: Binary tree
  - B: Hash ring
  - C: B-tree
  - D: Linked list
correct: B
explanation: "Consistent hashing places nodes and keys on a circular hash ring, so adding/removing nodes only affects adjacent keys."
difficulty: 2

### Q2
type: fill-in-blank
stem: "Virtual nodes (______) in consistent hashing help distribute load more evenly across physical nodes."
answers:
  - "VNodes"
  - "vnodes"
explanation: "VNodes are virtual points on the hash ring assigned to physical nodes, improving load distribution."
difficulty: 3

### Q3
type: multiple-choice
stem: "In consistent hashing, when a node is removed, its data is redistributed to which node(s)?"
options:
  - A: All nodes equally
  - B: The next node clockwise on the ring
  - C: A random node
  - D: The primary replica
correct: B
explanation: "When a node leaves, its data moves to the next node clockwise on the hash ring."
difficulty: 2

### Q4
type: fill-in-blank
stem: "In consistent hashing, without ______, a small number of physical nodes can result in uneven data distribution because some nodes receive disproportionately more key assignments."
answers:
  - "virtual nodes"
  - "vnodes"
  - "Virtual nodes"
  - "VNodes"
explanation: "Virtual nodes (vnodes) assign multiple positions on the hash ring to each physical node, ensuring more uniform data distribution. Without them, hash placement randomness can lead to hotspots."
difficulty: 2

### Q5
type: select-all
stem: "Which of the following are problems with modulo hashing (key % N) compared to consistent hashing?"
options:
  - A: Almost all keys must be remapped when a node is added or removed
  - B: It requires a sorted data structure for key lookup
  - C: Data distribution can be uneven with heterogeneous node capacities
  - D: It does not support replication
correct:
  - A
  - C
explanation: "Modulo hashing remaps nearly all keys when N changes (A), and treats all nodes as equal capacity even when they're not (C). It doesn't require sorted structures (B is wrong — it's a simple mod operation). Replication is orthogonal (D is wrong — you can replicate with any scheme)."
difficulty: 2

### Q6
type: scenario
stem: "You have a 5-node cache cluster using consistent hashing with 100 virtual nodes per physical node. Node 3 crashes. Step 1: Determine how many keys need to be remapped. Step 2: Identify where those keys go. Step 3: Assess the impact compared to modulo hashing. What happens?"
options:
  - A: All keys must be remapped equally across remaining 4 nodes
  - B: Only keys assigned to Node 3's vnodes are remapped to their next clockwise neighbors — roughly 1/5 of all keys
  - C: No keys need remapping — consistent hashing handles node loss automatically
  - D: Keys are remapped to the node with the least load
correct: B
explanation: "With consistent hashing, only keys belonging to Node 3's virtual nodes need remapping. They move to the next clockwise node on the ring. With 5 nodes, roughly 1/5 (K/N) of keys are affected. Modulo hashing would remap nearly all keys."
trade_offs: "The remaining nodes absorb Node 3's load, potentially creating a hotspot on the clockwise neighbor. Replication (placing each key on multiple nodes) mitigates this — when Node 3 fails, replicas on other nodes can serve the data without waiting for remapping."
difficulty: 3

### Q7
type: scenario
stem: "Your distributed database uses consistent hashing with 3 replicas per key (each key is stored on 3 successive nodes clockwise). You add a new Node X to the ring. Step 1: Determine which keys Node X receives. Step 2: Determine what happens to the replication ranges of existing nodes. Step 3: Decide if you need to rebalance data for existing nodes that lost their replica slot. What happens?"
options:
  - A: Node X gets only new keys — no existing data moves
  - B: Node X takes over keys from the node immediately counterclockwise to it, and existing nodes may need to drop some replica data while adding new replica ranges
  - C: All nodes must redistribute data evenly
  - D: Node X replicates all data from every existing node
correct: B
explanation: "Node X claims the key range between its counterclockwise neighbor and itself. Keys previously assigned to the next clockwise node now belong to X. For replication, the 3-successor pattern shifts — some nodes lose a replica slot for certain keys while gaining replica slots for others. This requires coordinated data movement."
trade_offs: "Adding a node triggers a ripple of replica reassignments, not just primary key movement. The data transfer can be significant. Some systems use bootstrap mode — the new node joins gradually, streaming data before accepting reads. This avoids sudden load spikes but delays full utilization."
difficulty: 4

### Q8
type: scenario
stem: "You notice that in your consistent hashing ring, Node A handles 40% of traffic while Node B handles only 10%. All physical nodes have equal capacity. Step 1: Identify the likely cause. Step 2: Propose a fix. Step 3: Evaluate whether increasing virtual node count alone solves the problem. What do you do?"
options:
  - A: The hash function is biased — switch to a uniform hash function and increase virtual nodes
  - B: Node A has more capacity — this is fine
  - C: Remove Node A from the ring
  - D: Use modulo hashing instead
correct: A
explanation: "Uneven distribution with equal-capacity nodes typically means either the hash function has bias (clusters keys in certain ring ranges) or there are too few virtual nodes. Increasing vnodes helps with random variation but cannot fix a biased hash function. You need a uniform hash function (e.g., MurmurHash, SHA-256) plus sufficient vnodes."
trade_offs: "More virtual nodes mean better distribution but more memory for ring metadata and slower ring lookups (larger sorted list). A biased hash function makes vnodes ineffective — keys still cluster. The right fix addresses both: uniform hash function + adequate vnodes (typically 100-200 per physical node)."
difficulty: 3
