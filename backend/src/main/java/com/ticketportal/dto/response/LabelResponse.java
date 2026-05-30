package com.ticketportal.dto.response;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LabelResponse {
    private Long id;
    private String name;
    private String color;
}
