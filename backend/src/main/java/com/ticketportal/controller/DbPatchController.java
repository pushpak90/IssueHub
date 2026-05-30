package com.ticketportal.controller;

import com.ticketportal.dto.response.ApiResponse;
import com.ticketportal.entity.DbPatch;
import com.ticketportal.exception.BadRequestException;
import com.ticketportal.exception.ResourceNotFoundException;
import com.ticketportal.repository.DbPatchRepository;
import com.ticketportal.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/admin/db-patches")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
@Tag(name = "DB Patches", description = "Admin-only database patch management")
@Slf4j
public class DbPatchController {

    private final DbPatchRepository patchRepository;
    private final JdbcTemplate jdbcTemplate;
    private final UserService userService;

    @GetMapping
    @Transactional(readOnly = true)
    @Operation(summary = "List all patches")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> listPatches() {
        List<Map<String, Object>> result = patchRepository.findAllByOrderByCreatedAtDesc()
            .stream().map(this::toMap).collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @PostMapping
    @Transactional
    @Operation(summary = "Create a new patch")
    public ResponseEntity<ApiResponse<Map<String, Object>>> createPatch(
            @RequestBody Map<String, String> body) {
        String name = body.get("name");
        String sql  = body.get("sqlContent");
        if (name == null || name.isBlank()) throw new BadRequestException("Patch name is required");
        if (sql  == null || sql.isBlank())  throw new BadRequestException("SQL content is required");

        DbPatch patch = DbPatch.builder()
            .name(name.trim())
            .description(body.get("description"))
            .sqlContent(sql)
            .status("PENDING")
            .createdBy(userService.getCurrentUser())
            .build();
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(ApiResponse.success("Patch created", toMap(patchRepository.save(patch))));
    }

    @PatchMapping("/{id}/execute")
    @Operation(summary = "Execute a PENDING patch")
    public ResponseEntity<ApiResponse<Map<String, Object>>> executePatch(
            @PathVariable Long id) {
        DbPatch patch = patchRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("DbPatch", "id", id));

        if ("APPLIED".equals(patch.getStatus()))
            throw new BadRequestException("Patch is already applied");

        String sql = patch.getSqlContent().trim();
        StringBuilder resultMsg = new StringBuilder();
        boolean success = true;

        // Split on semicolons to execute multiple statements
        String[] statements = sql.split(";");
        for (String stmt : statements) {
            String trimmed = stmt.trim();
            if (trimmed.isEmpty()) continue;
            try {
                log.info("Executing DB patch '{}' statement: {}", patch.getName(),
                    trimmed.substring(0, Math.min(trimmed.length(), 80)));
                jdbcTemplate.execute(trimmed);
                resultMsg.append("✓ OK: ").append(trimmed, 0, Math.min(trimmed.length(), 60)).append("...\n");
            } catch (Exception e) {
                success = false;
                resultMsg.append("✗ ERROR: ").append(e.getMessage()).append("\n");
                log.error("DB patch '{}' failed: {}", patch.getName(), e.getMessage());
                break;
            }
        }

        patch.setStatus(success ? "APPLIED" : "FAILED");
        patch.setExecutionResult(resultMsg.toString().trim());
        patch.setAppliedAt(LocalDateTime.now());
        patch.setAppliedBy(userService.getCurrentUser());
        patchRepository.save(patch);

        return ResponseEntity.ok(ApiResponse.success(
            success ? "Patch applied successfully" : "Patch failed — see result for details",
            toMap(patch)));
    }

    @DeleteMapping("/{id}")
    @Transactional
    @Operation(summary = "Delete a patch (only PENDING or FAILED)")
    public ResponseEntity<ApiResponse<String>> deletePatch(@PathVariable Long id) {
        DbPatch patch = patchRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("DbPatch", "id", id));
        if ("APPLIED".equals(patch.getStatus()))
            throw new BadRequestException("Cannot delete an already-applied patch");
        patchRepository.delete(patch);
        return ResponseEntity.ok(ApiResponse.success("Patch deleted"));
    }

    private Map<String, Object> toMap(DbPatch p) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id",              p.getId());
        m.put("name",            p.getName());
        m.put("description",     p.getDescription());
        m.put("sqlContent",      p.getSqlContent());
        m.put("status",          p.getStatus());
        m.put("executionResult", p.getExecutionResult());
        m.put("createdBy",       p.getCreatedBy() != null ? p.getCreatedBy().getFullName() : null);
        m.put("appliedBy",       p.getAppliedBy() != null ? p.getAppliedBy().getFullName() : null);
        m.put("createdAt",       p.getCreatedAt() != null ? p.getCreatedAt().toString() : null);
        m.put("appliedAt",       p.getAppliedAt() != null ? p.getAppliedAt().toString() : null);
        return m;
    }
}
