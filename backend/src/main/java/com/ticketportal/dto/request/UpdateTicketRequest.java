package com.ticketportal.dto.request;

import lombok.*;

import java.time.LocalDate;
import java.util.Set;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class UpdateTicketRequest {

    private String title;
    private String description;
    private String status;
    private String priority;
    private String type;
    private Long assigneeId;
    private LocalDate dueDate;
    private Integer estimatedHours;
    private Integer actualHours;
    private Set<Long> labelIds;
    private String resolutionNote;
}
