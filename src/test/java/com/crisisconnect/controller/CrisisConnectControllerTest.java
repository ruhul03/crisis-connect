package com.crisisconnect.controller;

import com.crisisconnect.model.Message;
import com.crisisconnect.service.MessageBroadcastService;
import com.crisisconnect.service.SocketServerService;
import com.crisisconnect.service.StatusService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(CrisisConnectController.class)
public class CrisisConnectControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private MessageBroadcastService broadcastService;

    @MockBean
    private StatusService statusService;

    @MockBean
    private SocketServerService socketServerService;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    public void testSendMessage_Valid() throws Exception {
        Message message = new Message();
        message.setSenderId("user-1");
        message.setSenderName("User 1");
        message.setContent("Hello");
        message.setType(Message.MessageType.TEXT);
        message.setPriority(Message.MessagePriority.NORMAL);

        mockMvc.perform(post("/api/messages")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(message)))
                .andExpect(status().isOk());
    }

    @Test
    public void testSendMessage_Invalid() throws Exception {
        Message message = new Message();
        // Missing required fields (senderId, senderName, etc.)
        message.setContent("Hello");
        // Type and Priority are also null by default

        mockMvc.perform(post("/api/messages")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(message)))
                .andExpect(status().isBadRequest());
    }
}
