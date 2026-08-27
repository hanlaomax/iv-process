/* Danh sách chủ đề + nội dung giới thiệu (dùng cho cả trang tĩnh lẫn SEO) */
SS.topics = [
  {
    id: 'java',
    name: 'Java / Spring Boot',
    icon: '☕',
    blurb: 'Core Java · JVM · Spring · Boot · JPA',
    subtitle: 'Core Java, JVM & Concurrency, Spring Core/IoC/AOP, Spring Boot, Spring Data JPA, MVC, Security',
    intro:
      'Bộ câu hỏi phỏng vấn Java và Spring Boot cấp độ Middle: nền tảng ngôn ngữ (OOP, Collections, Generics, ' +
      'Stream API), JVM và bộ nhớ, đa luồng (thread pool, CAS, JMM), Spring IoC/DI, AOP và transaction, ' +
      'Spring Boot auto-configuration, Actuator, cùng Spring Data JPA, Spring MVC và Spring Security. ' +
      'Mỗi câu có trả lời chi tiết, phần "bản chất" để nhớ nhanh và ví dụ thực tế.',
    keywords: 'câu hỏi phỏng vấn java, phỏng vấn spring boot, spring ioc di, jvm gc, java concurrency, jpa hibernate n+1',
  },
  {
    id: 'kafka',
    name: 'Apache Kafka',
    icon: '📨',
    blurb: 'Partition · Producer/Consumer · EOS · Ops',
    subtitle: 'Fundamentals, Producer, Consumer & Rebalancing, Delivery Semantics (Exactly-Once), Operations',
    intro:
      'Câu hỏi phỏng vấn Apache Kafka cấp độ Middle: kiến trúc (topic, partition, offset, ISR, replication), ' +
      'cấu hình producer (acks, idempotence, batching), consumer group và rebalancing, các mức delivery semantics ' +
      'và exactly-once (transactions, outbox pattern), cùng vận hành (reassignment, retention, monitoring, ' +
      'Kafka Connect/Streams, Schema Registry).',
    keywords: 'câu hỏi phỏng vấn kafka, kafka partition offset, kafka exactly once, consumer rebalancing, kafka acks idempotence',
  },
  {
    id: 'aws',
    name: 'AWS',
    icon: '☁️',
    blurb: 'IAM · EC2/Lambda · S3 · VPC · Messaging',
    subtitle: 'Core & IAM, Compute (EC2/Lambda/ECS), Storage & Database (S3/RDS/DynamoDB), Networking (VPC/CloudFront), Integration & DevOps',
    intro:
      'Câu hỏi phỏng vấn AWS cấp độ Middle: IAM và mô hình phân quyền, hạ tầng toàn cầu, compute (EC2, Lambda, ' +
      'ECS/EKS, Auto Scaling), lưu trữ và cơ sở dữ liệu (S3, EBS, RDS Multi-AZ, Aurora, DynamoDB), mạng (VPC, ' +
      'subnet, Security Group, VPC Endpoint, Route 53, CloudFront, API Gateway) và tích hợp/DevOps (SQS, SNS, ' +
      'EventBridge, Step Functions, CloudFormation, CI/CD, quan sát).',
    keywords: 'câu hỏi phỏng vấn aws, aws iam role, ec2 lambda ecs, s3 rds dynamodb, vpc security group, sqs sns eventbridge',
  },
  {
    id: 'redis',
    name: 'Redis',
    icon: '⚡',
    blurb: 'Data types · Persistence · Cache · Cluster',
    subtitle: 'Data Types, Persistence & Memory, Caching Patterns, High Availability & Cluster, Advanced (Streams/Lua/ACL)',
    intro:
      'Câu hỏi phỏng vấn Redis cấp độ Middle: các kiểu dữ liệu và use case (String, Hash, List, Set, Sorted Set, ' +
      'Bitmap, HyperLogLog, Stream), persistence (RDB/AOF) và quản lý bộ nhớ (eviction, big key, latency), các mẫu ' +
      'caching (cache-aside, stampede, penetration, avalanche), tính sẵn sàng cao (replication, Sentinel, Cluster) ' +
      'và chủ đề nâng cao (pub/sub, Lua scripting, transactions, ACL).',
    keywords: 'câu hỏi phỏng vấn redis, redis data types, redis persistence rdb aof, cache aside stampede, redis cluster sentinel',
  },
  {
    id: 'sql',
    name: 'SQL',
    icon: '🗄️',
    blurb: 'Join · Index · Transaction · Design',
    subtitle: 'Fundamentals (JOIN/NULL/Subquery), Indexing & Optimization, Transactions & Locking, Schema Design, Advanced (Window/CTE/Partitioning)',
    intro:
      'Câu hỏi phỏng vấn SQL cấp độ Middle: nền tảng (các loại JOIN, logic NULL ba giá trị, subquery, GROUP BY), ' +
      'index và tối ưu truy vấn (B-tree, composite index, EXPLAIN, các mẫu slow query), giao dịch và khoá (ACID, ' +
      'isolation level, MVCC, deadlock, optimistic/pessimistic locking), thiết kế schema (chuẩn hoá, khoá, kiểu dữ ' +
      'liệu, partitioning, multi-tenancy) và nâng cao (window function, CTE đệ quy, materialized view).',
    keywords: 'câu hỏi phỏng vấn sql, sql join index, transaction isolation level, mvcc deadlock, window function cte, database schema design',
  },
  {
    id: 'microservices',
    name: 'Microservices',
    icon: '🧩',
    blurb: 'Boundary · Communication · Resilience · Observability',
    subtitle: 'Nền tảng & phân rã, Giao tiếp (sync/async, saga), Khả năng chịu lỗi, Hạ tầng & quan sát, Dữ liệu & bảo mật',
    intro:
      'Câu hỏi phỏng vấn kiến trúc Microservices cấp độ Middle: khi nào nên/không nên tách, bounded context và ' +
      'phân rã service, giao tiếp đồng bộ vs bất đồng bộ (REST/gRPC, message broker, event-driven, saga), các mẫu ' +
      'chịu lỗi (timeout, retry, circuit breaker, bulkhead), hạ tầng (API gateway, service discovery, service mesh, ' +
      'config), quan sát (correlation id, distributed tracing, SLO), cùng dữ liệu (database-per-service, CQRS, event ' +
      'sourcing, outbox) và bảo mật (JWT propagation, mTLS, BFF). Mỗi câu kèm ví dụ thực tế.',
    keywords: 'câu hỏi phỏng vấn microservices, bounded context, saga pattern, circuit breaker, api gateway, service mesh, cqrs event sourcing, distributed tracing',
  },
  {
    id: 'design-patterns',
    name: 'Design Patterns',
    icon: '📐',
    blurb: 'GoF · SOLID · Enterprise · Kiến trúc',
    subtitle: 'Creational, Structural, Behavioral (GoF), Nguyên lý (SOLID/DRY/KISS), Enterprise & Kiến trúc (Repository, DDD, Hexagonal, Clean)',
    intro:
      'Câu hỏi phỏng vấn Design Pattern cấp độ Middle: 23 mẫu GoF (Singleton, Factory, Builder, Adapter, Decorator, ' +
      'Proxy, Facade, Strategy, Observer, Template Method, Command, State, Chain of Responsibility…), nguyên lý ' +
      'thiết kế (SOLID, DRY/KISS/YAGNI, composition over inheritance, Law of Demeter), cùng các mẫu enterprise và ' +
      'kiến trúc (Repository, Unit of Work, DTO, Value Object, Aggregate/DDD, Domain Events, Specification, ' +
      'Anti-Corruption Layer, Ports & Adapters / Hexagonal, Clean Architecture). Mỗi câu nêu vấn đề nó giải quyết, ' +
      'khi nào KHÔNG nên dùng, và ví dụ thực tế trong code.',
    keywords: 'câu hỏi phỏng vấn design pattern, gof pattern, solid principles, singleton factory builder, strategy observer, repository pattern, hexagonal clean architecture, ddd aggregate',
  },
];
