package com.ticketportal.dto.request;

import com.ticketportal.entity.enums.TicketPriority;
import com.ticketportal.entity.enums.TicketType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.time.LocalDate;
import java.util.Set;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class CreateTicketRequest {

    @NotNull(message = "Project ID is required")
    private Long projectId;

    @NotBlank(message = "Title is required")
    @Size(max = 200, message = "Title must be less than 200 characters")
    private String title;

    private String description;

    private TicketPriority priority = TicketPriority.MEDIUM;

    private TicketType type = TicketType.TASK;

    private Long assigneeId;

    private LocalDate dueDate;

    private Integer estimatedHours;

    private Set<Long> labelIds;
}
