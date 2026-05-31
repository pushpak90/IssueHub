package com.ticketportal.dto.response;

import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PriorityConfigResponse {
    private Long id;
    private String name;
    private String displayName;
    private String color;
    private String textColor;
    private String dotColor;
    private String icon;
    private Integer level;
    private Boolean isDefault;
    private Boolean isActive;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
