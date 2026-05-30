package com.ticketportal.dto.response;

import lombok.*;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TeamResponse {
    private Long id;
    private String name;
    private String description;
    private Long projectId;
    private String projectName;
    private UserResponse lead;
    private List<UserResponse> members;
    private int memberCount;
    private LocalDateTime createdAt;
}
