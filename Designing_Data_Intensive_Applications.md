
DESIGNING DATA-INTENSIVE APPLICATIONS
Martin Kleppmann — O'Reilly Media (2017)
─────────────────────────────────
COMPREHENSIVE ENGINEERING SUMMARY
Focused on Building Data-Intensive Production Applications

491 Pages Distilled	11 Chapters Covered	App Performance Focus
 
EXECUTIVE OVERVIEW

Designing Data-Intensive Applications is the definitive engineering guide for building systems where data—not compute power—is the primary bottleneck. This summary extracts every concept relevant to improving a real-world application's ability to handle data intensity: high volumes, complex models, and high velocity.

DEFINITION	A data-intensive application is one where the quantity, complexity, or rate-of-change of data is the primary challenge—not CPU cycles. The tools you choose and the architecture you design must address these three dimensions directly.

The Three Pillars of Data-Intensive Systems
Every decision in this book flows from three fundamental goals:
•	Reliability — The system should continue to work correctly even in the face of hardware faults, software errors, and human mistakes.
•	Scalability — As the system grows (in data volume, traffic, or complexity), there should be reasonable ways to deal with that growth.
•	Maintainability — Over time, different engineers will work on the system. They should all be able to work productively.

Book Structure at a Glance
Part / Chapter	Core Topic for Your App
Part I — Foundations	Data models, storage engines, encoding
Ch. 1: Reliability, Scalability, Maintainability	Framework for measuring system quality
Ch. 2: Data Models & Query Languages	Choosing the right data model for your workload
Ch. 3: Storage and Retrieval	How databases store and find data — tuning storage engines
Ch. 4: Encoding and Evolution	Safe data serialization and schema evolution
Part II — Distributed Data	Replication, partitioning, transactions, distributed pitfalls
Ch. 5: Replication	Multi-node copies — consistency vs. availability trade-offs
Ch. 6: Partitioning / Sharding	Splitting data across nodes to scale horizontally
Ch. 7: Transactions	ACID guarantees, isolation levels, preventing data corruption
Ch. 8: Trouble with Distributed Systems	Network failures, clock skew, partial failures
Ch. 9: Consistency and Consensus	Linearizability, ordering, distributed agreement
Part III — Derived Data	Batch processing, stream processing, integration
Ch. 10: Batch Processing	MapReduce, distributed file systems, offline pipelines
Ch. 11: Stream Processing	Event streams, change data capture, real-time systems
 
CHAPTER 1: Reliable, Scalable & Maintainable Applications

Before choosing any database or architecture, you need a mental framework for measuring quality. Kleppmann gives you exactly that. This chapter defines the vocabulary every data engineer needs.

1.1 — Reliability

Reliability means the system continues to work correctly—performing the correct function at the desired level of performance—even when things go wrong.

The things that can go wrong are called faults. A system that can cope with faults is called fault-tolerant or resilient. Note: a fault is not the same as a failure. A fault is a component deviating from its spec; a failure is the system as a whole stopping to provide the required service.

Types of Faults and How to Handle Them

Fault Type	Mitigation Strategy
Hardware faults (disk crash, RAM fault, power loss)	Add redundancy: RAID disks, dual power supplies, hot-swap CPUs. Modern cloud: design for software fault-tolerance rather than relying on hardware.
Software errors (bugs, runaway processes, cascading failures)	Careful design, thorough testing, process isolation, measuring and monitoring in production.
Human errors (misconfiguration, deployment mistakes)	Design for good abstractions, staging environments, easy rollback, clear telemetry, circuit breakers.

PRACTICE	Netflix's Chaos Monkey deliberately kills random production servers. The philosophy: if you can't cope with failure, you must fix that before it happens in production on its own terms.

1.2 — Scalability

Scalability is the ability of a system to cope with increased load. But first you must be able to describe load.

Describing Load — Load Parameters
Load can be described with numbers called load parameters. The best choice depends on your architecture:
•	Web server: requests per second
•	Database: ratio of reads to writes
•	Chat room: number of simultaneously active users
•	Cache: hit rate

REAL WORLD	Twitter example: The key load parameter is fan-out — how many people follow each user. Twitter's challenge is that a single tweet from a celebrity can fan out to 30 million mailboxes. They moved from a pull model (query on read) to a push model (pre-compute timelines on write) to handle this.

Describing Performance — Percentiles Are Critical
Once you have your load parameters, you can investigate what happens when load increases. There are two ways to look at this:
•	If load increases while keeping resources fixed, how is performance affected?
•	How much do you need to increase resources to keep performance unchanged?

Use PERCENTILES, not averages. The median (p50) tells you half your requests. p95 means 95% of requests are faster than that threshold. p99 and p999 catch the tail latency that customers with the most data see. Amazon found that 100ms extra latency reduced purchases by 1%; 1 second costs 16%.

Percentile	What It Means
p50 (median)	Half of all requests complete faster than this
p95	95% of requests complete faster than this — a good SLA target
p99	99% of requests faster — catches most tail latency
p999	99.9% faster — extreme but Amazon uses it for internal SLAs

Approaches for Coping with Load
Approach	When to Use
Vertical scaling (scale up)	Simple, good for early stages. Powerful single machine.
Horizontal scaling (scale out)	Stateless services are easy. Distributed state adds complexity.
Elastic scaling	Auto-add machines on load spikes. Good for variable traffic.
Manual scaling	More predictable, simpler, often preferred for databases.

1.3 — Maintainability
The majority of software cost is not in initial development, but in ongoing maintenance: fixing bugs, keeping systems operational, investigating failures, adapting to new platforms, and adding new features.

