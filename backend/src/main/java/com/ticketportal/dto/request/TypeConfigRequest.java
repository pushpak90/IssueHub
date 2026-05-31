package com.ticketportal.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class TypeConfigRequest {

    @NotBlank(message = "Type name is required")
    private String name;

    @NotBlank(message = "Display name is required")
    private String displayName;

    private String color;
    private String textColor;
    private String icon;
    private Integer position;
    private Boolean isDefault;
}
