package com.ticketportal.controller;

import com.ticketportal.dto.response.ApiResponse;
import com.ticketportal.entity.Ticket;
import com.ticketportal.entity.TicketCommit;
import com.ticketportal.entity.TicketHistory;
import com.ticketportal.entity.User;
import com.ticketportal.exception.ResourceNotFoundException;
import com.ticketportal.repository.TicketCommitRepository;
import com.ticketportal.repository.TicketHistoryRepository;
import com.ticketportal.repository.TicketRepository;
import com.ticketportal.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/tickets/{ticketId}/commits")
@RequiredArgsConstructor
@Tag(name = "Ticket Commits", description = "Git commit tracking for tickets")
public class TicketCommitController {

    private final TicketCommitRepository commitRepository;
    private final TicketRepository ticketRepository;
    private final TicketHistoryRepository historyRepository;
    private final UserService userService;

    @GetMapping
    @Transactional(readOnly = true)
    @Operation(summary = "Get all commits for a ticket")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getCommits(
            @PathVariable Long ticketId) {
        Ticket ticket = getTicket(ticketId);
        List<Map<String, Object>> commits = commitRepository
            .findByTicketOrderByCreatedAtDesc(ticket)
            .stream().map(this::toMap).collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success(commits));
    }

    @PostMapping
    @Transactional
    @Operation(summary = "Add a commit reference to a ticket")
    public ResponseEntity<ApiResponse<Map<String, Object>>> addCommit(
            @PathVariable Long ticketId,
            @RequestBody Map<String, String> body) {
        String hash = body.get("commitHash");
        if (hash == null || hash.isBlank()) {
            return ResponseEntity.badRequest()
                .body(ApiResponse.error("Commit hash is required"));
        }

        Ticket ticket  = getTicket(ticketId);
        User   current = userService.getCurrentUser();

        TicketCommit commit = TicketCommit.builder()
            .ticket(ticket)
            .commitHash(hash.trim())
            .commitMessage(body.get("commitMessage"))
            .branch(body.get("branch"))
            .addedBy(current)
            .build();

        TicketCommit saved = commitRepository.save(commit);

        // Record in ticket history
        historyRepository.save(TicketHistory.builder()
            .ticket(ticket)
            .changedBy(current)
            .fieldName("commit")
            .oldValue(null)
            .newValue(shortHash(hash.trim()) + (body.get("branch") != null ? " on " + body.get("branch") : ""))
            .changeType("COMMIT_ADDED")
            .build());

        return ResponseEntity.status(HttpStatus.CREATED)
            .body(ApiResponse.success("Commit linked", toMap(saved)));
    }

    @DeleteMapping("/{commitId}")
    @Transactional
    @Operation(summary = "Remove a commit reference from a ticket")
    public ResponseEntity<ApiResponse<String>> removeCommit(
            @PathVariable Long ticketId,
            @PathVariable Long commitId) {
        TicketCommit commit = commitRepository.findById(commitId)
            .orElseThrow(() -> new ResourceNotFoundException("Commit", "id", commitId));
        if (!commit.getTicket().getId().equals(ticketId)) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Commit not linked to this ticket"));
        }
        commitRepository.delete(commit);
        return ResponseEntity.ok(ApiResponse.success("Commit removed"));
    }

    private Ticket getTicket(Long id) {
        return ticketRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Ticket", "id", id));
    }

    private String shortHash(String hash) {
        return hash.length() > 7 ? hash.substring(0, 7) : hash;
    }

    private Map<String, Object> toMap(TicketCommit c) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id",            c.getId());
        m.put("commitHash",    c.getCommitHash());
        m.put("shortHash",     shortHash(c.getCommitHash()));
        m.put("commitMessage", c.getCommitMessage());
        m.put("branch",        c.getBranch());
        m.put("addedBy",       c.getAddedBy() != null ? c.getAddedBy().getFullName() : null);
        m.put("addedById",     c.getAddedBy() != null ? c.getAddedBy().getId() : null);
        m.put("createdAt",     c.getCreatedAt() != null ? c.getCreatedAt().toString() : null);
        return m;
    }
}