Maintainability Principle	Engineering Practice
Operability: easy for ops teams	Good monitoring, documentation, easy updates, good defaults
Simplicity: manage complexity	Avoid accidental complexity. Good abstractions hide detail.
Evolvability: easy to change	Simple/agile design, test-driven development, easy refactoring
 
CHAPTER 2: Data Models & Query Languages

The data model is the most important architectural decision you make. It determines what problems are easy, what's doable with effort, and what's simply impossible. This chapter compares relational, document, and graph models.

2.1 — Relational vs. Document Model

Relational (SQL)	Document (MongoDB, CouchDB, RethinkDB)
Schema-on-write: enforced schema	Schema-on-read: flexible, implicit schema
Strong join support	Joins are weak or emulated in app code
Great for many-to-many relationships	Great for one-to-many / tree-structured data
Normalization reduces duplication	Denormalization for locality (load whole doc at once)
ALTER TABLE for schema changes	Just start writing new fields — old code handles null
Storage: rows, heap file or clustered index	Storage: single continuous JSON/BSON document

KEY INSIGHT	The object-relational impedance mismatch: If you use an ORM to map objects to relational tables, you are constantly translating between two different representations. Document DBs often have less impedance mismatch for document-like data. But once you need many-to-many relationships, relational wins.

Schema-on-Read vs Schema-on-Write
Schema-on-read (document DBs) is like dynamic type-checking: structure is only interpreted when data is read. Schema-on-write (relational) is like static type-checking: the database enforces structure at write time.
Schema-on-read shines when: data is heterogeneous, structure is determined by external systems, or you need to iterate quickly without migrations.

Data Locality for Queries
A document is usually stored as a single continuous string. If your application needs the entire document (rendering a page), there is a performance advantage. If data is split across many tables, multiple index lookups are needed.
IMPORTANT: The locality advantage only applies if you need large parts of the document at the same time. The database must load the entire document even if you need only a small part. Keep documents small and avoid writes that increase their encoded size.

2.2 — Graph Data Models

If many-to-many relationships are very common in your data, it can become natural to model your data as a graph. Graphs consist of vertices (nodes) and edges (relationships).

Graph Database Feature	What It Enables
Any vertex can connect to any other vertex	No schema restricts relationship types
Efficient traversal both forward and backward	Find all followers/followees without multiple queries
Different labels for different relationship types	Store heterogeneous data (social graph, road network) in one store
Declarative query languages (Cypher, SPARQL)	Express complex traversals simply

Use graph databases when your data is highly interconnected — social networks, recommendation engines, fraud detection, knowledge graphs, routing problems.

2.3 — Choosing the Right Model
If your data looks like...	Use this model
Mostly one-to-many relationships (tree structure)	Document database
Many interconnected many-to-many relationships	Relational database
Everything potentially related to everything	Graph database
Analytics over large datasets with known access patterns	Relational with data warehouse / column store
 
CHAPTER 3: Storage and Retrieval

Understanding how your database stores and retrieves data is essential for choosing the right storage engine and tuning it for your workload. This chapter reveals what happens under the hood.

3.1 — The Fundamental Trade-off: Indexes

CRITICAL RULE	Indexes speed up reads but slow down writes — every index must be updated when data changes. Databases don't index everything by default. YOU must choose indexes based on your application's query patterns.

3.2 — Two Families of Storage Engines

Log-Structured Storage (LSM-Trees)
Core idea: never update a file in place. Only append to files, then merge/compact old files in the background. Used by: Cassandra, HBase, LevelDB, RocksDB, Lucene (Elasticsearch).

Concept	What It Means for Performance
Append-only writes	Sequential I/O → very fast writes, great for SSDs and HDDs
SSTables (Sorted String Tables)	Key-value pairs sorted by key → efficient range queries
Memtable	In-memory buffer where writes land first, flushed to disk when large enough
Compaction	Background merging of segments, removing outdated values
Bloom filters	Probabilistic data structure to avoid disk reads for non-existent keys

LSM-Trees are typically faster for writes. But compaction can occasionally spike read/write latency at high percentiles. Monitor for compaction pressure in Cassandra/HBase. The compaction process competes for disk I/O with your queries.

Update-in-Place Storage (B-Trees)
Core idea: the disk is divided into fixed-size pages (typically 4KB). The B-tree finds and overwrites the exact page containing the data. Used by: PostgreSQL, MySQL, Oracle, SQL Server — virtually all relational databases.

Concept	What It Means for Performance
Balanced tree structure	O(log n) reads guaranteed — 4-level tree for a 256TB database
Write-ahead log (WAL)	Durability: every modification written to log before the tree, enables crash recovery
In-place updates	Each key exists exactly once — strong transactional semantics
Transaction lock attachment	Locks can be attached directly to tree ranges for isolation
Copy-on-write (LMDB variant)	Modified page written to new location, enables concurrent reads

B-Trees vs LSM-Trees	Winner
Read performance	B-Trees (typically)
Write throughput	LSM-Trees (sequential writes)
Predictable latency	B-Trees (no compaction spikes)
Space efficiency	LSM-Trees (compaction removes duplicates)
Range queries	Both (B-Trees page-level, LSM-Trees sorted segments)
Transaction isolation	B-Trees (easier to implement range locks)
Recommendation	Benchmark with YOUR workload — no universal winner

3.3 — Index Types to Know

Index Type	When to Use
Primary key index	Always — uniquely identifies rows
Secondary index	For every column used in WHERE clauses in your queries
Clustered index (InnoDB default)	When you frequently read entire rows together — data stored in index
Covering index	Store extra columns in the index to avoid heap file lookups
Concatenated / composite index	Multi-column queries — column order matters
Multi-dimensional / R-tree	Geospatial queries (latitude + longitude simultaneously)
Full-text / fuzzy index (Lucene)	Search with typos, stemming, relevance ranking

