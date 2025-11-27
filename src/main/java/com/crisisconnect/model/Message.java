package com.crisisconnect.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class Message {
    private String id;
    private String senderId;
    private String senderName;
    private String content;
    private MessageType type;
    private LocalDateTime timestamp;
    private MessagePriority priority;

    public enum MessageType {
        TEXT, STATUS_UPDATE, EMERGENCY, LOCATION, SYSTEM
    }

    public enum MessagePriority {
        LOW, NORMAL, HIGH, CRITICAL
    }
}