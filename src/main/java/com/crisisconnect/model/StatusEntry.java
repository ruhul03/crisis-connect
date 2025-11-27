package com.crisisconnect.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class StatusEntry {
    private String userId;
    private String userName;
    private String status;
    private String message;
    private LocalDateTime timestamp;
    private int batteryLevel;
    private boolean hasInternet;
}