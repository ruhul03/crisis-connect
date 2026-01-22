# 🚨 CrisisConnect - Disaster Offline Messaging System

![Offline First](https://img.shields.io/badge/Offline-First-green.svg)
![PWA Ready](https://img.shields.io/badge/PWA-Ready-blue.svg)
![Local Network](https://img.shields.io/badge/Network-Local%20Only-orange.svg)

A Spring Boot-based emergency communication system designed to work **completely offline** on local networks (WiFi/Hotspot) when internet connectivity is unavailable. It features a fully functioning **Progressive Web App (PWA)** that can be installed on devices and works without external CDNs.

## 🎯 Features

-   **📶 Offline-First Design**: Works effectively on local WiFi/hotspot networks without internet access.
-   **📱 PWA Support**: Installable web app with cached resources for instant loading.
-   **📦 Zero External Dependencies**: All assets (JS libraries, Icons, Fonts) are served locally.
-   **💬 Real-time Messaging**: Instant message delivery via WebSocket (over local network).
-   **🏥 Status Board**: Live status updates (Safe, Injured, Critical) for all connected users.
-   **🚑 Emergency Alerts**: Priority emergency messaging with visual red-alert indicators.
-   **🔌 Multi-platform**: Web Dashboard (Mobile/Desktop) + Java Socket Clients.

## 📋 Architecture

```
┌─────────────────────────────┐
│      Client Devices         │
│ (Phones, Laptops, Tablets)  │
└──────────────┬──────────────┘
               │
         (WiFi / Hotspot)
               │
┌──────────────▼──────────────┐
│    CrisisConnect Server     │
│  (Running on Laptop/Pi)     │
│                             │
│  ┌───────────────────────┐  │
│  │ Spring Boot (Backend) │  │
│  └───────────┬───────────┘  │
│              │              │
│  ┌───────────────────────┐  │
│  │  Local Static Assets  │  │
│  │ (HTML/JS/CSS/Icons)   │  │
│  └───────────────────────┘  │
└─────────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites

-   Java 17 or higher
-   Maven 3.6+

### 1. Build the Project

```bash
mvn clean install
```

### 2. Run the Server

```bash
mvn spring-boot:run
```

Or run the JAR directly:

```bash
java -jar target/crisis-connect-1.0.0.jar
```

The server will start on:
-   **Web Dashboard**: `http://localhost:8080` (or server IP)
-   **WebSocket**: `ws://localhost:8080/ws-crisis`
-   **Socket Server**: `tcp://localhost:8888`

### 3. Connect Client Devices

#### A. Host a Hotspot (Recommended)
1.  **Server Device**: Create a WiFi Hotspot (e.g., SSID: `CrisisNet`, Pass: `help1234`).
2.  **Client Devices**: Connect WiFi to `CrisisNet`.
3.  **Open Browser**: Navigate to `http://<server-ip>:8080` (e.g., `http://192.168.137.1:8080`).

#### B. Install the App (PWA)
1.  On a mobile device, open the URL in Chrome/Safari.
2.  Tap **"Add to Home Screen"** or **"Install App"**.
3.  The app will now work like a native application, full-screen.

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

### WebSocket Topics (Internal)

-   `/topic/messages`: Public chat channel
-   `/topic/status`: Status updates
-   `/topic/status/removed`: Disconnection events

## 💻 Technolgies

-   **Backend**: Spring Boot 3.2, WebSocket (STOMP), Java Socket API
-   **Frontend**: HTML5, Vanilla JS, CSS3
-   **Local Libraries**: SockJS, Stomp.js, Phosphor Icons (All vendored locally)
-   **PWA**: Service Worker caching, Manifest.json

## 🛡️ Security Note

This system is designed for **emergency/disaster scenarios** where speed and connectivity are prioritized over strict authentication. It is intended for use on trusted local networks.

## 🤝 Contributing

1.  Fork the repository
2.  Create feature branch
3.  Commit changes
4.  Push to branch
5.  Create Pull Request

---

**Stay Safe! 🚨**
