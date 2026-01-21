package com.crisisconnect.service;

import com.crisisconnect.model.Message;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Service;
import jakarta.annotation.PostConstruct;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

@Slf4j
@Service
public class MessageBroadcastService {

    private final SimpMessagingTemplate messagingTemplate;
    private final FileStorageService fileStorageService;
    private final List<Message> messageHistory = new CopyOnWriteArrayList<>();
    private static final int MAX_HISTORY_SIZE = 1000;

    public MessageBroadcastService(SimpMessagingTemplate messagingTemplate, FileStorageService fileStorageService) {
        this.messagingTemplate = messagingTemplate;
        this.fileStorageService = fileStorageService;
    }

    @PostConstruct
    public void init() {
        List<Message> loadedMessages = fileStorageService.loadMessages();
        if (!loadedMessages.isEmpty()) {
            messageHistory.addAll(loadedMessages);
            log.info("Restored {} messages from history", loadedMessages.size());
        }
    }

    public void broadcastMessage(@NonNull Message message) {
        // Store in history
        messageHistory.add(message);
        if (messageHistory.size() > MAX_HISTORY_SIZE) {
            messageHistory.remove(0);
        }

        // Persist to file
        fileStorageService.saveMessages(new ArrayList<>(messageHistory));

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
        fileStorageService.saveMessages(new ArrayList<>()); // Clear file too
        log.info("Message history cleared");
    }
}