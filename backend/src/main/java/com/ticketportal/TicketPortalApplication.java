package com.ticketportal;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableJpaAuditing
@EnableAsync
public class TicketPortalApplication {

    public static void main(String[] args) {
        SpringApplication.run(TicketPortalApplication.class, args);
    }
}