3.4 — OLTP vs OLAP: Know Your Workload

Property	OLTP (Transaction Processing)	OLAP (Analytics)
Read pattern	Small number of records by key	Aggregate over millions of rows
Write pattern	Low-latency, random writes	Bulk ETL or event stream
Users	End users via web app	Analysts via BI tools
Dataset size	GB to TB	TB to PB
Storage engine	B-Trees or LSM-Trees	Column-oriented storage
Bottleneck	Disk seek time	Disk bandwidth

3.5 — Column-Oriented Storage for Analytics

Instead of storing all values from one row together, store all values from each column together. A query that touches only 4 out of 100 columns needs to read only 4% of the data.

Column Store Feature	Performance Benefit
Column files	Read only columns needed by a query — huge I/O savings
Bitmap encoding + run-length encoding	Compress repetitive column values by 10x or more
Vectorized processing	CPU processes compressed column data in tight loops using SIMD instructions
Sort order optimization	Primary sort column compresses best; enables range scan pruning
Multiple sort orders	Store same data sorted differently for different query patterns (Vertica)
Materialized views / OLAP cubes	Pre-compute aggregates for most-common queries

IMPORTANT	Writing to column stores is harder — use LSM-Trees for writes (all writes go to in-memory store, bulk-merged to column files). This is how Vertica works. Writes go to a row-oriented in-memory buffer; queries merge in-memory data with on-disk columns transparently.
 
CHAPTER 4: Encoding and Evolution

Applications change over time. Data must evolve safely without breaking running services. This chapter covers the serialization formats that let your app evolve without downtime.

4.1 — Why Encoding Matters for Data-Intensive Apps

Data flows between processes constantly: over the network, to/from databases, through message queues. Every boundary requires encoding (serialization) and decoding (deserialization). Choosing the wrong format causes: security vulnerabilities, version incompatibilities, data loss during schema migration, and excessive CPU/bandwidth overhead.

Rolling upgrades mean old and new code run simultaneously. You need BOTH backward compatibility (new code reads old data) AND forward compatibility (old code reads new data from newer nodes).

4.2 — Encoding Format Comparison

Format	Size / Speed	Best For
JSON	Large (81 bytes for test record)	Public APIs, human-readable interchange
XML	Very large	Legacy enterprise systems, document formats
CSV	Medium, no schema	Simple data exchange, spreadsheets
MessagePack (binary JSON)	Slightly smaller than JSON	JSON with minor space savings
Thrift BinaryProtocol	59 bytes — 27% smaller than JSON	Internal services where Thrift is already used
Thrift CompactProtocol	34 bytes — 58% smaller than JSON	Bandwidth-sensitive internal services
Protocol Buffers (protobuf)	33 bytes — 59% smaller	Google-style microservices, gRPC
Apache Avro	32 bytes — 60% smaller	Hadoop ecosystem, dynamic schema generation

4.3 — Schema Evolution with Binary Formats

Protocol Buffers / Thrift: Field Tags
Fields are identified by tag numbers (integers), not names. You can rename a field without breaking existing data. Rules for safe evolution:
•	ADD new fields: give them a new tag number. Old code that doesn't know the tag ignores it.
•	REMOVE fields: only remove optional fields. Never reuse tag numbers.
•	CHANGE types: possible but check precision. 32-bit to 64-bit is safe; 64-bit to 32-bit truncates.
•	REQUIRED fields: never make new fields required — breaks backward compatibility.

Avro: Writer's Schema and Reader's Schema
Avro has no field tags. The reader's schema and writer's schema can differ — Avro resolves by field name. For large files, embed the schema once. For databases, store schema version number with each record.

Schema Evolution Rule	Avro / Protobuf / Thrift
Add a field with a default value	Safe in all formats
Remove an optional field	Safe in all formats
Remove a required field	UNSAFE — breaks compatibility
Add a required field	UNSAFE in Protobuf/Thrift; ok in Avro if has default
Rename a field	Safe in Avro (use aliases); breaks Protobuf/Thrift encoding
Change a field type	Risky — check precision loss carefully

4.4 — Modes of Data Flow

Data Flow Mode	Compatibility Requirement
Database (app writes, later reads)	Backward compatibility — future code must read past data
REST / RPC services	Both forward and backward — rolling deploys require both
Message queues (async messaging)	Both — producers and consumers may be at different versions

CRITICAL	Data outlives code. A database may have records written 5 years ago still in the original schema. Your app must be able to read them. Use Avro/Protobuf with schema evolution rules — never language-specific serialization (Java Serializable, Python pickle).
 
CHAPTER 5: Replication

Replication means keeping a copy of the same data on multiple machines. It provides: reduced latency (geodistributed), high availability (survive node failures), and increased read throughput. The difficulty is handling changes to replicated data.

5.1 — Leader-Based Replication (Most Common)

One node is the leader (master/primary). All writes go to the leader. The leader sends the data change to followers (replicas/standby) as part of a replication log. Followers can serve reads.

Replication Mode	Trade-offs
Synchronous replication	Guaranteed durable writes, but write latency increases. If follower fails, leader blocks.
Asynchronous replication	Low write latency, but data may be lost if leader fails before replication.
Semi-synchronous (one sync follower)	Best of both: one replica guaranteed up-to-date, others async.

Handling Node Outages
Scenario	Recovery Strategy
Follower failure	Catch-up recovery: follower reconnects, replays missed changes from leader's replication log.
Leader failure (failover)	One follower promoted to leader. Clients reconfigured. Risk: async replica may lose recent writes.
Split-brain during failover	Two nodes think they're leader. Must detect and shut down old leader (fencing/STONITH).

