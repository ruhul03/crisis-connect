package com.crisisconnect.listener;

import com.crisisconnect.service.MessageBroadcastService;
import com.crisisconnect.service.StatusService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;
import org.springframework.web.socket.messaging.SessionConnectEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import java.util.Map;

@Component
public class WebSocketEventListener {

    private static final Logger logger = LoggerFactory.getLogger(WebSocketEventListener.class);

    @Autowired
    private StatusService statusService;

    @Autowired
    private MessageBroadcastService messageBroadcastService;

    @EventListener
    public void handleWebSocketDisconnectListener(SessionDisconnectEvent event) {
        StompHeaderAccessor headerAccessor = StompHeaderAccessor.wrap(event.getMessage());

        // We can try to retrieve the username if we stored it in the session
        // Note: You must ensure you put the username in the session attributes during
        // connection/subscription
        Map<String, Object> sessionAttributes = headerAccessor.getSessionAttributes();

        if (sessionAttributes != null) {
            // If you aren't storing it yet, we might need to rely on the client sending an
            // explicit "User Leaving" message
            // Or, we can blindly try to map sessionId to user if we tracked it.
            // For now, let's log.
        }

        logger.info("WebSocket Disconnected: " + event.getSessionId());
        // Since we don't have a reliable map of SessionID -> User yet (unless
        // StatusService has it),
        // we might simply log it.
        // BUT, to fix the user's issue, we need to know WHO disconnected.

        // If StatusService tracks session IDs, we can remove them.
        statusService.handleDisconnect(event.getSessionId());
    }
}
