package com.ticketportal.dto.response;

import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AttachmentResponse {
    private Long id;
    private String fileName;
    private String originalName;
    private Long fileSize;
    private String contentType;
    private String downloadUrl;
    private UserResponse uploadedBy;
    private LocalDateTime createdAt;
}
