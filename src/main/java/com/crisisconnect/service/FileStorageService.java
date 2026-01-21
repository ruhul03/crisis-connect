package com.crisisconnect.service;

import com.crisisconnect.model.Message;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.IOException;
import java.util.Collections;
import java.util.List;

@Service
@Slf4j
public class FileStorageService {

    private final ObjectMapper objectMapper;
    private static final String DATA_DIR = "data";
    private static final String MESSAGES_FILE = "data/messages.json";

    public FileStorageService(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public void saveMessages(List<Message> messages) {
        try {
            File directory = new File(DATA_DIR);
            if (!directory.exists()) {
                boolean created = directory.mkdirs();
                if (created) {
                    log.info("Created data directory: {}", directory.getAbsolutePath());
                }
            }

            File file = new File(MESSAGES_FILE);
            objectMapper.writeValue(file, messages);
            // Don't log on every save to avoid spam, but maybe on debug
            log.debug("Saved {} messages to file", messages.size());
        } catch (IOException e) {
            log.error("Failed to save messages to file", e);
        }
    }

    public List<Message> loadMessages() {
        File file = new File(MESSAGES_FILE);
        if (!file.exists()) {
            log.info("No existing message history found at {}", file.getAbsolutePath());
            return Collections.emptyList();
        }

        try {
            List<Message> messages = objectMapper.readValue(file, new TypeReference<List<Message>>() {
            });
            log.info("Loaded {} messages from history", messages.size());
            return messages;
        } catch (IOException e) {
            log.error("Failed to load messages from file", e);
            return Collections.emptyList();
        }
    }
}
