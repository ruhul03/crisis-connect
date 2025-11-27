# 🚨 CrisisConnect - Disaster Offline Messaging System

A Spring Boot-based emergency communication system that enables local network communication during disasters when internet connectivity is unavailable.

## 🎯 Features

- **Offline Communication**: Works on local WiFi/hotspot networks without internet
- **Real-time Messaging**: Instant message delivery via WebSocket and TCP sockets
- **Status Board**: Live status updates for all connected users
- **Emergency Alerts**: Priority emergency messaging with visual indicators
- **Multi-threaded**: Handles multiple concurrent connections efficiently
- **Cross-platform**: Web interface + Java socket clients
- **No External Dependencies**: No cloud services or internet required

## 📋 Architecture

```
┌─────────────────┐
│  Web Dashboard  │ (WebSocket)
└────────┬────────┘
         │
┌────────▼────────────────────┐
│   Spring Boot Server        │
│  - REST API (8080)          │
│  - WebSocket (8080/ws)      │
│  - Socket Server (8888)     │
└────────┬────────────────────┘
         │
┌────────▼────────┐
│  Socket Clients │ (TCP)
│  - Mobile Apps  │
│  - Java Clients │
│  - Other Devices│
└─────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Java 17 or higher
- Maven 3.6+
- Spring Boot 3.2.0

### 1. Build the Project

```bash
mvn clean install
```

### 2. Run the Server

```bash
mvn spring-boot:run
```

Or run the JAR:

```bash
java -jar target/crisis-connect-1.0.0.jar
```

The server will start on:
- **HTTP/REST API**: `http://localhost:8080`
- **WebSocket**: `ws://localhost:8080/ws-crisis`
- **Socket Server**: `tcp://localhost:8888`

### 3. Access the Web Dashboard

Open your browser and navigate to the HTML file provided, or host it on a simple web server:

```bash
# Using Python
python -m http.server 3000

# Then open http://localhost:3000
```

### 4. Connect Clients

Run the Java socket client:

```bash
java -cp target/crisis-connect-1.0.0.jar com.crisisconnect.client.CrisisConnectClient
```

## 📡 Setting Up Local Network

### Option 1: WiFi Hotspot (Recommended)

1. **On the server device** (laptop/desktop):
   - Enable WiFi hotspot
   - Set network name: `CrisisConnect-Network`
   - Set password: `Emergency2024`
   - Note the server's IP address (e.g., `192.168.137.1`)

2. **On client devices**:
   - Connect to the hotspot
   - Update connection settings to use server IP
   - Access via web browser or socket client

### Option 2: WiFi Direct (Android)

```java
// For Android implementation
WifiP2pManager manager = (WifiP2pManager) getSystemService(Context.WIFI_P2P_SERVICE);
// Create group and share credentials
```

### Option 3: Existing WiFi Network

If WiFi is available but internet is down:
- All devices connect to the same WiFi network
- Server device runs the application
- Clients connect using server's local IP

## 🔌 API Endpoints

### REST API

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/messages` | Get recent messages |
| `POST` | `/api/messages` | Send new message |
| `GET` | `/api/status` | Get all user statuses |
| `POST` | `/api/status` | Update user status |
| `GET` | `/api/stats` | Get network statistics |

### WebSocket Topics

| Topic | Description |
|-------|-------------|
| `/topic/messages` | Real-time message broadcasts |
| `/topic/status` | Status updates |
| `/topic/status/removed` | User disconnections |

### Socket Protocol (TCP Port 8888)

Messages are JSON-formatted, one per line:

```json
{
  "id": "uuid",
  "senderId": "user-id",
  "senderName": "John Doe",
  "content": "Message text",
  "type": "TEXT|EMERGENCY|STATUS_UPDATE|SYSTEM",
  "priority": "NORMAL|HIGH|CRITICAL",
  "timestamp": "2024-01-01T12:00:00"
}
```

## 🧪 Testing

### Test with curl

```bash
# Send a message
curl -X POST http://localhost:8080/api/messages \
  -H "Content-Type: application/json" \
  -d '{
    "senderId": "test-1",
    "senderName": "Test User",
    "content": "Hello from API",
    "type": "TEXT",
    "priority": "NORMAL"
  }'

# Get messages
curl http://localhost:8080/api/messages

# Get statistics
curl http://localhost:8080/api/stats
```

### Test with Socket Client

```bash
# Compile and run client
javac src/main/java/com/crisisconnect/client/CrisisConnectClient.java
java com.crisisconnect.client.CrisisConnectClient
```

## 📱 Mobile Integration

### Android Example (Kotlin)

```kotlin
class SocketService {
    private val socket = Socket("192.168.137.1", 8888)
    private val writer = PrintWriter(socket.getOutputStream(), true)
    private val reader = BufferedReader(InputStreamReader(socket.getInputStream()))
    
    fun sendMessage(message: Message) {
        val json = Gson().toJson(message)
        writer.println(json)
    }
    
    fun receiveMessages() {
        thread {
            reader.forEachLine { line ->
                val message = Gson().fromJson(line, Message::class.java)
                // Update UI
            }
        }
    }
}
```

## ⚙️ Configuration

Edit `application.properties`:

```properties
# Server ports
server.port=8080
crisis.socket.port=8888

# Thread pool
spring.task.execution.pool.core-size=10
spring.task.execution.pool.max-size=50

# Logging
logging.level.com.crisisconnect=INFO
```

## 🛡️ Security Considerations

For disaster scenarios, authentication is simplified, but you can add:

1. **Basic Authentication**:
```java
@Bean
public SecurityFilterChain filterChain(HttpSecurity http) {
    http.httpBasic()
        .and()
        .authorizeHttpRequests()
        .anyRequest().authenticated();
    return http.build();
}
```

2. **IP Whitelisting**: Restrict to local network only
3. **Message Encryption**: Add SSL/TLS for sensitive data

## 🚀 Production Deployment

### Run as System Service (Linux)

Create `/etc/systemd/system/crisisconnect.service`:

```ini
[Unit]
Description=CrisisConnect Emergency Messaging
After=network.target

[Service]
Type=simple
User=crisisconnect
WorkingDirectory=/opt/crisisconnect
ExecStart=/usr/bin/java -jar /opt/crisisconnect/crisis-connect-1.0.0.jar
Restart=always

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable crisisconnect
sudo systemctl start crisisconnect
```

## 📊 Monitoring

Monitor the application:

```bash
# View logs
tail -f logs/crisis-connect.log

# Check connections
curl http://localhost:8080/api/stats

# Monitor threads
jstack <pid>
```

## 🔧 Troubleshooting

### Port Already in Use
```bash
# Find process using port
lsof -i :8080
lsof -i :8888

# Kill process
kill -9 <PID>
```

### Clients Can't Connect
1. Check firewall rules
2. Verify server IP address
3. Ensure devices are on same network
4. Test with `telnet <server-ip> 8888`

### WebSocket Not Connecting
- Check CORS settings
- Verify SockJS is loaded
- Check browser console for errors

## 📄 License

MIT License - Free to use for disaster relief and emergency services.

## 🤝 Contributing

This is an emergency communication tool. Contributions welcome:
1. Fork the repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Create Pull Request

## 📞 Support

For disasters and emergencies, this system is designed to work offline. Set up and test before disaster strikes!

---

**Stay Safe! 🚨**
