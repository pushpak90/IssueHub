package com.ticketportal.controller;

import com.ticketportal.dto.request.CreateTicketRequest;
import com.ticketportal.dto.request.TicketExplorerCriteria;
import com.ticketportal.dto.request.UpdateTicketRequest;
import com.ticketportal.dto.response.*;
import com.ticketportal.entity.Ticket;
import com.ticketportal.entity.TicketCommit;
import com.ticketportal.entity.enums.ProjectStatus;
import com.ticketportal.repository.*;
import com.ticketportal.service.TicketService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/tickets")
@RequiredArgsConstructor
@Tag(name = "Tickets", description = "Ticket management endpoints")
public class TicketController {

    private final TicketService ticketService;
    private final TicketCommitRepository commitRepository;
    private final ProjectRepository projectRepository;
    private final UserRepository userRepository;
    private final ProjectCategoryRepository categoryRepository;
    private final LabelRepository labelRepository;
    private final SprintRepository sprintRepository;

    @GetMapping("/explorer")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN','ROLE_MANAGER')")
    @Operation(summary = "Advanced manager/admin ticket explorer")
    public ResponseEntity<ApiResponse<PagedResponse<TicketResponse>>> exploreTickets(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String projectIds,
            @RequestParam(required = false) String categoryIds,
            @RequestParam(required = false) String projectStatuses,
            @RequestParam(required = false) String statuses,
            @RequestParam(required = false) String priorities,
            @RequestParam(required = false) String types,
            @RequestParam(required = false) String assigneeIds,
            @RequestParam(required = false) String reporterIds,
            @RequestParam(required = false) String labelIds,
            @RequestParam(required = false) String sprintIds,
            @RequestParam(required = false) Boolean backlog,
            @RequestParam(required = false) Boolean overdue,
            @RequestParam(required = false) Boolean unassigned,
            @RequestParam(required = false) Boolean hasAttachments,
            @RequestParam(required = false) Boolean hasComments,
            @RequestParam(required = false) Boolean hasCommits,
            @RequestParam(required = false) LocalDate dueFrom,
            @RequestParam(required = false) LocalDate dueTo,
            @RequestParam(required = false) LocalDate createdFrom,
            @RequestParam(required = false) LocalDate createdTo,
            @RequestParam(required = false) LocalDate updatedFrom,
            @RequestParam(required = false) LocalDate updatedTo,
            @RequestParam(required = false) LocalDate resolvedFrom,
            @RequestParam(required = false) LocalDate resolvedTo,
            @RequestParam(required = false) Integer estimatedMin,
            @RequestParam(required = false) Integer estimatedMax,
            @RequestParam(required = false) Integer actualMin,
            @RequestParam(required = false) Integer actualMax) {
        TicketExplorerCriteria criteria = buildCriteria(search, projectIds, categoryIds, projectStatuses,
            statuses, priorities, types, assigneeIds, reporterIds, labelIds, sprintIds, backlog, overdue,
            unassigned, hasAttachments, hasComments, hasCommits, dueFrom, dueTo, createdFrom, createdTo,
            updatedFrom, updatedTo, resolvedFrom, resolvedTo, estimatedMin, estimatedMax, actualMin, actualMax);
        return ResponseEntity.ok(ApiResponse.success(ticketService.exploreTickets(page, size, sortBy, sortDir, criteria)));
    }

    @GetMapping("/explorer/export")
    @Transactional(readOnly = true)
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN','ROLE_MANAGER')")
    @Operation(summary = "Export advanced explorer results")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> exportExplorerTickets(
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String projectIds,
            @RequestParam(required = false) String categoryIds,
            @RequestParam(required = false) String projectStatuses,
            @RequestParam(required = false) String statuses,
            @RequestParam(required = false) String priorities,
            @RequestParam(required = false) String types,
            @RequestParam(required = false) String assigneeIds,
            @RequestParam(required = false) String reporterIds,
            @RequestParam(required = false) String labelIds,
            @RequestParam(required = false) String sprintIds,
            @RequestParam(required = false) Boolean backlog,
            @RequestParam(required = false) Boolean overdue,
            @RequestParam(required = false) Boolean unassigned,
            @RequestParam(required = false) Boolean hasAttachments,
            @RequestParam(required = false) Boolean hasComments,
            @RequestParam(required = false) Boolean hasCommits,
            @RequestParam(required = false) LocalDate dueFrom,
            @RequestParam(required = false) LocalDate dueTo,
            @RequestParam(required = false) LocalDate createdFrom,
            @RequestParam(required = false) LocalDate createdTo,
            @RequestParam(required = false) LocalDate updatedFrom,
            @RequestParam(required = false) LocalDate updatedTo,
            @RequestParam(required = false) LocalDate resolvedFrom,
            @RequestParam(required = false) LocalDate resolvedTo,
            @RequestParam(required = false) Integer estimatedMin,
            @RequestParam(required = false) Integer estimatedMax,
            @RequestParam(required = false) Integer actualMin,
            @RequestParam(required = false) Integer actualMax) {
        TicketExplorerCriteria criteria = buildCriteria(search, projectIds, categoryIds, projectStatuses,
            statuses, priorities, types, assigneeIds, reporterIds, labelIds, sprintIds, backlog, overdue,
            unassigned, hasAttachments, hasComments, hasCommits, dueFrom, dueTo, createdFrom, createdTo,
            updatedFrom, updatedTo, resolvedFrom, resolvedTo, estimatedMin, estimatedMax, actualMin, actualMax);
        var page = ticketService.exploreTickets(0, 10000, sortBy, sortDir, criteria);
        return ResponseEntity.ok(ApiResponse.success(toExportRows(page.getContent())));
    }

