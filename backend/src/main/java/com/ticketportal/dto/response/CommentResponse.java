package com.ticketportal.dto.response;

import lombok.*;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CommentResponse {
    private Long id;
    private String content;
    private Long ticketId;
    private UserResponse author;
    private Long parentId;
    private List<CommentResponse> replies;
    private boolean edited;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
