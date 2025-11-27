package com.crisisconnect.service;

import com.crisisconnect.model.StatusEntry;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
@Slf4j
public class StatusService {

    private final SimpMessagingTemplate messagingTemplate;
    private final Map<String, StatusEntry> statusBoard = new ConcurrentHashMap<>();

    public StatusService(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    public void updateStatus(StatusEntry entry) {
        entry.setTimestamp(LocalDateTime.now());
        statusBoard.put(entry.getUserId(), entry);

        // Broadcast status update
        messagingTemplate.convertAndSend("/topic/status", entry);

        log.info("📊 Status updated for {}: {}", entry.getUserName(), entry.getStatus());
    }

    public List<StatusEntry> getAllStatuses() {
        return new ArrayList<>(statusBoard.values());
    }

    public StatusEntry getStatus(String userId) {
        return statusBoard.get(userId);
    }

    public void removeStatus(String userId) {
        StatusEntry removed = statusBoard.remove(userId);
        if (removed != null) {
            messagingTemplate.convertAndSend("/topic/status/removed", userId);
            log.info("Status removed for user: {}", userId);
        }
    }

    public long getActiveUserCount() {
        return statusBoard.values().stream()
                .filter(entry -> !entry.getStatus().equals("OFFLINE"))
                .count();
    }

    public long getCriticalUserCount() {
        return statusBoard.values().stream()
                .filter(entry -> entry.getStatus().equals("CRITICAL") ||
                        entry.getStatus().equals("NEED_HELP"))
                .count();
    }
}