    @GetMapping("/explorer/options")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN','ROLE_MANAGER')")
    @Operation(summary = "Get option lists for the advanced ticket explorer")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getExplorerOptions() {
        Map<String, Object> result = new java.util.LinkedHashMap<>();
        result.put("projects", projectRepository.findAll().stream().map(p -> {
            Map<String, Object> m = new java.util.LinkedHashMap<>();
            m.put("id", p.getId());
            m.put("name", p.getName());
            m.put("keyPrefix", p.getKeyPrefix());
            m.put("status", p.getStatus() != null ? p.getStatus().name() : null);
            m.put("categoryId", p.getCategory() != null ? p.getCategory().getId() : null);
            return m;
        }).collect(Collectors.toList()));
        result.put("users", userRepository.findAll().stream().filter(u -> u.isActive()).map(u -> {
            Map<String, Object> m = new java.util.LinkedHashMap<>();
            m.put("id", u.getId());
            m.put("name", u.getFullName());
            m.put("email", u.getEmail());
            return m;
        }).collect(Collectors.toList()));
        result.put("categories", categoryRepository.findAll().stream().map(c -> {
            Map<String, Object> m = new java.util.LinkedHashMap<>();
            m.put("id", c.getId());
            m.put("name", c.getName());
            m.put("color", c.getColor());
            return m;
        }).collect(Collectors.toList()));
        result.put("labels", labelRepository.findAll().stream().map(l -> {
            Map<String, Object> m = new java.util.LinkedHashMap<>();
            m.put("id", l.getId());
            m.put("name", l.getName());
            m.put("color", l.getColor());
            m.put("projectId", l.getProject() != null ? l.getProject().getId() : null);
            return m;
        }).collect(Collectors.toList()));
        result.put("sprints", sprintRepository.findAll().stream().map(s -> {
            Map<String, Object> m = new java.util.LinkedHashMap<>();
            m.put("id", s.getId());
            m.put("name", s.getName());
            m.put("status", s.getStatus() != null ? s.getStatus().name() : null);
            m.put("projectId", s.getProject() != null ? s.getProject().getId() : null);
            return m;
        }).collect(Collectors.toList()));
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @GetMapping
    @Operation(summary = "Get all tickets (global, with filters)")
    public ResponseEntity<ApiResponse<PagedResponse<TicketResponse>>> getAllTickets(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) Long projectId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String priority,
            @RequestParam(required = false) Long assigneeId,
            @RequestParam(required = false) String search) {
        return ResponseEntity.ok(ApiResponse.success(
            ticketService.getAllTicketsGlobal(page, size, projectId, status, priority, assigneeId, search)));
    }

