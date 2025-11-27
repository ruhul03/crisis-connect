package com.crisisconnect.client;

import com.crisisconnect.model.Message;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.PrintWriter;
import java.net.Socket;
import java.time.LocalDateTime;
import java.util.Scanner;
import java.util.UUID;

/**
 * Simple socket client for testing CrisisConnect
 * Run this to connect to the server and send messages
 */
public class CrisisConnectClient {

    private static final String SERVER_HOST = "localhost";
    private static final int SERVER_PORT = 8888;
    private static final ObjectMapper objectMapper = new ObjectMapper();

    static {
        objectMapper.registerModule(new JavaTimeModule());
    }

    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);

        System.out.println("═══════════════════════════════════════");
        System.out.println("🚨 CrisisConnect Client");
        System.out.println("═══════════════════════════════════════");

        System.out.print("Enter your name: ");
        String userName = scanner.nextLine();
        String userId = UUID.randomUUID().toString();

        try (Socket socket = new Socket(SERVER_HOST, SERVER_PORT);
             PrintWriter out = new PrintWriter(socket.getOutputStream(), true);
             BufferedReader in = new BufferedReader(new InputStreamReader(socket.getInputStream()))) {

            System.out.println("✅ Connected to CrisisConnect Server");
            System.out.println("Commands: 'status' (update status), 'emergency' (send emergency), 'quit' (exit)");
            System.out.println("═══════════════════════════════════════\n");

            // Start thread to receive messages
            Thread receiveThread = new Thread(() -> {
                try {
                    String serverMessage;
                    while ((serverMessage = in.readLine()) != null) {
                        try {
                            Message msg = objectMapper.readValue(serverMessage, Message.class);
                            displayMessage(msg);
                        } catch (Exception e) {
                            System.out.println("📨 " + serverMessage);
                        }
                    }
                } catch (Exception e) {
                    System.out.println("❌ Connection lost");
                }
            });
            receiveThread.start();

            // Main loop to send messages
            while (true) {
                System.out.print(userName + " > ");
                String input = scanner.nextLine();

                if (input.equalsIgnoreCase("quit")) {
                    break;
                }

                Message message = createMessage(userId, userName, input);
                String json = objectMapper.writeValueAsString(message);
                out.println(json);
            }

        } catch (Exception e) {
            System.err.println("❌ Error: " + e.getMessage());
            e.printStackTrace();
        }

        System.out.println("👋 Disconnected from CrisisConnect");
    }

    private static Message createMessage(String userId, String userName, String input) {
        Message message = new Message();
        message.setId(UUID.randomUUID().toString());
        message.setSenderId(userId);
        message.setSenderName(userName);
        message.setTimestamp(LocalDateTime.now());

        if (input.equalsIgnoreCase("emergency")) {
            message.setContent("🚨 EMERGENCY! I need immediate help!");
            message.setType(Message.MessageType.EMERGENCY);
            message.setPriority(Message.MessagePriority.CRITICAL);
        } else if (input.toLowerCase().startsWith("status:")) {
            message.setContent(input.substring(7).trim());
            message.setType(Message.MessageType.STATUS_UPDATE);
            message.setPriority(Message.MessagePriority.HIGH);
        } else {
            message.setContent(input);
            message.setType(Message.MessageType.TEXT);
            message.setPriority(Message.MessagePriority.NORMAL);
        }

        return message;
    }

    private static void displayMessage(Message msg) {
        String icon = switch (msg.getType()) {
            case EMERGENCY -> "🚨";
            case STATUS_UPDATE -> "📊";
            case SYSTEM -> "⚙️";
            default -> "💬";
        };

        System.out.println(String.format("\n%s [%s] %s: %s",
                icon,
                msg.getTimestamp().toLocalTime(),
                msg.getSenderName(),
                msg.getContent()));
        System.out.print("> ");
    }
}