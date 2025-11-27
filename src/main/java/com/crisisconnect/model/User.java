package com.crisisconnect.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class User {
    private String id;
    private String name;
    private String ipAddress;
    private UserStatus status;
    private LocalDateTime lastSeen;
    private Location location;
    private String statusMessage;

    public enum UserStatus {
        SAFE, NEED_HELP, INJURED, CRITICAL, OFFLINE
    }
}