    @PatchMapping("/bulk")
    @Transactional
    @Operation(summary = "Bulk update tickets — change status/priority/assignee for multiple tickets")
    public ResponseEntity<ApiResponse<String>> bulkUpdate(@RequestBody Map<String, Object> body) {
        @SuppressWarnings("unchecked")
        List<Integer> rawIds = (List<Integer>) body.get("ticketIds");
        if (rawIds == null || rawIds.isEmpty())
            return ResponseEntity.badRequest().body(ApiResponse.error("ticketIds is required"));

        UpdateTicketRequest patch = new UpdateTicketRequest();
        if (body.containsKey("status") && body.get("status") != null)
            patch.setStatus((String) body.get("status"));
        if (body.containsKey("priority") && body.get("priority") != null)
            patch.setPriority((String) body.get("priority"));
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
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> exportTickets(
            @RequestParam(required = false) Long projectId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String priority,
            @RequestParam(required = false) Long assigneeId,
            @RequestParam(required = false) String search) {
        var paged = ticketService.getAllTicketsGlobal(0, 10000, projectId, status, priority, assigneeId, search);
        return ResponseEntity.ok(ApiResponse.success(toExportRows(paged.getContent())));
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
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String priority,
            @RequestParam(required = false) String type,
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

    // ── Helpers ───────────────────────────────────────────────────────────────

    private TicketExplorerCriteria buildCriteria(String search, String projectIds, String categoryIds,
            String projectStatuses, String statuses, String priorities, String types, String assigneeIds,
            String reporterIds, String labelIds, String sprintIds, Boolean backlog, Boolean overdue,
            Boolean unassigned, Boolean hasAttachments, Boolean hasComments, Boolean hasCommits,
            LocalDate dueFrom, LocalDate dueTo, LocalDate createdFrom, LocalDate createdTo,
            LocalDate updatedFrom, LocalDate updatedTo, LocalDate resolvedFrom, LocalDate resolvedTo,
            Integer estimatedMin, Integer estimatedMax, Integer actualMin, Integer actualMax) {
        TicketExplorerCriteria c = new TicketExplorerCriteria();
        c.setSearch(search);
        c.setProjectIds(parseLongList(projectIds));
        c.setCategoryIds(parseLongList(categoryIds));
        c.setProjectStatuses(parseEnumList(projectStatuses, ProjectStatus.class));
        c.setStatuses(parseStringList(statuses));
        c.setPriorities(parseStringList(priorities));
        c.setTypes(parseStringList(types));
        c.setAssigneeIds(parseLongList(assigneeIds));
        c.setReporterIds(parseLongList(reporterIds));
        c.setLabelIds(parseLongList(labelIds));
        c.setSprintIds(parseLongList(sprintIds));
        c.setBacklog(backlog);
        c.setOverdue(overdue);
        c.setUnassigned(unassigned);
        c.setHasAttachments(hasAttachments);
        c.setHasComments(hasComments);
        c.setHasCommits(hasCommits);
        c.setDueFrom(dueFrom);
        c.setDueTo(dueTo);
        c.setCreatedFrom(createdFrom);
        c.setCreatedTo(createdTo);
        c.setUpdatedFrom(updatedFrom);
        c.setUpdatedTo(updatedTo);
        c.setResolvedFrom(resolvedFrom);
        c.setResolvedTo(resolvedTo);
        c.setEstimatedMin(estimatedMin);
        c.setEstimatedMax(estimatedMax);
        c.setActualMin(actualMin);
        c.setActualMax(actualMax);
        return c;
    }

    private List<Long> parseLongList(String csv) {
        if (csv == null || csv.isBlank()) return List.of();
        return Arrays.stream(csv.split(","))
            .map(String::trim).filter(s -> !s.isBlank())
            .map(Long::valueOf).collect(Collectors.toList());
    }

    private List<String> parseStringList(String csv) {
        if (csv == null || csv.isBlank()) return List.of();
        return Arrays.stream(csv.split(","))
            .map(String::trim).filter(s -> !s.isBlank())
            .collect(Collectors.toList());
    }

    private <E extends Enum<E>> List<E> parseEnumList(String csv, Class<E> type) {
        if (csv == null || csv.isBlank()) return List.of();
        return Arrays.stream(csv.split(","))
            .map(String::trim).filter(s -> !s.isBlank())
            .map(s -> Enum.valueOf(type, s)).collect(Collectors.toList());
    }

    private List<Map<String, Object>> toExportRows(List<TicketResponse> tickets) {
        if (tickets.isEmpty()) return List.of();
        List<Long> ids = tickets.stream().map(TicketResponse::getId).collect(Collectors.toList());
        List<Ticket> entities = ticketService.findAllByIds(ids);
        List<TicketCommit> allCommits = commitRepository.findByTicketIn(entities);
        Map<Long, List<String>> commitMap = allCommits.stream()
            .collect(Collectors.groupingBy(
                c -> c.getTicket().getId(),
                Collectors.mapping(TicketCommit::getCommitHash, Collectors.toList())
            ));

        return tickets.stream().map(t -> {
            Map<String, Object> row = new java.util.LinkedHashMap<>();
            row.put("ticketNumber",    t.getTicketNumber());
            row.put("title",           t.getTitle());
            row.put("status",          t.getStatus() != null ? t.getStatus() : "");
            row.put("priority",        t.getPriority() != null ? t.getPriority() : "");
            row.put("type",            t.getType() != null ? t.getType() : "");
            row.put("projectName",     t.getProjectName());
            row.put("assignee",        t.getAssignee() != null ? t.getAssignee().getFullName() : "");
            row.put("reporter",        t.getReporter() != null ? t.getReporter().getFullName() : "");
            row.put("dueDate",         t.getDueDate() != null ? t.getDueDate().toString() : "");
            row.put("estimatedHours",  t.getEstimatedHours() != null ? t.getEstimatedHours().toString() : "");
            row.put("actualHours",     t.getActualHours() != null ? t.getActualHours().toString() : "");
            row.put("labels",          t.getLabels() != null
                ? t.getLabels().stream().map(LabelResponse::getName).collect(Collectors.joining("; ")) : "");
            row.put("commentCount",    t.getCommentCount());
            row.put("attachmentCount", t.getAttachmentCount());
            row.put("commitIds",       String.join("; ", commitMap.getOrDefault(t.getId(), List.of())));
            row.put("createdAt",       t.getCreatedAt() != null ? t.getCreatedAt().toString() : "");
            row.put("updatedAt",       t.getUpdatedAt() != null ? t.getUpdatedAt().toString() : "");
            row.put("resolvedAt",      t.getResolvedAt() != null ? t.getResolvedAt().toString() : "");
            return row;
        }).collect(Collectors.toList());
    }
}
