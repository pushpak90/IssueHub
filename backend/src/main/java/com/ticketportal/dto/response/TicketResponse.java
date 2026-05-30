package com.ticketportal.dto.response;

import com.ticketportal.entity.enums.TicketPriority;
import com.ticketportal.entity.enums.TicketStatus;
import com.ticketportal.entity.enums.TicketType;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TicketResponse {

    private Long id;
    private String ticketNumber;
    private String title;
    private String description;
    private TicketStatus status;
    private TicketPriority priority;
    private TicketType type;
    private Long projectId;
    private String projectName;
    private UserResponse reporter;
    private UserResponse assignee;
    private LocalDate dueDate;
    private Integer estimatedHours;
    private Integer actualHours;
    private List<LabelResponse> labels;
    private int commentCount;
    private int attachmentCount;
    private String resolutionNote;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime resolvedAt;
}
