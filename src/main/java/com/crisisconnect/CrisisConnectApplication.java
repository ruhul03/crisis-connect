package com.crisisconnect;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableAsync
public class CrisisConnectApplication {
    public static void main(String[] args) {
        SpringApplication.run(CrisisConnectApplication.class, args);

        /* this is the main run file just click run */
    }
}