5.2 — Replication Lag Problems (Eventual Consistency)

In async replication, followers may lag behind the leader. This creates temporary inconsistencies that require application-level compensating logic. These are not bugs — they are inherent trade-offs of async replication.

Anomaly	Cause	Fix
Read your own writes	You write to leader, read from lagging follower — see old data
Monotonic reads	Two reads go to different replicas — see data go backwards in time
Consistent prefix reads	Causally linked writes appear out of order on replica

5.3 — Multi-Leader and Leaderless Replication

Strategy	Use Case & Risk
Multi-leader (CouchDB, MySQL multi-master)	Multi-datacenter deployments. Conflict resolution required (last-write-wins, merge, custom logic).
Leaderless (Dynamo, Cassandra, Riak)	High availability, any node accepts writes. Reads quorum (r) + writes quorum (w) where w+r > n.

IMPORTANT	Write conflicts in multi-leader replication must be resolved. Last-write-wins (LWW) using timestamps loses data. CRDT (conflict-free replicated data types) and vector clocks provide safe merge semantics. Choose your conflict resolution strategy carefully.
 
CHAPTER 6: Partitioning (Sharding)

Partitioning (also called sharding) means splitting a large dataset across multiple nodes so each partition can be handled independently. The goal: spread load evenly. The challenge: avoid hot spots.

6.1 — Partitioning Strategies

Strategy	How It Works & Trade-offs
Partition by key range (e.g. HBase, Bigtable)	Keys sorted and divided into ranges. Enables efficient range queries. Risk: hot spots on sequential keys (e.g. timestamps).
Partition by hash of key (e.g. Cassandra, MongoDB)	Hash distributes keys uniformly. Eliminates hot spots. Destroys key ordering — no efficient range queries.
Compound partition key (Cassandra)	Hash on first part of key, sort on second part. Range queries on second part within one partition.

