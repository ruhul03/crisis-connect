# 🏗️ CrisisConnect - High Level Design (HLD)

## 1. Executive Summary

**CrisisConnect** is a specialized "Offline-First" communication platform designed for disaster scenarios where public internet infrastructure is compromised or unavailable. It functions as a "Pop-up Command Center," allowing a single laptop or device to become a local server that connects nearby smartphones via a local WiFi hotspot.

Unlike traditional messaging apps (WhatsApp, Messenger), CrisisConnect **does not require the Internet**. It relies entirely on a Local Area Network (LAN) to facilitate real-time chat, status broadcasting, and emergency alerts.

---

## 2. Problem Statement

In the immediate aftermath of natural disasters (hurricanes, earthquakes, floods) or infrastructure failures:

1.  **Internet Blackout**: ISP cables are cut, cell towers are down or overloaded.
2.  **Communication Breakdown**: Victims cannot signal safety; valid rescue requests are lost.
3.  **Chaos**: Rumors spread; there is no central "source of truth" for local status.

**The Solution**: A self-contained, deployable system that creates its own network bubble, allowing anyone within WiFi range (~100m) to communicate without an uplink to the wider world.

---

## 3. System Architecture

### 3.1 Context Diagram

The system operates as an isolated island of connectivity.

```mermaid
graph TD
    UserA[Victim A] -- WiFi --> AccessPoint
    UserB[Rescuer] -- WiFi --> AccessPoint
    UserC[Admin] -- WiFi --> AccessPoint
    
    subgraph "CrisisConnect Zone (Local Network)"
        AccessPoint[WiFi Hotspot\n(Hosted by Server Device)]
        Server[CrisisConnect Server\n(Spring Boot)]
        
        AccessPoint -- TCP/HTTP --> Server
    end
```

### 3.2 Container Diagram

The system consists of three main containers:

1.  **Spring Boot Server**: The brain. Handles message routing, state (users/statuses), and hosts the web assets.
2.  **Web Client (PWA)**: The primary interface. Served by the server, installed on user phones, runs offline.
3.  **Socket Client**: A specialized low-latency client for automated systems or legacy devices.

```mermaid
graph TB
    subgraph "User Device (Phone/Laptop)"
        WebBrowser[Web Browser]
        PWA[Progressive Web App\n(Service Worker + LocalStorage)]
        
        WebBrowser --> PWA
    end

    subgraph "Server Device"
        WebServer[Tomcat Web Server\n(Port 8080)]
        SocketServer[TCP Socket Server\n(Port 8888)]
        MsgBroker[In-Memory Message Broker]
        
        PWA -- Websocket (STOMP) --> WebServer
        SocketClient -- TCP Socket --> SocketServer
        
        WebServer --> MsgBroker
        SocketServer --> MsgBroker
    end
```

---

## 4. Key Capabilities & Design Decisions

### 4.1 📶 Offline-First Architecture

*   **Design**: The frontend is a **Progressive Web App (PWA)**.
*   **Why**: Users might connect, load the app, and then wander to the edge of the WiFi range. The app must not crash if the connection drops.
*   **Mechanism**: A Service Worker caches the "App Shell" (HTML, CSS, JS) instantly. Messages sent while disconnected are queued in `localStorage` and auto-synced when the connection is restored.
*   **Asset Bundling**: No CDNs (e.g., Google Fonts, CDNJS) are used. All libraries (SockJS, Stomp, Icons) are "vendored" (stored locally) in the `src/main/resources/static` folder.

### 4.2 💬 Real-Time Broadcasting

*   **Design**: Publisher-Subscriber (Pub/Sub) model.
*   **Technology**: WebSocket (via STOMP) for web clients; Raw TCP Sockets for Java clients.
*   **Flow**: 
    1.  User posts a message (e.g., "I need water").
    2.  Server receives it via REST (HTTP POST) for reliability or WebSocket.
    3.  Server broadcasts it to `/topic/messages`.
    4.  All connected clients receive the payload instantly.

### 4.3 🔄 Transient State Management

*   **Design**: In-Memory Storage.
*   **Why**: Speed is critical. In a disaster, long-term persistence (days/weeks) is less important than immediate responsiveness. The "Truth" is the current state of the network.
*   **Trade-off**: If the server reboots, history is lost. This is acceptable for a "Pop-up" ephemeral network. (Future version could add SQLite/H2 file persistence).

---

## 5. Typical User Flows

### 5.1 Scenario: "I am Safe" (Status Update)

1.  User connects to "CrisisConnect" WiFi.
2.  Opens Browser to `http://192.168.x.x:8080`.
3.  Front page loads instantly (cached by Service Worker).
4.  User selects status "SAFE" from dropdown.
5.  App posts JSON to `/api/status`.
6.  Server updates the **Status Board**.
7.  Server pushes update to all dashboards. Rescuers see the "Safe" green dot appear on their screens.

### 5.2 Scenario: "Network Drop" (PWA Resilience)

1.  User types "Help, trapped in basement!".
2.  WiFi signal drops before send.
3.  **App Framework**:
    *   Catches the network error.
    *   Saves message to `Queue`.
    *   Updates UI with "🕒 Pending" icon.
4.  User moves closer to the access point.
5.  **Service Worker**: Detects `online` event.
6.  **App Framework**: Replays the queued POST request.
7.  Message delivered.

---

## 6. Technology Stack

| Component | Choice | Rationale |
| :--- | :--- | :--- |
| **Backend** | Spring Boot 3.2 | Reliable, widely understood, built-in Thread Pool and WebSocket support. |
| **Frontend** | Vanilla JS + HTML5 | Lightweight, zero-build-step (easy to patch in field), no complex framework overhead. |
| **Realtime** | WebSocket (STOMP) | Standard for web-based real-time comms. Fallback to SockJS if WS blocked. |
| **Protocol** | JSON | Human readable, easy to debug. |
| **Build Tool** | Maven | Standard dependency management. |

---

## 7. Future Roadmap

1.  **Mesh Networking**: Allow phones to hop messages between each other to extend range.
2.  **Map Integration**: Offline Maps (Leaflet + Tileserver) to plot coordinates.
3.  **File Sharing**: Ability to upload photos of damage.
