package com.ticketportal.dto.response;

import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TypeConfigResponse {
    private Long id;
    private String name;
    private String displayName;
    private String color;
    private String textColor;
    private String icon;
    private Integer position;
    private Boolean isDefault;
    private Boolean isActive;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