Handling Hot Spots
If one key is extremely 'hot' (e.g. a celebrity's Twitter account with millions of followers), hashing doesn't help — all requests go to one partition. Solution: add a random prefix or suffix to the key (split writes across N partitions), then aggregate on read.

6.2 — Partitioning & Secondary Indexes

Approach	How It Works
Document-based partitioning (local indexes)	Each partition maintains its own secondary index for only its data. Writes are local. Reads must query all partitions (scatter/gather) — expensive.
Term-based partitioning (global indexes)	Index itself is partitioned by index term. Reads are efficient. Writes update multiple partitions — more complex writes.

6.3 — Rebalancing Partitions

As load grows, you need to move partitions between nodes. Strategies:
•	Fixed number of partitions: create many more partitions than nodes. On new node, steal whole partitions. Simple but partition count fixed forever (Riak, Elasticsearch default).
•	Dynamic partitioning: split large partitions, merge small ones (HBase, RethinkDB). Adapts to data size.
•	Partitioning by nodes: fixed number of partitions per node. Adding nodes splits existing partitions proportionally (Cassandra, Ketama).

Avoid fully automatic rebalancing — it can generate significant network load at the wrong time, making a partial failure worse. Require human approval for rebalancing operations.

6.4 — Request Routing
With partitioned data, how does a request find the right node?
Routing Strategy	Example
Client contacts any node; node forwards	Cassandra gossip protocol
Partition-aware routing tier (load balancer)	Standalone routing process knows partition assignment
Client knows partition assignment directly	Client library tracks partition map — lowest latency
 
CHAPTER 7: Transactions

Transactions group reads and writes into one logical unit that either succeeds (commit) or fails and is rolled back (abort). Without transactions, you must handle partial failure, concurrency races, and corruption manually.

7.1 — ACID Properties

Property	What It Guarantees
Atomicity	If any part of a multi-write transaction fails, all writes are rolled back. Nothing is partially applied.
Consistency	The database transitions from one valid state to another. Application invariants are maintained.
Isolation	Concurrent transactions are executed as if they ran serially — one at a time.
Durability	Once committed, data survives crashes. Written to disk (WAL + replication for distributed durability).

WARNING	'Consistency' in ACID is about application-level data validity. 'Consistency' in distributed systems (eventual consistency, linearizability) is a completely different concept. This terminology confusion causes real engineering mistakes.

7.2 — Isolation Levels (Most Important for Apps)

Full isolation (serializability) is too expensive for most workloads. Databases offer weaker isolation levels — each prevents some race conditions but allows others.

Isolation Level	Prevents	Allows
Read Uncommitted	Nothing	Dirty reads, non-repeatable reads, phantom reads
Read Committed (PostgreSQL default)	Dirty reads	Non-repeatable reads, phantoms
Snapshot Isolation / Repeatable Read	Dirty reads, non-repeatable reads	Phantoms, write skew
Serializable (strongest)	All race conditions	Nothing — full ACID

Race Conditions You Must Prevent
Race Condition	Description & Solution
Dirty read	Transaction reads uncommitted data from another in-flight transaction. Fix: read committed isolation.
Dirty write	Transaction overwrites another's uncommitted write. Fix: row-level locks.
Non-repeatable read	Reading the same row twice in one transaction returns different values. Fix: snapshot isolation.
Lost update	Two concurrent read-modify-write cycles overwrite each other. Fix: atomic operations, explicit locking, or CAS.
Write skew	Both transactions read same data, make decisions, each write is valid alone but together violate invariant. Fix: serializable isolation.
Phantom reads	A query for rows matching a condition sees different results in two reads due to concurrent insert. Fix: predicate locks, index-range locks.

7.3 — Implementing Serializability

Approach	How It Works & When to Use
Actual serial execution (VoltDB, Redis)	Single-threaded, execute one transaction at a time. Works when transactions fit in memory and throughput fits on one CPU core.
Two-Phase Locking (2PL)	Readers block writers, writers block readers. Strong isolation. But deadlocks possible. Standard in MySQL InnoDB.
Serializable Snapshot Isolation (SSI)	Optimistic: detect conflicts at commit time. Better for read-heavy workloads. Used in PostgreSQL 9.1+, FoundationDB.

RECOMMENDATION	For most data-intensive apps: Use snapshot isolation (MVCC) for read-heavy workloads. Add explicit locking (SELECT FOR UPDATE) for critical read-modify-write cycles. Use serializable isolation sparingly — only where you need write skew prevention and performance permits.
 
CHAPTER 8: The Trouble with Distributed Systems

Distributed systems fail in ways that single-machine systems never do. Understanding these failure modes is essential for building reliable data-intensive applications. This chapter is a reality check on what you can and cannot assume.

8.1 — Unreliable Networks

When you send a packet over the network, you don't know if it was delivered, if the response was lost, or if the remote node is slow. You cannot distinguish between a dead node, a slow node, and a delayed network packet. Timeouts are your only tool — and they are imprecise.

Network Failure Mode	What Can Happen
Request lost	Packet dropped by router or network switch
Request queued	Network or receiver overloaded — arrives after a long delay
Remote node crashed	No response at all
Remote node slow	Takes 30s to respond — looks like a crash
Response lost	Node processed your request but reply was dropped
Response delayed	Reply arrives after you timed out and retried

Timeouts: No Perfect Value
Too short: false alarms — declare healthy nodes dead and trigger unnecessary failovers. Too long: users wait too long for a confirmed failure. Solution: measure round-trip time distribution (p99) and set timeout accordingly. Use exponential backoff with jitter.

8.2 — Unreliable Clocks

Each machine has its own clock (quartz oscillator) that drifts. NTP synchronization typically achieves ±100ms accuracy on the open internet — occasionally much worse.

Clock Hazard	Impact on Your App
Clock drift (up to 200ppm)	Two machines can have clocks that differ by many milliseconds over hours
NTP jumps backwards	Time-of-day clock can appear to go backwards — breaks duration measurements
Leap seconds	A minute can be 61 or 59 seconds — crashes systems assuming exactly 86,400 seconds/day
Virtual machine clock suspension	VM paused for tens of ms while hypervisor runs — your app can't tell

CRITICAL	NEVER use timestamps for ordering distributed events. Last-write-wins (LWW) with wall-clock timestamps silently drops writes from nodes with slow clocks. Use logical clocks (Lamport timestamps, version vectors) to capture causality instead.

8.3 — Process Pauses
A process can be paused for unexpected lengths of time: garbage collection (GC pause), VM migration, OS context switches, paging to disk. During a pause, the process may hold a lock or believe it is the leader — causing correctness violations.

Solution: Use fencing tokens — a monotonically incrementing token issued with each lock. The storage server rejects writes with a token lower than the last seen. This prevents a paused process's outdated lock from corrupting data even after it resumes.

8.4 — The Truth is Defined by the Majority
A node cannot know if it is the leader — it only knows what messages it receives. To avoid split-brain:
•	Use a quorum (majority vote) to decide truth in distributed systems
•	Use leader election protocols (Raft, Zab) rather than manual failover
•	Protect shared resources with fencing tokens, not timing assumptions
 
CHAPTER 9: Consistency and Consensus

After understanding what can go wrong (Ch. 8), we need the tools to build correct distributed systems. This chapter covers the strongest consistency guarantees and how to achieve consensus across distributed nodes.

9.1 — Consistency Guarantees Spectrum

Consistency Model	Guarantee
Eventual consistency (weakest)	Replicas will eventually converge if writes stop. No ordering guarantee.
Read-your-own-writes	After writing, you always see your own write on subsequent reads.
Monotonic reads	You never see older data than you saw in a previous read.
Consistent prefix reads	You see data in the order it was written.
Linearizability (strongest)	Behaves as if there is only one copy of the data, and all operations are atomic.

9.2 — Linearizability

Linearizability is the strongest single-object consistency guarantee. It means the system appears to have a single copy of the data, and every operation appears to take effect atomically at some point between its invocation and completion.

What Requires Linearizability	Why
Leader election	Only one leader must exist at a time — requires consensus
Distributed locks	A lock held by one process cannot be held by another
Uniqueness constraints	No two users can have the same username at registration
Cross-channel coordination	File uploaded to S3, message sent via queue — queue reader must see the file

KEY CONCEPT	The CAP Theorem: In the presence of a network partition, you must choose between Consistency (linearizability) and Availability. Most databases choose consistency + partition tolerance (CP) and sacrifice availability during partitions. Dynamo-style databases choose availability + partition tolerance (AP).

9.3 — Ordering and Causality

Causality means: if event A caused event B, then A must appear before B everywhere. Causality is weaker than linearizability but sufficient for most applications — and it's achievable with better performance.

Ordering Mechanism	How It Works
Sequence numbers / Lamport timestamps	Each node generates monotonically increasing numbers. Not causally consistent across nodes without extra coordination.
Total order broadcast	A protocol to deliver messages in the same order to all nodes. Equivalent to consensus.
Version vectors	Track which writes each node has seen. Detect concurrent writes (conflicts).

9.4 — Distributed Consensus

Consensus: get several nodes to agree on a value. Required for leader election, atomic commit, membership management. Key properties: uniform agreement (all nodes decide same value), integrity (only proposed values chosen), termination (eventually reaches decision).

Consensus Algorithm	Used In
Paxos	Foundational; complex to implement correctly
Raft (simpler Paxos variant)	etcd, CockroachDB, TiKV, Consul
Zab (ZooKeeper Atomic Broadcast)	Apache ZooKeeper
Viewstamped Replication	Academic; basis for VoltDB

Use ZooKeeper, etcd, or Consul for distributed coordination tasks (leader election, service discovery, distributed locks, membership). Don't implement your own consensus algorithm. These services are well-tested and the failure modes are well-understood.
 
CHAPTER 10: Batch Processing

Batch processing runs jobs over large datasets periodically (not in real-time). It's the foundation of data pipelines, ML feature engineering, analytics aggregation, and building search indexes.

10.1 — Unix Pipeline Philosophy

The Unix design philosophy is the ancestor of all batch processing systems. It teaches the core principles:
•	Make each program do one thing well
•	Expect the output of every program to become the input to another
•	Uniform interface: stdin/stdout with text streams
•	Programs are stateless — side effects go to output, not state

A log analysis pipeline like: cat access.log | awk '{print $7}' | sort | uniq -c | sort -rn | head -n 5 — reads an entire file, processes it in parallel, and produces a result. MapReduce generalizes this to a distributed cluster.

10.2 — MapReduce

MapReduce is the distributed generalization of the Unix pipeline. Map: apply a function to each record, emit key-value pairs. Reduce: collect all values for the same key, process them.

MapReduce Concept	What It Does
Map function	Called once per input record. Emits zero or more (key, value) pairs. Pure function — no side effects.
Shuffle	Sort and group all values by key across all mappers. Values for same key go to same reducer.
Reduce function	Called once per unique key with all its values. Produces output records.
Fault tolerance	Tasks written to disk between stages. Retry failed tasks transparently.
Distributed filesystem (HDFS)	Input/output stored on distributed filesystem across many nodes.

10.3 — MapReduce Joins

Join Type	How It Works
Sort-merge join (reduce-side)	Both datasets sorted and merged at reducer. Handles any size. High network I/O.
Broadcast hash join (map-side)	Small dataset loaded into hash map in memory on each mapper. Very fast. Small dataset must fit in RAM.
Partitioned hash join (map-side)	Both datasets partitioned by join key. Each mapper handles matching partitions. Fast for large datasets if partitioned the same.

10.4 — Beyond MapReduce: Dataflow Engines

MapReduce is verbose (must be expressed as map/reduce) and forces intermediate results to disk between every stage. Modern systems (Spark, Tez, Flink) allow arbitrary dataflow operators chained together, keeping data in memory across stages.

Dataflow Engine	Key Advantage
Apache Spark	In-memory pipelines, RDDs, DataFrames. Much faster than MapReduce for iterative algorithms (ML).
Apache Flink	True streaming + batch. Stateful stream processing at scale.
Apache Tez	DAG execution engine underlying Hive. Replaces MapReduce in Hadoop.

IMPORTANT	Batch processing outputs: key-value stores (build a new database from computed results), search indexes (Lucene segments), materialized views, recommendation systems, ML models. The output of a batch job is a new dataset — treat it as immutable.
 
CHAPTER 11: Stream Processing

Stream processing is like batch processing, but for an unbounded stream of events rather than a fixed dataset. It allows near-real-time processing — results updated within seconds or milliseconds of an event occurring.

11.1 — Messaging Systems

Messaging Pattern	Description & Trade-offs
Direct messaging (UDP, HTTP webhooks)	Low overhead. No delivery guarantee. Producer and consumer must be online simultaneously.
Message broker (queue-based)	Broker stores messages. Decouples producer and consumer. Messages deleted after acknowledgment. Traditional: RabbitMQ, ActiveMQ.
Partitioned log (Kafka, Kinesis)	Append-only log partitioned across brokers. Consumers track offset. Messages retained for configurable period. Multiple consumers can independently replay the same stream.

11.2 — Why Kafka-Style Logs Are Powerful

A partitioned log combines the durability of a database with the low-latency messaging of a message broker. Consumers can rewind and replay — ideal for replaying to a new downstream system, recovering from bugs, or feeding multiple independent consumers.

Kafka Concept	Engineering Benefit
Topics as partitioned append-only logs	Write throughput scales by adding partitions
Consumer groups / offset tracking	Each consumer independently tracks its position — replay any time
Message retention (days/weeks)	New consumers can process entire history; bugs can be fixed by rewinding
Compacted topics	Keep only the latest value per key — acts like a database table

11.3 — Change Data Capture (CDC)

Change Data Capture observes writes to a database and extracts them as a stream of change events. This keeps derived systems (search indexes, caches, analytics) in sync with the source of truth.

CDC Tool	Source Database
Debezium	PostgreSQL, MySQL, MongoDB, SQL Server (via Kafka)
Maxwell	MySQL binlog → Kafka
AWS DMS	RDS, Aurora → Kinesis
Logical replication (PostgreSQL native)	PostgreSQL → any consumer via replication slot

BEST PRACTICE	CDC is the correct way to keep caches, search indexes, analytics warehouses, and microservices in sync with your primary database. It is far more reliable than dual-writes (writing to both DB and cache simultaneously), which silently diverges on failure.

11.4 — Event Sourcing

Event sourcing stores all changes to application state as a sequence of events. The current state is derived by replaying events. This is different from CDC: with event sourcing, events are the primary source of truth; with CDC, events are derived from database mutations.

Event Sourcing Benefit	Engineering Value
Complete audit log	Every state change is recorded with full context — regulatory compliance, debugging
Temporal queries	Reconstruct state at any point in time by replaying events up to that timestamp
Multiple projections	Different read models (views) from the same event stream — no schema lock-in
Event-driven microservices	Services communicate via events rather than synchronous RPC

11.5 — Stream Processing Concepts

Concept	What It Enables
Windowing (tumbling, hopping, session)	Group events by time window. Count events in last 5 min, compute rolling average, detect session breaks.
Watermarks	Track progress of event time. Decide when to emit window results despite late-arriving events.
Stream joins (stream-stream)	Correlate events from two streams within a time window. Detect related events across sources.
Stream-table joins	Enrich streaming events with lookup data from a table (static or slowly-changing).
Stateful stream processing	Maintain state across events. Count per user, running average, last-seen value.

Event Time vs Processing Time
Event time: when the event occurred (embedded in the event). Processing time: when the system processes it. For accurate analytics, use event time. Handle late events with watermarks and allow a configurable late-data window.

Stream Processing Engine	Key Strengths
Apache Flink	True event-time, stateful, exactly-once semantics, batch+stream unified
Apache Kafka Streams	Library (no separate cluster), stateful, joins, windowing — built on Kafka
Apache Spark Streaming / Structured Streaming	Micro-batch (100ms–1s latency), integrates with Spark ML
Apache Samza	Kafka-native, stateful, LinkedIn's production system

IMPORTANT	Fault tolerance in stream processing: exactly-once semantics require idempotent writes OR transactions (atomic write of output + offset checkpoint). Kafka Streams uses changelog topics. Flink uses distributed snapshots (Chandy-Lamport algorithm). Choose your guarantee based on your application's tolerance for duplicate processing.
 
ARCHITECTURE PATTERNS FOR DATA-INTENSIVE APPS

The following patterns synthesize the book's recommendations into concrete architectural decisions for building or improving a data-intensive application.

Pattern 1: The Lambda Architecture

Combine batch processing (high accuracy, handles all data) with stream processing (low latency, approximate results). Queries merge results from both layers.

Layer	Role
Batch layer (Spark/Hadoop)	Processes all historical data. Output: accurate, complete. Latency: hours.
Speed layer (Kafka Streams/Flink)	Processes only recent events. Output: approximate, low-latency. Covers recency gap.
Serving layer (Druid, Cassandra)	Merges batch and speed views. Answers queries from both.

ALTERNATIVE	Downside: Lambda requires maintaining two separate codebases for the same logic. The Kappa architecture simplifies by using only the stream processing layer with a long-retention log (Kafka) — replay the entire history through the stream processor when you need to reprocess.

Pattern 2: The Derived Data Architecture

Treat all read models, caches, search indexes, and analytics as derived views of a primary write-ahead log. The log is the source of truth. Derived data can always be rebuilt from the log.
Component	Role
Primary database (PostgreSQL, MySQL)	Source of truth. Durability, transactions, ACID.
Change data capture (Debezium)	Streams all changes as events to Kafka
Kafka (event log)	Durable, replayable log — the integration hub
Elasticsearch (derived)	Search index built from the CDC stream
Redis (derived)	Cache built from CDC stream
Data warehouse (Redshift/BigQuery) (derived)	Analytics, built from CDC stream via ETL
Notification service	Reacts to CDC events to send emails/pushes

Pattern 3: CQRS — Command Query Responsibility Segregation

Separate the write model (commands, normalized, ACID) from the read model (queries, denormalized, optimized for access patterns). Each can scale and evolve independently.
Side	Characteristics
Write side (command)	Normalized schema, ACID transactions, validation, events emitted on success
Read side (query)	Denormalized, pre-joined, optimized for specific queries, eventually consistent with write side

Pattern 4: Immutable Event Log as Source of Truth

Instead of updating rows in place, append events to an immutable log. Current state is derived by applying all events. Benefits: complete audit trail, easy replay for new features, temporal queries, multiple projections.
Design Choice	Impact
Immutable append-only events	No update anomalies, easy audit, concurrent readers never blocked
Derived mutable state	Current state materialized for fast reads, rebuilt on demand
Schema evolution	Old events preserved as-is; new projections interpret them differently
Debug & replay	Reproduce any past state exactly by replaying event history
 
DECISION GUIDE: Choosing the Right Tool

Storage Engine Selection

Scenario	Recommended Engine	Why
High write throughput, SSD	Cassandra / RocksDB (LSM)	Sequential writes, high throughput
Low latency reads, ACID	PostgreSQL / MySQL (B-Tree)	Consistent reads, strong transactions
Analytics over large datasets	Redshift / BigQuery / ClickHouse	Column-oriented, vectorized
Full-text search	Elasticsearch / OpenSearch	Inverted index, relevance ranking
Graph relationships	Neo4j / Amazon Neptune	Traversal optimized
Session/cache	Redis / Memcached	In-memory, sub-millisecond
Time series	InfluxDB / TimescaleDB	Optimized for time-ordered inserts

Consistency vs. Availability Trade-off

If you need...	Choose...
Strong consistency (single source of truth)	PostgreSQL, CockroachDB, Spanner (CP systems)
High availability (survive datacenter failure)	Cassandra, DynamoDB, Riak (AP systems)
Multi-region writes with conflict resolution	CockroachDB, Spanner, DynamoDB Global Tables
Leader election / distributed locks	ZooKeeper, etcd, Consul

Data Pipeline Architecture Choices

Need	Solution
Keep cache in sync with DB	CDC (Debezium) → Kafka → Redis consumer
Keep search index in sync	CDC → Kafka → Elasticsearch consumer
Analytics pipeline from production DB	CDC → Kafka → data warehouse (Redshift/BigQuery)
Real-time metrics / dashboards	Kafka Streams or Flink with windowed aggregations
Microservice event-driven communication	Kafka topics as service integration bus
Audit log / compliance	Event sourcing with immutable event store
ML feature store	Batch processing (Spark) → feature store (Feast, Tecton)

Scaling Decision Tree

Problem	First Step
Reads are slow	Add read replicas; add caching layer; add secondary indexes
Writes are slow	Batch writes; use async processing; move to LSM-tree DB
Database CPU high on queries	Add indexes; move analytics to data warehouse; add read replicas
Single node can't hold all data	Partition/shard the database; use distributed DB
Need to survive node failures	Add replication; use quorum-based distributed DB
Need to survive datacenter failure	Multi-region replication; active-active or active-passive
Queries are complex aggregations	Move to column store; pre-compute with batch jobs
 
COMMON MISTAKES AND HOW TO AVOID THEM

Mistake	Correct Approach
Using wall-clock timestamps for ordering in distributed systems	Use logical clocks (Lamport timestamps) or vector clocks to capture causality
Dual-writes (writing to DB and cache/index simultaneously)	Use CDC from DB as the single authoritative change stream
Assuming at-most-once delivery in message systems	Design consumers to be idempotent — exactly-once requires explicit tracking
Using language-specific serialization (Java Serializable, pickle)	Use schema-based binary formats (Protobuf, Avro) with evolution rules
SELECT * queries in analytics workloads on row-oriented DB	Use column-oriented storage or project only needed columns
Indexing every column 'just in case'	Index only columns used in WHERE/JOIN — every index slows writes
Unbounded in-memory state in stream processing	Use windowed state with TTL; use persistent state backends (RocksDB in Flink)
Trusting clocks for distributed lock timeouts	Use fencing tokens; locks expire at the lock manager, not by wall clock
Full table scans for analytic queries on OLTP database	Move analytics to a read replica, data warehouse, or OLAP system
Manual failover for leader election	Use Raft/Paxos-based consensus (etcd, ZooKeeper) for automatic, safe failover
Ignoring replication lag in read-your-own-writes scenarios	Route reads immediately after writes to leader; use replication position tracking
Using eventual consistency where linearizability is required	Identify operations that need strong consistency (locks, unique constraints) and use CP storage
 
ESSENTIAL GLOSSARY

Term	Definition
ACID	Atomicity, Consistency, Isolation, Durability — transaction properties
B-Tree	Balanced tree index structure used in most relational databases. Update-in-place.
BASE	Basically Available, Soft state, Eventual consistency — the NoSQL alternative to ACID
Bloom filter	Probabilistic data structure that can tell you a key definitely does NOT exist — saves disk reads in LSM-trees
CAP theorem	Can only guarantee 2 of: Consistency, Availability, Partition tolerance
CDC (Change Data Capture)	Observing database write stream and publishing it as events
Compaction (LSM-Trees)	Background process merging sorted string table segments, removing duplicates
CRDT	Conflict-free Replicated Data Type — data structures that can merge concurrently without conflicts
ETL	Extract, Transform, Load — moving data from OLTP systems to data warehouses
Fencing token	Monotonically increasing number used to invalidate stale locks in distributed systems
LSM-Tree	Log-Structured Merge-Tree — append-only storage engine optimized for writes
Linearizability	Strongest consistency model — system appears as single copy with atomic operations
MVCC	Multi-Version Concurrency Control — readers don't block writers; each sees a consistent snapshot
OLAP	Online Analytical Processing — complex queries over large datasets for business intelligence
OLTP	Online Transaction Processing — low-latency reads/writes for user-facing applications
Partitioning / Sharding	Splitting data across multiple nodes, each responsible for a subset
Quorum	Minimum number of nodes that must agree (w nodes write, r nodes read, require w+r > n)
Raft / Paxos	Consensus algorithms for distributed leader election and log replication
Replication lag	Delay between leader receiving a write and followers applying it
Schema evolution	Ability to change data schema without breaking existing readers/writers
Serializable isolation	Strongest isolation level — concurrent transactions behave as if executed serially
Snapshot isolation (MVCC)	Each transaction sees a consistent snapshot of the database at start time
SSTable	Sorted String Table — segments with key-value pairs sorted by key, used in LSM-Trees
Total order broadcast	Reliable broadcast where all nodes receive all messages in the same order
Two-phase commit (2PC)	Atomic commit protocol for distributed transactions
Vector clock	Data structure to track causality across distributed nodes
WAL (Write-Ahead Log)	Append-only log written before modifying B-Tree pages — enables crash recovery
Watermark (stream processing)	Threshold declaring all events with timestamp < T have been received
Write amplification	One logical write requires multiple physical writes (index updates, compaction)
 
QUICK REFERENCE: Key Numbers to Know

Metric	Typical Value / Rule of Thumb
L1 cache access	~1ns
Main memory access	~100ns
SSD random read	~100µs (100,000ns)
HDD seek + read	~10ms (10,000,000ns)
Network round trip same DC	~0.5ms
Network round trip cross-region	~150ms
B-Tree height for 1TB database (4KB pages)	~4-5 levels
Typical compaction amplification (LSM)	10-30x write amplification
Kafka partition throughput	~100MB/s write per partition
PostgreSQL MVCC snapshot overhead	Negligible for short transactions
Typical NTP accuracy (internet)	±100ms, occasional spikes to ±1s
GC pause (JVM, old gen)	10ms-10s depending on heap size and GC algorithm
Flink checkpoint interval (recommended)	10-60 seconds for most workloads
Cassandra quorum write (w=2, r=2, n=3)	Tolerates 1 node failure with strong consistency
Amazon: 100ms extra latency	~1% reduction in purchases
Amazon: 1 second extra latency	~16% reduction in purchases

This document summarizes Designing Data-Intensive Applications by Martin Kleppmann
O'Reilly Media, 2017 | ISBN: 978-1-491-90309-4
For full depth including research references, code examples, and diagrams — read the original.




