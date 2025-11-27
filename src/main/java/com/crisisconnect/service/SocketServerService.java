package com.crisisconnect.service;

import com.crisisconnect.model.Message;
import com.crisisconnect.model.NetworkNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import java.io.*;
import java.net.ServerSocket;
import java.net.Socket;
import java.time.LocalDateTime;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@Service
@Slf4j
public class SocketServerService {

    @Value("${crisis.socket.port:8888}")
    private int port;

    @Autowired
    private MessageBroadcastService broadcastService;

    @Autowired
    private ObjectMapper objectMapper;

    private ServerSocket serverSocket;
    private ExecutorService executorService;
    private boolean running = false;
    private final ConcurrentHashMap<String, ClientConnection> activeConnections = new ConcurrentHashMap<>();

    @PostConstruct
    public void init() {
        executorService = Executors.newCachedThreadPool();
    }

    public void start() throws IOException {
        serverSocket = new ServerSocket(port);
        running = true;
        log.info("🚨 CrisisConnect Server started on port {}", port);

        // Accept connections in separate thread
        executorService.submit(() -> {
            while (running) {
                try {
                    Socket clientSocket = serverSocket.accept();
                    String clientId = UUID.randomUUID().toString();
                    log.info("✅ New device connected: {} from {}", clientId, clientSocket.getInetAddress());

                    ClientConnection connection = new ClientConnection(clientId, clientSocket);
                    activeConnections.put(clientId, connection);
                    executorService.submit(connection);

                } catch (IOException e) {
                    if (running) {
                        log.error("Error accepting connection", e);
                    }
                }
            }
        });
    }

    @PreDestroy
    public void stop() throws IOException {
        running = false;
        if (serverSocket != null && !serverSocket.isClosed()) {
            serverSocket.close();
        }

        // Close all client connections
        activeConnections.values().forEach(ClientConnection::close);
        activeConnections.clear();

        if (executorService != null) {
            executorService.shutdown();
        }
        log.info("🛑 CrisisConnect Server stopped");
    }

    public void broadcastMessage(Message message) {
        activeConnections.values().forEach(connection -> connection.sendMessage(message));
    }

    public int getActiveConnectionCount() {
        return activeConnections.size();
    }

    // Inner class to handle individual client connections
    private class ClientConnection implements Runnable {
        private final String clientId;
        private final Socket socket;
        private PrintWriter out;
        private BufferedReader in;
        private String userName;

        public ClientConnection(String clientId, Socket socket) {
            this.clientId = clientId;
            this.socket = socket;
        }

        @Override
        public void run() {
            try {
                in = new BufferedReader(new InputStreamReader(socket.getInputStream()));
                out = new PrintWriter(socket.getOutputStream(), true);

                // Send welcome message
                sendSystemMessage("Connected to CrisisConnect. Please identify yourself.");

                String line;
                while ((line = in.readLine()) != null) {
                    try {
                        Message message = objectMapper.readValue(line, Message.class);
                        message.setTimestamp(LocalDateTime.now());

                        if (userName == null && message.getSenderName() != null) {
                            userName = message.getSenderName();
                            log.info("User identified as: {}", userName);
                        }

                        log.info("📨 Message from {}: {}", userName, message.getContent());

                        // Broadcast to all connected clients and WebSocket
                        broadcastService.broadcastMessage(message);
                        broadcastMessage(message);

                    } catch (Exception e) {
                        log.error("Error processing message", e);
                    }
                }
            } catch (IOException e) {
                log.error("Connection error for client {}", clientId, e);
            } finally {
                cleanup();
            }
        }

        public void sendMessage(Message message) {
            try {
                if (out != null) {
                    String json = objectMapper.writeValueAsString(message);
                    out.println(json);
                }
            } catch (Exception e) {
                log.error("Error sending message to client {}", clientId, e);
            }
        }

        private void sendSystemMessage(String content) {
            Message msg = new Message();
            msg.setId(UUID.randomUUID().toString());
            msg.setSenderId("SYSTEM");
            msg.setSenderName("System");
            msg.setContent(content);
            msg.setType(Message.MessageType.SYSTEM);
            msg.setTimestamp(LocalDateTime.now());
            msg.setPriority(Message.MessagePriority.NORMAL);
            sendMessage(msg);
        }

        public void close() {
            try {
                if (socket != null && !socket.isClosed()) {
                    socket.close();
                }
            } catch (IOException e) {
                log.error("Error closing socket", e);
            }
        }

        private void cleanup() {
            activeConnections.remove(clientId);
            close();
            log.info("❌ Client disconnected: {} ({})", userName, clientId);

            // Notify others about disconnection
            Message disconnectMsg = new Message();
            disconnectMsg.setId(UUID.randomUUID().toString());
            disconnectMsg.setSenderId(clientId);
            disconnectMsg.setSenderName(userName);
            disconnectMsg.setContent(userName + " has disconnected");
            disconnectMsg.setType(Message.MessageType.SYSTEM);
            disconnectMsg.setTimestamp(LocalDateTime.now());
            disconnectMsg.setPriority(Message.MessagePriority.NORMAL);

            broadcastService.broadcastMessage(disconnectMsg);
        }
    }
}