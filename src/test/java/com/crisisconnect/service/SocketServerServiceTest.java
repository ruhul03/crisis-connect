package com.crisisconnect.service;

import com.crisisconnect.runner.CrisisConnectRunner;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
public class SocketServerServiceTest {

    @Autowired
    private SocketServerService socketServerService;

    // Mock the runner to prevent it from starting the actual socket server
    @MockBean
    private CrisisConnectRunner crisisConnectRunner;

    @Test
    public void contextLoads() {
        assertThat(socketServerService).isNotNull();
    }
}
