package com.crisisconnect.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class NetworkNode {
    private String nodeId;
    private String hostname;
    private String ipAddress;
    private int port;
    private NodeType type;
    private LocalDateTime connectedAt;
    private boolean isActive;

    public enum NodeType {
        SERVER, CLIENT, RELAY
    }
}