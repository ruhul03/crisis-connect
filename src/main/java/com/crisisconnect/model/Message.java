package com.crisisconnect.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class Message {
    private String id;

    @NotBlank(message = "Sender ID cannot be empty")
    private String senderId;

    @NotBlank(message = "Sender name cannot be empty")
    private String senderName;

    @NotBlank(message = "Content cannot be empty")
    private String content;

    @NotNull(message = "Message type is required")
    private MessageType type;

    private LocalDateTime timestamp;

    @NotNull(message = "Priority is required")
    private MessagePriority priority;

    private Double latitude;
    private Double longitude;

    public enum MessageType {
        TEXT, STATUS_UPDATE, EMERGENCY, LOCATION, SYSTEM
    }

    public enum MessagePriority {
        LOW, NORMAL, HIGH, CRITICAL
    }
}