package com.ticketportal.controller;

import com.ticketportal.dto.response.ApiResponse;
import com.ticketportal.dto.response.TicketResponse;
import com.ticketportal.entity.Sprint;
import com.ticketportal.service.SprintService;
import com.ticketportal.service.TicketService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/sprints")
@RequiredArgsConstructor
@Tag(name = "Sprints", description = "Sprint management endpoints")
public class SprintController {

    private final SprintService sprintService;
    private final TicketService ticketService;

    // ── Sprint CRUD ───────────────────────────────────────────────────────────

    @GetMapping("/project/{projectId}")
    @Transactional(readOnly = true)
    @Operation(summary = "Get all sprints for a project")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getProjectSprints(@PathVariable Long projectId) {
        List<Map<String, Object>> result = sprintService.getProjectSprints(projectId)
            .stream().map(this::toMap).collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @GetMapping("/project/{projectId}/active")
    @Transactional(readOnly = true)
    @Operation(summary = "Get active sprint for project")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getActiveSprint(@PathVariable Long projectId) {
        Sprint sprint = sprintService.getActiveSprint(projectId);
        return ResponseEntity.ok(ApiResponse.success(sprint != null ? toMap(sprint) : null));
    }

    @PostMapping("/project/{projectId}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    @Transactional
    @Operation(summary = "Create a sprint — Admin/Manager only")
    public ResponseEntity<ApiResponse<Map<String, Object>>> createSprint(
            @PathVariable Long projectId,
            @RequestBody Map<String, String> body) {
        // Safely parse dates — empty string or null both treated as null
        LocalDate startDate = parseDate(body.get("startDate"));
        LocalDate endDate   = parseDate(body.get("endDate"));
        Sprint sprint = sprintService.createSprint(
            projectId, body.get("name"), body.get("goal"), startDate, endDate);
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(ApiResponse.success("Sprint created", toMap(sprint)));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    @Transactional
    @Operation(summary = "Update sprint details — Admin/Manager only")
    public ResponseEntity<ApiResponse<Map<String, Object>>> updateSprint(
            @PathVariable Long id, @RequestBody Map<String, Object> body) {
        return ResponseEntity.ok(ApiResponse.success("Sprint updated",
            toMap(sprintService.updateSprint(id, body))));
    }

    @PatchMapping("/{id}/start")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    @Transactional
    @Operation(summary = "Start a sprint — Admin/Manager only")
    public ResponseEntity<ApiResponse<Map<String, Object>>> startSprint(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success("Sprint started! 🚀",
            toMap(sprintService.startSprint(id))));
    }

    @PatchMapping("/{id}/complete")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    @Transactional
    @Operation(summary = "Complete a sprint — Admin/Manager only")
    public ResponseEntity<ApiResponse<Map<String, Object>>> completeSprint(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success("Sprint completed! ✅",
            toMap(sprintService.completeSprint(id))));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    @Operation(summary = "Delete a sprint — Admin/Manager only")
    public ResponseEntity<ApiResponse<String>> deleteSprint(@PathVariable Long id) {
        sprintService.deleteSprint(id);
        return ResponseEntity.ok(ApiResponse.success("Sprint deleted"));
    }

    // ── Ticket ↔ Sprint ───────────────────────────────────────────────────────

    @PostMapping("/{id}/tickets/{ticketId}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    @Operation(summary = "Add ticket to sprint — Admin/Manager only")
    public ResponseEntity<ApiResponse<String>> addTicket(
            @PathVariable Long id, @PathVariable Long ticketId) {
        sprintService.addTicketToSprint(id, ticketId);
        return ResponseEntity.ok(ApiResponse.success("Ticket added to sprint"));
    }

    @DeleteMapping("/{id}/tickets/{ticketId}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    @Operation(summary = "Remove ticket from sprint — Admin/Manager only")
    public ResponseEntity<ApiResponse<String>> removeTicket(
            @PathVariable Long id, @PathVariable Long ticketId) {
        sprintService.removeTicketFromSprint(id, ticketId);
        return ResponseEntity.ok(ApiResponse.success("Ticket moved to backlog"));
    }

    @GetMapping("/{id}/tickets")
    @Transactional(readOnly = true)
    @Operation(summary = "Get tickets in a sprint")
    public ResponseEntity<ApiResponse<List<TicketResponse>>> getSprintTickets(@PathVariable Long id) {
        List<TicketResponse> tickets = sprintService.getSprintTickets(id)
            .stream().map(ticketService::toResponse).collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success(tickets));
    }

    @GetMapping("/project/{projectId}/backlog")
    @Transactional(readOnly = true)
    @Operation(summary = "Get backlog tickets (not in any sprint)")
    public ResponseEntity<ApiResponse<List<TicketResponse>>> getBacklog(@PathVariable Long projectId) {
        List<TicketResponse> tickets = sprintService.getBacklogTickets(projectId)
            .stream().map(ticketService::toResponse).collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success(tickets));
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    /** Safely parse a date string — returns null for null or empty input */
    private LocalDate parseDate(String value) {
        if (value == null || value.isBlank()) return null;
        try {
            return LocalDate.parse(value.trim());
        } catch (Exception e) {
            return null;
        }
    }

    /** Maps a Sprint entity to a response map — must be called inside an open session */
    private Map<String, Object> toMap(Sprint s) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id",           s.getId());
        m.put("name",         s.getName());
        m.put("goal",         s.getGoal());
        m.put("status",       s.getStatus().name());
        m.put("statusLabel",  s.getStatus().getDisplayName());
        m.put("startDate",    s.getStartDate()   != null ? s.getStartDate().toString()   : null);
        m.put("endDate",      s.getEndDate()     != null ? s.getEndDate().toString()     : null);
        m.put("sprintNumber", s.getSprintNumber());
        m.put("ticketCount",  s.getTickets().size());   // safe — session open via @Transactional
        m.put("createdAt",    s.getCreatedAt()   != null ? s.getCreatedAt().toString()   : null);
        m.put("completedAt",  s.getCompletedAt() != null ? s.getCompletedAt().toString() : null);
        return m;
    }
}
