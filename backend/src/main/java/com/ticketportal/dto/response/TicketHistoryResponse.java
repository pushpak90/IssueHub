package com.ticketportal.dto.response;

import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TicketHistoryResponse {
    private Long id;
    private UserResponse changedBy;
    private String fieldName;
    private String oldValue;
    private String newValue;
    private String changeType;
    private LocalDateTime createdAt;
}
