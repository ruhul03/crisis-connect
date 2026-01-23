package com.crisisconnect.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import jakarta.validation.constraints.NotBlank;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class StatusEntry {
    @NotBlank(message = "User ID cannot be empty")
    private String userId;

    @NotBlank(message = "User name cannot be empty")
    private String userName;

    @NotBlank(message = "Status cannot be empty")
    private String status;
    private String role;
    private String message;
    private LocalDateTime timestamp;
    private int batteryLevel;
    private boolean hasInternet;
    private Double latitude;
    private Double longitude;
}