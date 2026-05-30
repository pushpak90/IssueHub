package com.ticketportal.controller;

import com.ticketportal.dto.request.CreateTicketRequest;
import com.ticketportal.dto.request.UpdateTicketRequest;
import com.ticketportal.dto.response.*;
import com.ticketportal.entity.Ticket;
import com.ticketportal.entity.TicketCommit;
import com.ticketportal.entity.enums.TicketPriority;
import com.ticketportal.entity.enums.TicketStatus;
import com.ticketportal.entity.enums.TicketType;
import com.ticketportal.repository.TicketCommitRepository;
import com.ticketportal.service.TicketService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/tickets")
@RequiredArgsConstructor
@Tag(name = "Tickets", description = "Ticket management endpoints")
public class TicketController {

    private final TicketService ticketService;
    private final TicketCommitRepository commitRepository;

    @GetMapping
    @Operation(summary = "Get all tickets (global, with filters)")
    public ResponseEntity<ApiResponse<PagedResponse<TicketResponse>>> getAllTickets(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) Long projectId,
            @RequestParam(required = false) TicketStatus status,
            @RequestParam(required = false) TicketPriority priority,
            @RequestParam(required = false) Long assigneeId,
            @RequestParam(required = false) String search) {
        return ResponseEntity.ok(ApiResponse.success(
            ticketService.getAllTicketsGlobal(page, size, projectId, status, priority, assigneeId, search)));
    }

    @PatchMapping("/bulk")
    @Transactional
    @Operation(summary = "Bulk update tickets — change status/priority/assignee for multiple tickets")
    public ResponseEntity<ApiResponse<String>> bulkUpdate(@RequestBody java.util.Map<String, Object> body) {
        @SuppressWarnings("unchecked")
        java.util.List<Integer> rawIds = (java.util.List<Integer>) body.get("ticketIds");
        if (rawIds == null || rawIds.isEmpty())
            return ResponseEntity.badRequest().body(ApiResponse.error("ticketIds is required"));

        com.ticketportal.dto.request.UpdateTicketRequest patch = new com.ticketportal.dto.request.UpdateTicketRequest();
        if (body.containsKey("status") && body.get("status") != null)
            patch.setStatus(TicketStatus.valueOf((String) body.get("status")));
        if (body.containsKey("priority") && body.get("priority") != null)
            patch.setPriority(TicketPriority.valueOf((String) body.get("priority")));
        if (body.containsKey("assigneeId") && body.get("assigneeId") != null) {
            Object raw = body.get("assigneeId");
            patch.setAssigneeId(raw instanceof Number ? ((Number) raw).longValue() : Long.parseLong(raw.toString()));
        }

        int updated = 0;
        for (Integer id : rawIds) {
            try { ticketService.updateTicket(id.longValue(), patch); updated++; }
            catch (Exception ignored) {}
        }
        return ResponseEntity.ok(ApiResponse.success("Updated " + updated + " ticket(s)"));
    }

    @GetMapping("/export")
    @Transactional(readOnly = true)
    @Operation(summary = "Export tickets as enriched list with commit IDs (for CSV download)")
    public ResponseEntity<ApiResponse<java.util.List<java.util.Map<String, Object>>>> exportTickets(
            @RequestParam(required = false) Long projectId,
            @RequestParam(required = false) TicketStatus status,
            @RequestParam(required = false) TicketPriority priority,
            @RequestParam(required = false) Long assigneeId,
            @RequestParam(required = false) String search) {

        // Fetch up to 10000 tickets with same role-based filtering
        var paged = ticketService.getAllTicketsGlobal(0, 10000, projectId, status, priority, assigneeId, search);
        java.util.List<TicketResponse> ticketResponses = paged.getContent();

        // Batch-fetch commits for all tickets (avoids N+1)
        java.util.List<Long> ids = ticketResponses.stream()
            .map(TicketResponse::getId).collect(java.util.stream.Collectors.toList());
        java.util.List<Ticket> ticketEntities = ticketService.findAllByIds(ids);
        java.util.List<TicketCommit> allCommits = commitRepository.findByTicketIn(ticketEntities);

        // Group commits by ticket id
        java.util.Map<Long, java.util.List<String>> commitMap = allCommits.stream()
            .collect(java.util.stream.Collectors.groupingBy(
                c -> c.getTicket().getId(),
                java.util.stream.Collectors.mapping(TicketCommit::getCommitHash,
                    java.util.stream.Collectors.toList())
            ));

        // Build enriched export rows
        java.util.List<java.util.Map<String, Object>> result = ticketResponses.stream().map(t -> {
            java.util.Map<String, Object> row = new java.util.LinkedHashMap<>();
            row.put("ticketNumber",   t.getTicketNumber());
            row.put("title",          t.getTitle());
            row.put("status",         t.getStatus() != null ? t.getStatus().name() : "");
            row.put("priority",       t.getPriority() != null ? t.getPriority().name() : "");
            row.put("type",           t.getType() != null ? t.getType().name() : "");
            row.put("projectName",    t.getProjectName());
            row.put("assignee",       t.getAssignee() != null ? t.getAssignee().getFullName() : "");
            row.put("reporter",       t.getReporter() != null ? t.getReporter().getFullName() : "");
            row.put("dueDate",        t.getDueDate() != null ? t.getDueDate().toString() : "");
            row.put("estimatedHours", t.getEstimatedHours() != null ? t.getEstimatedHours().toString() : "");
            row.put("commitIds",      String.join("; ", commitMap.getOrDefault(t.getId(), java.util.List.of())));
            row.put("createdAt",      t.getCreatedAt() != null ? t.getCreatedAt().toString() : "");
            return row;
        }).collect(java.util.stream.Collectors.toList());

        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @PostMapping
    @Operation(summary = "Create a new ticket")
    public ResponseEntity<ApiResponse<TicketResponse>> createTicket(@Valid @RequestBody CreateTicketRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(ApiResponse.success("Ticket created", ticketService.createTicket(request)));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get ticket by ID")
    public ResponseEntity<ApiResponse<TicketResponse>> getTicket(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(ticketService.getTicketById(id)));
    }

    @GetMapping("/number/{ticketNumber}")
    @Operation(summary = "Get ticket by number (e.g. TKT-1)")
    public ResponseEntity<ApiResponse<TicketResponse>> getTicketByNumber(@PathVariable String ticketNumber) {
        return ResponseEntity.ok(ApiResponse.success(ticketService.getTicketByNumber(ticketNumber)));
    }

    @GetMapping("/project/{projectId}")
    @Operation(summary = "Get tickets for a project with filters")
    public ResponseEntity<ApiResponse<PagedResponse<TicketResponse>>> getProjectTickets(
            @PathVariable Long projectId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) TicketStatus status,
            @RequestParam(required = false) TicketPriority priority,
            @RequestParam(required = false) TicketType type,
            @RequestParam(required = false) Long assigneeId,
            @RequestParam(required = false) String search) {
        return ResponseEntity.ok(ApiResponse.success(
            ticketService.getTicketsForProject(projectId, page, size, status, priority, type, assigneeId, search)));
    }

    @GetMapping("/my")
    @Operation(summary = "Get tickets assigned to current user")
    public ResponseEntity<ApiResponse<PagedResponse<TicketResponse>>> getMyTickets(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(ApiResponse.success(ticketService.getMyTickets(page, size)));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update a ticket")
    public ResponseEntity<ApiResponse<TicketResponse>> updateTicket(@PathVariable Long id,
            @RequestBody UpdateTicketRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Ticket updated", ticketService.updateTicket(id, request)));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete a ticket")
    public ResponseEntity<ApiResponse<String>> deleteTicket(@PathVariable Long id) {
        ticketService.deleteTicket(id);
        return ResponseEntity.ok(ApiResponse.success("Ticket deleted"));
    }

    @GetMapping("/{id}/history")
    @Operation(summary = "Get ticket history/audit trail")
    public ResponseEntity<ApiResponse<List<TicketHistoryResponse>>> getHistory(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(ticketService.getTicketHistory(id)));
    }

    @GetMapping("/{id}/attachments")
    @Operation(summary = "Get ticket attachments")
    public ResponseEntity<ApiResponse<List<AttachmentResponse>>> getAttachments(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(ticketService.getTicketAttachments(id)));
    }
}
