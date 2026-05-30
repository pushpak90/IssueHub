package com.ticketportal.dto.response;

import com.ticketportal.entity.enums.ProjectStatus;
import lombok.*;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProjectResponse {

    private Long id;
    private String name;
    private String description;
    private String keyPrefix;
    private ProjectStatus status;
    private Long categoryId;
    private String categoryName;
    private String categoryColor;
    private String categoryIcon;
    private UserResponse owner;
    private List<UserResponse> members;
    private int memberCount;
    private long totalTickets;
    private long openTickets;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
