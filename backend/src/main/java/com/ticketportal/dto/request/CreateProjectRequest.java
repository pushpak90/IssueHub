package com.ticketportal.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class CreateProjectRequest {

    @NotBlank(message = "Project name is required")
    @Size(max = 100, message = "Project name must be less than 100 characters")
    private String name;

    private String description;

    @NotBlank(message = "Project key prefix is required")
    @Size(min = 2, max = 10, message = "Key prefix must be between 2 and 10 characters")
    @Pattern(regexp = "^[A-Z0-9]+$", message = "Key prefix must contain only uppercase letters and numbers")
    private String keyPrefix;

    // Optional — assign to a category when creating
    private Long categoryId;
}
