package com.crisisconnect.runner;

import com.crisisconnect.service.SocketServerService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

@Component
@Slf4j
public class CrisisConnectRunner implements ApplicationRunner {

    @Autowired
    private SocketServerService socketServerService;

    @Override
    public void run(ApplicationArguments args) throws Exception {
        log.info("═══════════════════════════════════════════════════");
        log.info("🚨 CRISISCONNECT - DISASTER OFFLINE MESSAGING 🚨");
        log.info("═══════════════════════════════════════════════════");

        socketServerService.start();

        log.info("✅ System ready for disaster communication");
        log.info("📱 Devices can connect via local network");
        log.info("💬 Real-time messaging active");
        log.info("📊 Status board monitoring enabled");
        log.info("═══════════════════════════════════════════════════");
    }
}