package com.ticketportal.dto.response;

import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StatusConfigResponse {
    private Long id;
    private String name;
    private String displayName;
    private String color;
    private String textColor;
    private String icon;
    private Integer position;
    private Boolean isDefault;
    private Boolean isFinal;
    private Boolean isActive;
    private Long projectId;
    private String projectName;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
