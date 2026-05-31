package com.ticketportal.controller;

import com.ticketportal.dto.request.PriorityConfigRequest;
import com.ticketportal.dto.request.StatusConfigRequest;
import com.ticketportal.dto.request.TypeConfigRequest;
import com.ticketportal.dto.response.ApiResponse;
import com.ticketportal.dto.response.PriorityConfigResponse;
import com.ticketportal.dto.response.StatusConfigResponse;
import com.ticketportal.dto.response.TypeConfigResponse;
import com.ticketportal.service.TicketConfigService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@Tag(name = "Ticket Configuration", description = "Dynamic ticket statuses, priorities, and types")
public class TicketConfigController {

    private final TicketConfigService configService;

    // ── Public read endpoints (any authenticated user) ────────────────────────

    @GetMapping("/config/statuses")
    @Operation(summary = "Get statuses (project-specific or global)")
    public ResponseEntity<ApiResponse<List<StatusConfigResponse>>> getStatuses(
            @RequestParam(required = false) Long projectId) {
        return ResponseEntity.ok(ApiResponse.success(configService.getStatuses(projectId)));
    }

    @GetMapping("/config/priorities")
    @Operation(summary = "Get all active priorities")
    public ResponseEntity<ApiResponse<List<PriorityConfigResponse>>> getPriorities() {
        return ResponseEntity.ok(ApiResponse.success(configService.getPriorities()));
    }

    @GetMapping("/config/types")
    @Operation(summary = "Get all active ticket types")
    public ResponseEntity<ApiResponse<List<TypeConfigResponse>>> getTypes() {
        return ResponseEntity.ok(ApiResponse.success(configService.getTypes()));
    }

    // ── Admin-only management endpoints ───────────────────────────────────────

    // Status management
    @GetMapping("/admin/config/statuses")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Get all statuses including inactive (admin)")
    public ResponseEntity<ApiResponse<List<StatusConfigResponse>>> getAllStatuses(
            @RequestParam(required = false) Long projectId) {
        if (projectId != null) {
            return ResponseEntity.ok(ApiResponse.success(configService.getProjectStatuses(projectId)));
        }
        return ResponseEntity.ok(ApiResponse.success(configService.getGlobalStatuses()));
    }

    @PostMapping("/admin/config/statuses")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Create a new status (global or project-specific)")
    public ResponseEntity<ApiResponse<StatusConfigResponse>> createStatus(
            @Valid @RequestBody StatusConfigRequest req) {
        return ResponseEntity.ok(ApiResponse.success("Status created", configService.createStatus(req)));
    }

    @PutMapping("/admin/config/statuses/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Update a status")
    public ResponseEntity<ApiResponse<StatusConfigResponse>> updateStatus(
            @PathVariable Long id, @RequestBody StatusConfigRequest req) {
        return ResponseEntity.ok(ApiResponse.success("Status updated", configService.updateStatus(id, req)));
    }

    @DeleteMapping("/admin/config/statuses/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Deactivate a status")
    public ResponseEntity<ApiResponse<String>> deleteStatus(@PathVariable Long id) {
        configService.deleteStatus(id);
        return ResponseEntity.ok(ApiResponse.success("Status deactivated"));
    }

    @PutMapping("/admin/config/statuses/reorder")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Reorder statuses")
    public ResponseEntity<ApiResponse<List<StatusConfigResponse>>> reorderStatuses(
            @RequestParam(required = false) Long projectId,
            @RequestBody List<Long> orderedIds) {
        return ResponseEntity.ok(ApiResponse.success(configService.reorderStatuses(projectId, orderedIds)));
    }

    // Priority management
    @GetMapping("/admin/config/priorities")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Get all priorities including inactive (admin)")
    public ResponseEntity<ApiResponse<List<PriorityConfigResponse>>> getAllPriorities() {
        return ResponseEntity.ok(ApiResponse.success(configService.getAllPriorities()));
    }

    @PostMapping("/admin/config/priorities")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Create a new priority")
    public ResponseEntity<ApiResponse<PriorityConfigResponse>> createPriority(
            @Valid @RequestBody PriorityConfigRequest req) {
        return ResponseEntity.ok(ApiResponse.success("Priority created", configService.createPriority(req)));
    }

    @PutMapping("/admin/config/priorities/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Update a priority")
    public ResponseEntity<ApiResponse<PriorityConfigResponse>> updatePriority(
            @PathVariable Long id, @RequestBody PriorityConfigRequest req) {
        return ResponseEntity.ok(ApiResponse.success("Priority updated", configService.updatePriority(id, req)));
    }

    @DeleteMapping("/admin/config/priorities/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Deactivate a priority")
    public ResponseEntity<ApiResponse<String>> deletePriority(@PathVariable Long id) {
        configService.deletePriority(id);
        return ResponseEntity.ok(ApiResponse.success("Priority deactivated"));
    }

    // Type management
    @GetMapping("/admin/config/types")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Get all types including inactive (admin)")
    public ResponseEntity<ApiResponse<List<TypeConfigResponse>>> getAllTypes() {
        return ResponseEntity.ok(ApiResponse.success(configService.getAllTypes()));
    }

    @PostMapping("/admin/config/types")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Create a new ticket type")
    public ResponseEntity<ApiResponse<TypeConfigResponse>> createType(
            @Valid @RequestBody TypeConfigRequest req) {
        return ResponseEntity.ok(ApiResponse.success("Type created", configService.createType(req)));
    }

    @PutMapping("/admin/config/types/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Update a ticket type")
    public ResponseEntity<ApiResponse<TypeConfigResponse>> updateType(
            @PathVariable Long id, @RequestBody TypeConfigRequest req) {
        return ResponseEntity.ok(ApiResponse.success("Type updated", configService.updateType(id, req)));
    }

    @DeleteMapping("/admin/config/types/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Deactivate a ticket type")
    public ResponseEntity<ApiResponse<String>> deleteType(@PathVariable Long id) {
        configService.deleteType(id);
        return ResponseEntity.ok(ApiResponse.success("Type deactivated"));
    }
}
