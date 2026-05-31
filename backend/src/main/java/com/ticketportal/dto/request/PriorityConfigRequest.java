package com.ticketportal.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class PriorityConfigRequest {

    @NotBlank(message = "Priority name is required")
    private String name;

    @NotBlank(message = "Display name is required")
    private String displayName;

    private String color;
    private String textColor;
    private String dotColor;
    private String icon;
    private Integer level;
    private Boolean isDefault;
}
