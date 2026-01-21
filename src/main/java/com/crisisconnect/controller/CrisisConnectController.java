package com.crisisconnect.controller;

import com.crisisconnect.model.Message;
import com.crisisconnect.model.StatusEntry;
import com.crisisconnect.service.MessageBroadcastService;
import com.crisisconnect.service.SocketServerService;
import com.crisisconnect.service.StatusService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.net.InetAddress;
import java.net.NetworkInterface;
import java.util.Enumeration;

@RestController
@RequestMapping("/api")
@CrossOrigin(originPatterns = "*")
@Slf4j
public class CrisisConnectController {

    @Autowired
    private MessageBroadcastService broadcastService;

    @Autowired
    private StatusService statusService;

    @Autowired
    private SocketServerService socketServerService;

    // Send a new message
    @PostMapping("/messages")
    public ResponseEntity<Message> sendMessage(@Valid @RequestBody Message message) {
        message.setId(UUID.randomUUID().toString());
        message.setTimestamp(LocalDateTime.now());

        // Auto-register user status if not exists (for active unit counting)
        if (statusService.getStatus(message.getSenderId()) == null) {
            StatusEntry newStatus = new StatusEntry();
            newStatus.setUserId(message.getSenderId());
            newStatus.setUserName(message.getSenderName());
            newStatus.setStatus("SAFE"); // Default status
            newStatus.setMessage("Joined via messaging");
            newStatus.setTimestamp(LocalDateTime.now());
            newStatus.setHasInternet(true);
            statusService.updateStatus(newStatus);
        }

        broadcastService.broadcastMessage(message);
        socketServerService.broadcastMessage(message);

        log.info("Message sent via REST API: {}", message.getContent());
        return ResponseEntity.ok(message);
    }

    // Get recent messages
    @GetMapping("/messages")
    public ResponseEntity<List<Message>> getMessages(
            @RequestParam(defaultValue = "50") int limit) {
        return ResponseEntity.ok(broadcastService.getRecentMessages(limit));
    }

    // Get all messages
    @GetMapping("/messages/all")
    public ResponseEntity<List<Message>> getAllMessages() {
        return ResponseEntity.ok(broadcastService.getAllMessages());
    }

    // Update user status
    @PostMapping("/status")
    public ResponseEntity<StatusEntry> updateStatus(@Valid @RequestBody StatusEntry status) {
        statusService.updateStatus(status);
        return ResponseEntity.ok(status);
    }

    // Get all statuses
    @GetMapping("/status")
    public ResponseEntity<List<StatusEntry>> getAllStatuses() {
        return ResponseEntity.ok(statusService.getAllStatuses());
    }

    // Get specific user status
    @GetMapping("/status/{userId}")
    public ResponseEntity<StatusEntry> getUserStatus(@PathVariable String userId) {
        StatusEntry status = statusService.getStatus(userId);
        if (status != null) {
            return ResponseEntity.ok(status);
        }
        return ResponseEntity.notFound().build();
    }

    // Get network statistics
    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getStats() {
        Map<String, Object> stats = new HashMap<>();
        stats.put("activeConnections", socketServerService.getActiveConnectionCount());
        stats.put("totalMessages", broadcastService.getAllMessages().size());
        stats.put("activeUsers", statusService.getActiveUserCount());
        stats.put("criticalUsers", statusService.getCriticalUserCount());
        stats.put("timestamp", LocalDateTime.now());

        return ResponseEntity.ok(stats);
    }

    // Health check
    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> health() {
        Map<String, String> health = new HashMap<>();
        health.put("status", "UP");
        health.put("service", "CrisisConnect");
        health.put("timestamp", LocalDateTime.now().toString());
        return ResponseEntity.ok(health);
    }

    // Explicit disconnect
    @PostMapping("/disconnect")
    public ResponseEntity<Void> disconnect(@RequestBody Map<String, String> payload) {
        String userId = payload.get("userId");
        if (userId != null) {
            statusService.removeStatus(userId);
            log.info("User explicitly disconnected: {}", userId);
        }
        return ResponseEntity.ok().build();
    }

    // Clear message history (admin function)
    @DeleteMapping("/messages")
    public ResponseEntity<Void> clearMessages() {
        broadcastService.clearHistory();
        return ResponseEntity.ok().build();
    }

    @GetMapping("/server-info")
    public ResponseEntity<Map<String, String>> getServerInfo() {
        Map<String, String> info = new HashMap<>();
        try {
            String ipAddress = InetAddress.getLocalHost().getHostAddress(); // Fallback
            Enumeration<NetworkInterface> interfaces = NetworkInterface.getNetworkInterfaces();
            while (interfaces.hasMoreElements()) {
                NetworkInterface iface = interfaces.nextElement();
                if (iface.isLoopback() || !iface.isUp())
                    continue;

                Enumeration<InetAddress> addresses = iface.getInetAddresses();
                while (addresses.hasMoreElements()) {
                    InetAddress addr = addresses.nextElement();
                    // Prefer site-local (192.168...) but accept others if not loopback
                    if (!addr.isLinkLocalAddress() && !addr.isLoopbackAddress() && addr.getAddress().length == 4) {
                        ipAddress = addr.getHostAddress();
                        // If it's site local, it's likely the one we want (Wi-Fi), so break
                        if (addr.isSiteLocalAddress())
                            break;
                    }
                }
            }
            info.put("ip", ipAddress);
            info.put("port", "8080");
            info.put("url", "http://" + ipAddress + ":8080");
        } catch (Exception e) {
            info.put("error", "Could not determine IP");
            info.put("ip", "127.0.0.1");
        }
        return ResponseEntity.ok(info);
    }
}