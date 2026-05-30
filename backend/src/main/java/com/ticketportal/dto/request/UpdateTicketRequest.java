package com.ticketportal.dto.request;

import com.ticketportal.entity.enums.TicketPriority;
import com.ticketportal.entity.enums.TicketStatus;
import com.ticketportal.entity.enums.TicketType;
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
    private TicketStatus status;
    private TicketPriority priority;
    private TicketType type;
    private Long assigneeId;
    private LocalDate dueDate;
    private Integer estimatedHours;
    private Integer actualHours;
    private Set<Long> labelIds;
    private String resolutionNote;
}
