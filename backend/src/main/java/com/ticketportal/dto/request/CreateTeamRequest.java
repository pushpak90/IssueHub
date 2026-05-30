package com.ticketportal.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.util.Set;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class CreateTeamRequest {

    @NotBlank(message = "Team name is required")
    private String name;

    private String description;

    @NotNull(message = "Project ID is required")
    private Long projectId;

    private Long leadId;
    private Set<Long> memberIds;
}
