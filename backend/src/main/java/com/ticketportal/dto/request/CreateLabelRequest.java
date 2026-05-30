package com.ticketportal.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class CreateLabelRequest {

    @NotBlank(message = "Label name is required")
    private String name;

    private String color;

    @NotNull(message = "Project ID is required")
    private Long projectId;
}
