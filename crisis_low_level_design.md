# 🔬 CrisisConnect - Low Level Design (LLD)

## 📋 Table of Contents
1. [Class Diagrams](#class-diagrams)
2. [Sequence Diagrams](#sequence-diagrams)
3. [Data Structures](#data-structures)
4. [API Contracts](#api-contracts)
5. [Threading Model](#threading-model)
6. [Error Handling](#error-handling)
7. [State Management](#state-management)

---

## 1. Class Diagrams

### 1.1 Core Domain Models

```
┌─────────────────────────────────────┐
│           Message                    │
├─────────────────────────────────────┤
│ - id: String                         │
│ - senderId: String                   │
│ - senderName: String                 │
│ - content: String                    │
│ - type: MessageType (enum)           │
│ - timestamp: LocalDateTime           │
│ - priority: MessagePriority (enum)   │
├─────────────────────────────────────┤
│ + getId(): String                    │
│ + setId(String): void                │
│ + getSenderId(): String              │
│ + setSenderId(String): void          │
│ + getSenderName(): String            │
│ + setSenderName(String): void        │
│ + getContent(): String               │
│ + setContent(String): void           │
│ + getType(): MessageType             │
│ + setType(MessageType): void         │
│ + getTimestamp(): LocalDateTime      │
│ + setTimestamp(LocalDateTime): void  │
│ + getPriority(): MessagePriority     │
│ + setPriority(MessagePriority): void │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│         MessageType (enum)           │
├─────────────────────────────────────┤
│ TEXT                                 │
│ STATUS_UPDATE                        │
│ EMERGENCY                            │
│ LOCATION                             │
│ SYSTEM                               │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│      MessagePriority (enum)          │
├─────────────────────────────────────┤
│ LOW                                  │
│ NORMAL                               │
│ HIGH                                 │
│ CRITICAL                             │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│         StatusEntry                  │
├─────────────────────────────────────┤
│ - userId: String                     │
│ - userName: String                   │
│ - status: String                     │
│ - message: String                    │
│ - timestamp: LocalDateTime           │
│ - batteryLevel: int                  │
│ - hasInternet: boolean               │
├─────────────────────────────────────┤
│ + getUserId(): String                │
│ + setUserId(String): void            │
│ + getUserName(): String              │
│ + setUserName(String): void          │
│ + getStatus(): String                │
│ + setStatus(String): void            │
│ + getMessage(): String               │
│ + setMessage(String): void           │
│ + getTimestamp(): LocalDateTime      │
│ + setTimestamp(LocalDateTime): void  │
│ + getBatteryLevel(): int             │
│ + setBatteryLevel(int): void         │
│ + isHasInternet(): boolean           │
│ + setHasInternet(boolean): void      │
└─────────────────────────────────────┘
```

### 1.2 Service Layer Classes

```
┌──────────────────────────────────────────────────────┐
│            SocketServerService                        │
├──────────────────────────────────────────────────────┤
│ - log: Logger (static final)                          │
│ - port: int                                           │
│ - broadcastService: MessageBroadcastService           │
│ - objectMapper: ObjectMapper                          │
│ - serverSocket: ServerSocket                          │
│ - executorService: ExecutorService                    │
│ - running: boolean                                    │
│ - activeConnections: ConcurrentHashMap<String,        │
│                      ClientConnection>                │
├──────────────────────────────────────────────────────┤
│ + init(): void [@PostConstruct]                       │
│ + start(): void throws IOException                    │
│ + stop(): void throws IOException [@PreDestroy]       │
│ + broadcastMessage(Message): void                     │
│ + getActiveConnectionCount(): int                     │
├──────────────────────────────────────────────────────┤
│ Inner Class: ClientConnection implements Runnable     │
│   - clientId: String (final)                          │
│   - socket: Socket (final)                            │
│   - out: PrintWriter                                  │
│   - in: BufferedReader                                │
│   - userName: String                                  │
│   + run(): void                                       │
│   + sendMessage(Message): void                        │
│   - sendSystemMessage(String): void                   │
│   + close(): void                                     │
│   - cleanup(): void                                   │
└──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│         MessageBroadcastService                       │
├──────────────────────────────────────────────────────┤
│ - log: Logger (static final)                          │
│ - messagingTemplate: SimpMessagingTemplate (final)    │
│ - messageHistory: List<Message>                       │
│ - MAX_HISTORY_SIZE: int (static final) = 1000         │
├──────────────────────────────────────────────────────┤
│ + MessageBroadcastService(SimpMessagingTemplate)      │
│ + broadcastMessage(Message): void                     │
│ + getRecentMessages(int): List<Message>               │
│ + getAllMessages(): List<Message>                     │
│ + clearHistory(): void                                │
└──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│              StatusService                            │
├──────────────────────────────────────────────────────┤
│ - log: Logger (static final)                          │
│ - messagingTemplate: SimpMessagingTemplate (final)    │
│ - statusBoard: Map<String, StatusEntry>               │
├──────────────────────────────────────────────────────┤
│ + StatusService(SimpMessagingTemplate)                │
│ + updateStatus(StatusEntry): void                     │
│ + getAllStatuses(): List<StatusEntry>                 │
│ + getStatus(String): StatusEntry                      │
│ + removeStatus(String): void                          │
│ + getActiveUserCount(): long                          │
│ + getCriticalUserCount(): long                        │
└──────────────────────────────────────────────────────┘
```

### 1.3 Controller Layer

```
┌──────────────────────────────────────────────────────┐
│         CrisisConnectController                       │
├──────────────────────────────────────────────────────┤
│ - log: Logger (static final)                          │
│ - broadcastService: MessageBroadcastService           │
│ - statusService: StatusService                        │
│ - socketServerService: SocketServerService            │
├──────────────────────────────────────────────────────┤
│ + sendMessage(Message): ResponseEntity<Message>       │
│   [@PostMapping("/api/messages")]                     │
│ + getMessages(int): ResponseEntity<List<Message>>     │
│   [@GetMapping("/api/messages")]                      │
│ + getAllMessages(): ResponseEntity<List<Message>>     │
│   [@GetMapping("/api/messages/all")]                  │
│ + updateStatus(StatusEntry):                          │
│     ResponseEntity<StatusEntry>                       │
│   [@PostMapping("/api/status")]                       │
│ + getAllStatuses(): ResponseEntity<List<StatusEntry>> │
│   [@GetMapping("/api/status")]                        │
│ + getUserStatus(String): ResponseEntity<StatusEntry>  │
│   [@GetMapping("/api/status/{userId}")]               │
│ + getStats(): ResponseEntity<Map<String, Object>>     │
│   [@GetMapping("/api/stats")]                         │
│ + health(): ResponseEntity<Map<String, String>>       │
│   [@GetMapping("/api/health")]                        │
│ + clearMessages(): ResponseEntity<Void>               │
│   [@DeleteMapping("/api/messages")]                   │
└──────────────────────────────────────────────────────┘
```

### 1.4 Configuration Classes

```
┌──────────────────────────────────────────────────────┐
│            WebSocketConfig                            │
│    implements WebSocketMessageBrokerConfigurer        │
├──────────────────────────────────────────────────────┤
│ + configureMessageBroker(MessageBrokerRegistry): void │
│ + registerStompEndpoints(StompEndpointRegistry): void │
└──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│            JacksonConfig                              │
├──────────────────────────────────────────────────────┤
│ + objectMapper(): ObjectMapper [@Bean @Primary]       │
└──────────────────────────────────────────────────────┘
```

---

## 2. Sequence Diagrams

### 2.1 User Sends Message via REST API

```
Client          Controller       BroadcastService    WebSocket    SocketServer
  |                |                    |                |              |
  |--POST /api/messages--------------->|                |              |
  |   {message}    |                    |                |              |
  |                |                    |                |              |
  |                |--broadcastMessage->|                |              |
  |                |                    |                |              |
  |                |                    |--store in list |              |
  |                |                    |                |              |
  |                |                    |--send(/topic/messages)------->|
  |                |                    |                |              |
  |                |--broadcastMessage----------------->|              |
  |                |                    |                |--broadcast-->|
  |                |                    |                |   to all     |
  |                |                    |                |   clients    |
  |<--200 OK-------|                    |                |              |
  |   {message}    |                    |                |              |
  |                |                    |                |              |
```

### 2.2 Socket Client Connection Flow

```
Client      SocketServer        ClientConnection      BroadcastService
  |              |                      |                    |
  |--connect---->|                      |                    |
  | (TCP 8888)   |                      |                    |
  |              |                      |                    |
  |              |--accept connection-->|                    |
  |              |--create thread------>|                    |
  |              |                      |                    |
  |              |                      |--new ClientConnection|
  |              |                      |                    |
  |<---------welcome message------------|                    |
  |              |                      |                    |
  |--send JSON-->|                      |                    |
  |  message     |                      |                    |
  |              |                      |--receive---------->|
  |              |                      |--parse JSON        |
  |              |                      |                    |
  |              |                      |--broadcastMessage->|
  |              |                      |                    |
  |              |                      |<--broadcast to all |
  |<---------JSON response--------------|                    |
  |              |                      |                    |
```

### 2.3 Status Update Flow

```
WebClient    Controller    StatusService    WebSocket    AllClients
  |              |               |              |             |
  |--POST /api/status---------->|              |             |
  |  {status}    |               |              |             |
  |              |--updateStatus>|              |             |
  |              |               |              |             |
  |              |               |--store status|             |
  |              |               |--set timestamp             |
  |              |               |              |             |
  |              |               |--send(/topic/status)------>|
  |              |               |              |             |
  |<-200 OK------|               |              |--broadcast->|
  |  {status}    |               |              |    to all   |
  |              |               |              |   WebSocket |
  |              |               |              |   clients   |
```

### 2.4 Server Startup Sequence

```
Main          Runner      SocketServer     ExecutorService
  |              |              |                 |
  |--start------>|              |                 |
  | SpringBoot   |              |                 |
  |              |              |                 |
  |              |--run()------>|                 |
  |              |              |                 |
  |              |              |--init()-------->|
  |              |              |--create threadpool
  |              |              |                 |
  |              |              |--start()        |
  |              |              |--ServerSocket(8888)
  |              |              |                 |
  |              |              |--submit(acceptor thread)
  |              |              |                 |
  |              |<-------------|                 |
  |<-------------|              |                 |
  |              |              |                 |
  |            [Server Ready - Listening]         |
  |              |              |                 |
```

---

## 3. Data Structures

### 3.1 Message Storage

```java
// In MessageBroadcastService
List<Message> messageHistory = new CopyOnWriteArrayList<>();

Structure:
[
  Message(id=uuid1, content="Help needed", timestamp=T1, ...),
  Message(id=uuid2, content="On my way", timestamp=T2, ...),
  Message(id=uuid3, content="Safe", timestamp=T3, ...),
  ...
  (max 1000 messages)
]

Operations:
- Add: O(1) - append to end
- Get recent(n): O(n) - subList(size-n, size)
- Clear: O(1) - clear all
- Thread-safe: Yes (CopyOnWriteArrayList)
```

### 3.2 Active Connections Map

```java
// In SocketServerService
ConcurrentHashMap<String, ClientConnection> activeConnections

Structure:
{
  "uuid-client-1": ClientConnection(socket1, user="John"),
  "uuid-client-2": ClientConnection(socket2, user="Jane"),
  "uuid-client-3": ClientConnection(socket3, user="Bob"),
  ...
}

Operations:
- Add connection: O(1) - put(clientId, connection)
- Remove connection: O(1) - remove(clientId)
- Get count: O(1) - size()
- Broadcast: O(n) - iterate all values
- Thread-safe: Yes (ConcurrentHashMap)
```

### 3.3 Status Board

```java
// In StatusService
Map<String, StatusEntry> statusBoard = new ConcurrentHashMap<>();

Structure:
{
  "user-1": StatusEntry(name="John", status="SAFE", timestamp=T1),
  "user-2": StatusEntry(name="Jane", status="NEED_HELP", timestamp=T2),
  "user-3": StatusEntry(name="Bob", status="CRITICAL", timestamp=T3),
  ...
}

Operations:
- Update status: O(1) - put(userId, statusEntry)
- Get status: O(1) - get(userId)
- Get all: O(n) - new ArrayList(values())
- Count active: O(n) - stream().filter().count()
- Thread-safe: Yes (ConcurrentHashMap)
```

---

## 4. API Contracts

### 4.1 REST API Endpoints

#### POST /api/messages
```json
Request:
{
  "senderId": "user-123",
  "senderName": "John Doe",
  "content": "Need help at location X",
  "type": "EMERGENCY",
  "priority": "CRITICAL"
}

Response: 200 OK
{
  "id": "uuid-generated",
  "senderId": "user-123",
  "senderName": "John Doe",
  "content": "Need help at location X",
  "type": "EMERGENCY",
  "priority": "CRITICAL",
  "timestamp": "2024-01-15T10:30:00"
}
```

#### GET /api/messages?limit=50
```json
Response: 200 OK
[
  {
    "id": "uuid1",
    "senderId": "user-123",
    "senderName": "John Doe",
    "content": "Message 1",
    "type": "TEXT",
    "priority": "NORMAL",
    "timestamp": "2024-01-15T10:30:00"
  },
  ...
]
```

#### POST /api/status
```json
Request:
{
  "userId": "user-123",
  "userName": "John Doe",
  "status": "NEED_HELP",
  "message": "Injured, need medical assistance",
  "batteryLevel": 45,
  "hasInternet": false
}

Response: 200 OK
{
  "userId": "user-123",
  "userName": "John Doe",
  "status": "NEED_HELP",
  "message": "Injured, need medical assistance",
  "timestamp": "2024-01-15T10:30:00",
  "batteryLevel": 45,
  "hasInternet": false
}
```

#### GET /api/stats
```json
Response: 200 OK
{
  "activeConnections": 5,
  "totalMessages": 127,
  "activeUsers": 8,
  "criticalUsers": 2,
  "timestamp": "2024-01-15T10:30:00"
}
```

### 4.2 WebSocket Protocol

#### Connection
```
Endpoint: ws://localhost:8080/ws-crisis
Protocol: STOMP over SockJS
```

#### Subscribe to Messages
```
SUBSCRIBE /topic/messages
```

#### Subscribe to Status Updates
```
SUBSCRIBE /topic/status
```

#### Message Format (received)
```json
{
  "id": "uuid",
  "senderId": "user-123",
  "senderName": "John Doe",
  "content": "Message content",
  "type": "TEXT",
  "priority": "NORMAL",
  "timestamp": "2024-01-15T10:30:00"
}
```

### 4.3 TCP Socket Protocol

#### Connection
```
Host: localhost
Port: 8888
Protocol: TCP
Format: JSON (newline-delimited)
```

#### Message Format (send)
```json
{"id":"uuid","senderId":"user-123","senderName":"John","content":"Hello","type":"TEXT","priority":"NORMAL","timestamp":"2024-01-15T10:30:00"}
```

#### Message Format (receive)
```json
{"id":"uuid","senderId":"SYSTEM","senderName":"System","content":"Welcome message","type":"SYSTEM","priority":"NORMAL","timestamp":"2024-01-15T10:30:00"}
```

---

## 5. Threading Model

### 5.1 Thread Architecture

```
┌─────────────────────────────────────────────────────┐
│               JVM Thread Pool                        │
├─────────────────────────────────────────────────────┤
│                                                      │
│  Main Thread                                         │
│    └── Spring Boot Application Context               │
│                                                      │
│  Tomcat HTTP Thread Pool (Default: 200)             │
│    ├── REST API Request Handler Threads              │
│    ├── WebSocket Connection Threads                  │
│    └── HTTP Response Writer Threads                  │
│                                                      │
│  Socket Server Thread Pool (CachedThreadPool)        │
│    ├── Acceptor Thread (1)                           │
│    │   └── Listens on port 8888                      │
│    │   └── Creates new ClientConnection              │
│    │                                                  │
│    └── ClientConnection Threads (N)                  │
│        ├── Thread-1: Client-1 Handler                │
│        ├── Thread-2: Client-2 Handler                │
│        ├── Thread-3: Client-3 Handler                │
│        └── Thread-N: Client-N Handler                │
│                                                      │
│  WebSocket Message Broker Threads                    │
│    └── STOMP Message Distribution                    │
│                                                      │
└─────────────────────────────────────────────────────┘
```

### 5.2 Thread Lifecycle

#### Acceptor Thread
```java
// Lifecycle
1. Start: Created by executorService.submit() in start()
2. Running: while(running) { accept() }
3. Blocking: serverSocket.accept() - waits for connections
4. On Connection: Creates ClientConnection, submits to pool
5. Stop: running=false, serverSocket.close()
```

#### ClientConnection Thread
```java
// Lifecycle
1. Created: When client connects to port 8888
2. Initialization:
   - Create BufferedReader for input
   - Create PrintWriter for output
   - Send welcome message
3. Running: while((line = in.readLine()) != null)
   - Read JSON line
   - Parse to Message object
   - Broadcast to all clients
4. Cleanup: On disconnect or error
   - Close socket
   - Remove from activeConnections map
   - Notify other clients
5. Terminated: Thread ends
```

### 5.3 Thread Safety Mechanisms

```java
// ConcurrentHashMap - activeConnections
- Thread-safe read/write
- No external synchronization needed
- Lock striping for performance

// CopyOnWriteArrayList - messageHistory
- Thread-safe iteration
- Writes create new copy
- Good for read-heavy workloads

// SimpMessagingTemplate - WebSocket
- Thread-safe by design
- Internal synchronization

// Synchronized blocks - None used (prefer concurrent collections)
```

---

## 6. Error Handling

### 6.1 Error Handling Strategy

```java
// SocketServerService - Connection Errors
try {
    Socket clientSocket = serverSocket.accept();
    // Process connection
} catch (IOException e) {
    if (running) {
        log.error("Error accepting connection", e);
        // Continue accepting other connections
    }
}

// ClientConnection - Message Processing Errors
try {
    Message message = objectMapper.readValue(line, Message.class);
    // Process message
} catch (Exception e) {
    log.error("Error processing message", e);
    // Continue reading next message
}

// MessageBroadcastService - Broadcast Errors
try {
    messagingTemplate.convertAndSend("/topic/messages", message);
} catch (Exception e) {
    log.error("Error broadcasting message", e);
    // Message still stored in history
}
```

### 6.2 Error Categories

| Error Type | Handling Strategy | Impact |
|------------|-------------------|--------|
| **Connection Failure** | Log and continue | Single client affected |
| **JSON Parse Error** | Log, skip message | Single message lost |
| **WebSocket Send Error** | Log, continue | Web clients miss update |
| **Socket Write Error** | Log, continue | Socket client misses update |
| **Server Bind Error** | Fatal - application stops | Cannot start |
| **OutOfMemory** | JVM crash | Entire application down |

### 6.3 Recovery Mechanisms

```
1. Client Disconnect
   └── Automatic cleanup in finally block
   └── Other clients notified
   └── Status board updated

2. Message Processing Error
   └── Log error
   └── Continue processing next message
   └── Client connection maintained

3. Broadcast Failure
   └── Message still stored in history
   └── Client can request via REST API
   └── Other channels still work

4. Port Already In Use
   └── Application startup fails
   └── User must free port or change config
```

---

## 7. State Management

### 7.1 Application State

```java
// Server State
SocketServerService {
    running: boolean           // Server running state
    serverSocket: ServerSocket // Null when stopped
    activeConnections: Map     // Empty when no clients
}

// Message State
MessageBroadcastService {
    messageHistory: List       // Persists until cleared
    size: 0-1000              // Rolling window
}

// Status State
StatusService {
    statusBoard: Map           // User statuses
    // Entries persist until explicitly removed
}
```

### 7.2 Client Connection State

```java
ClientConnection {
    States: CONNECTING → CONNECTED → DISCONNECTING → DISCONNECTED
    
    CONNECTING:
      - Socket created
      - Streams not initialized
      
    CONNECTED:
      - Streams initialized
      - Reading/writing active
      - In activeConnections map
      
    DISCONNECTING:
      - Read/write failed
      - cleanup() called
      - Streams closing
      
    DISCONNECTED:
      - Socket closed
      - Removed from map
      - Thread terminated
}
```

### 7.3 Message State Transitions

```
Message Lifecycle:

Created (in memory)
    ↓
Sent to Server (REST/Socket)
    ↓
Received by Controller/SocketServer
    ↓
Passed to BroadcastService
    ↓
Stored in messageHistory (CopyOnWriteArrayList)
    ↓
Broadcast via WebSocket → Web Clients
    ↓
Broadcast via TCP Socket → Socket Clients
    ↓
[Persists in memory until cleared or 1000 limit reached]
```

### 7.4 Status Entry State

```
StatusEntry Lifecycle:

Created by Client
    ↓
Sent to Server (POST /api/status)
    ↓
Received by Controller
    ↓
Passed to StatusService
    ↓
Timestamp added
    ↓
Stored in statusBoard (ConcurrentHashMap)
    ↓
Broadcast via WebSocket
    ↓
[Persists until user explicitly removes or updates]
```

---

## 8. Performance Characteristics

### 8.1 Time Complexity

| Operation | Complexity | Notes |
|-----------|------------|-------|
| Send Message (REST) | O(1) | Constant time |
| Broadcast to N clients | O(N) | Linear with client count |
| Get recent messages | O(M) | M = message limit |
| Update status | O(1) | HashMap put |
| Get all statuses | O(N) | N = number of users |
| Accept connection | O(1) | Socket accept |
| Parse JSON | O(M) | M = message size |

### 8.2 Space Complexity

```
Memory Usage:

Message History: O(1000) - Fixed size
    - Max 1000 messages
    - Each ~1KB average
    - Total: ~1MB

Active Connections: O(N) - N clients
    - Each connection: ~10KB
    - 100 clients: ~1MB

Status Board: O(N) - N users
    - Each status: ~1KB
    - 100 users: ~100KB

Thread Stack: O(N) - N threads
    - Default stack: 1MB per thread
    - 100 threads: ~100MB

Total Estimate (100 users): ~102MB
```

### 8.3 Scalability Limits

```
Current Design:
- Max Messages in Memory: 1000
- Max Concurrent Connections: Limited by available threads
  - CachedThreadPool: Grows as needed
  - Practical limit: ~1000-5000 connections
- Max Users on Status Board: Unlimited (until OOM)
- Network Bandwidth: Depends on hardware

Bottlenecks:
1. Memory: Message history grows linearly
2. CPU: JSON parsing for each message
3. Network: Broadcast to all clients
4. Threads: One per socket connection
```

---

## 9. Design Patterns Used

### 9.1 Creational Patterns

**Singleton (via Spring)**
- All `@Service` classes are singletons
- Single instance per application context

### 9.2 Structural Patterns

**Facade**
- `CrisisConnectController` provides simplified API
- Hides complexity of service layer

**Adapter**
- Jackson ObjectMapper adapts between JSON and Java objects

### 9.3 Behavioral Patterns

**Observer**
- WebSocket subscribers observe message broadcasts
- Status board observers get status updates

**Strategy**
- Different message types (TEXT, EMERGENCY, etc.)
- Different priority levels

**Template Method**
- Spring Boot lifecycle methods (@PostConstruct, @PreDestroy)

---

## 10. Database Schema (Future Enhancement)

Currently in-memory, but here's the schema for persistence:

```sql
-- Messages Table
CREATE TABLE messages (
    id VARCHAR(36) PRIMARY KEY,
    sender_id VARCHAR(36) NOT NULL,
    sender_name VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    type VARCHAR(50) NOT NULL,
    priority VARCHAR(50) NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    INDEX idx_timestamp (timestamp),
    INDEX idx_sender (sender_id)
);

-- Status Entries Table
CREATE TABLE status_entries (
    user_id VARCHAR(36) PRIMARY KEY,
    user_name VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL,
    message TEXT,
    timestamp TIMESTAMP NOT NULL,
    battery_level INT,
    has_internet BOOLEAN,
    INDEX idx_status (status),
    INDEX idx_timestamp (timestamp)
);

-- Active Connections Table (for tracking)
CREATE TABLE active_connections (
    client_id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36),
    user_name VARCHAR(255),
    ip_address VARCHAR(45),
    connected_at TIMESTAMP NOT NULL,
    last_activity TIMESTAMP NOT NULL
);
```

---

## 11. Configuration Properties

```properties
# Application
spring.application.name=CrisisConnect

# Server Configuration
server.port=8080                    # HTTP/WebSocket port
crisis.socket.port=8888             # TCP Socket port

# Thread Pool
spring.task.execution.pool.core-size=10
spring.task.execution.pool.max-size=50
spring.task.execution.pool.queue-capacity=100

# Logging
logging.level.com.crisisconnect=INFO
logging.pattern.console=%d{HH:mm:ss.SSS} [%thread] %-5level %logger{36} - %msg%n

# Jackson
spring.jackson.serialization.write-dates-as-timestamps=false
spring.jackson.serialization.indent-output=true

# WebSocket
spring.websocket.servlet.allowed-origins=*

# Message History
crisis.message.history.max-size=1000
```

---

This low-level design provides complete implementation details for building, understanding, and extending CrisisConnect! 🚀
