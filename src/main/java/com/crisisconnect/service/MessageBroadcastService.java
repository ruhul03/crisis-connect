package com.crisisconnect.service;

import com.crisisconnect.model.Message;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

@Service
@Slf4j
public class MessageBroadcastService {

    private final SimpMessagingTemplate messagingTemplate;
    private final List<Message> messageHistory = new CopyOnWriteArrayList<>();
    private static final int MAX_HISTORY_SIZE = 1000;

    public MessageBroadcastService(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    public void broadcastMessage(Message message) {
        // Store in history
        messageHistory.add(message);
        if (messageHistory.size() > MAX_HISTORY_SIZE) {
            messageHistory.remove(0);
        }

        // Broadcast via WebSocket to web clients
        messagingTemplate.convertAndSend("/topic/messages", message);

        log.info("📡 Broadcasted message: {}", message.getContent());
    }

    public List<Message> getRecentMessages(int limit) {
        int size = messageHistory.size();
        int fromIndex = Math.max(0, size - limit);
        return new ArrayList<>(messageHistory.subList(fromIndex, size));
    }

    public List<Message> getAllMessages() {
        return new ArrayList<>(messageHistory);
    }

    public void clearHistory() {
        messageHistory.clear();
        log.info("Message history cleared");
    }
}