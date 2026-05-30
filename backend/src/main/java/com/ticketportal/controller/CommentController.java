package com.ticketportal.controller;

import com.ticketportal.dto.request.CreateCommentRequest;
import com.ticketportal.dto.response.ApiResponse;
import com.ticketportal.dto.response.CommentResponse;
import com.ticketportal.service.CommentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/tickets/{ticketId}/comments")
@RequiredArgsConstructor
@Tag(name = "Comments", description = "Ticket comments endpoints")
public class CommentController {

    private final CommentService commentService;

    @PostMapping
    @Operation(summary = "Add comment to ticket")
    public ResponseEntity<ApiResponse<CommentResponse>> addComment(@PathVariable Long ticketId,
            @Valid @RequestBody CreateCommentRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(ApiResponse.success("Comment added", commentService.addComment(ticketId, request)));
    }

    @GetMapping
    @Operation(summary = "Get all comments for a ticket")
    public ResponseEntity<ApiResponse<List<CommentResponse>>> getComments(@PathVariable Long ticketId) {
        return ResponseEntity.ok(ApiResponse.success(commentService.getTicketComments(ticketId)));
    }

    @PutMapping("/{commentId}")
    @Operation(summary = "Update a comment")
    public ResponseEntity<ApiResponse<CommentResponse>> updateComment(@PathVariable Long ticketId,
            @PathVariable Long commentId, @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(ApiResponse.success("Comment updated",
            commentService.updateComment(commentId, body.get("content"))));
    }

    @DeleteMapping("/{commentId}")
    @Operation(summary = "Delete a comment")
    public ResponseEntity<ApiResponse<String>> deleteComment(@PathVariable Long ticketId,
            @PathVariable Long commentId) {
        commentService.deleteComment(commentId);
        return ResponseEntity.ok(ApiResponse.success("Comment deleted"));
    }
}
