package com.ticketportal.controller;

import com.ticketportal.dto.response.ApiResponse;
import com.ticketportal.entity.Role;
import com.ticketportal.entity.SystemSetting;
import com.ticketportal.repository.RoleRepository;
import com.ticketportal.repository.UserRepository;
import com.ticketportal.service.SystemSettingService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/admin")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
@Tag(name = "Admin", description = "Admin-only configuration endpoints")
public class AdminController {

    private final SystemSettingService settingService;
    private final RoleRepository roleRepository;
    private final UserRepository userRepository;

    // ── System Settings ───────────────────────────────────────────────────────

    @GetMapping("/settings")
    @Operation(summary = "Get all system settings")
    public ResponseEntity<ApiResponse<List<SystemSetting>>> getSettings() {
        return ResponseEntity.ok(ApiResponse.success(settingService.getAllSettings()));
    }

    @GetMapping("/settings/map")
    @Operation(summary = "Get settings as flat key-value map")
    public ResponseEntity<ApiResponse<Map<String, String>>> getSettingsMap() {
        return ResponseEntity.ok(ApiResponse.success(settingService.getAllSettingsAsMap()));
    }

    @PutMapping("/settings")
    @Operation(summary = "Update multiple settings")
    public ResponseEntity<ApiResponse<String>> updateSettings(@RequestBody Map<String, String> updates) {
        settingService.updateSettings(updates);
        return ResponseEntity.ok(ApiResponse.success("Settings saved successfully"));
    }

    @PutMapping("/settings/{key}")
    @Operation(summary = "Update a single setting")
    public ResponseEntity<ApiResponse<SystemSetting>> updateSetting(
            @PathVariable String key,
            @RequestBody Map<String, String> body) {
        SystemSetting updated = settingService.updateSetting(key, body.get("value"));
        return ResponseEntity.ok(ApiResponse.success("Setting updated", updated));
    }

    // ── Role Management ───────────────────────────────────────────────────────

    @GetMapping("/roles")
    @Operation(summary = "Get all roles with user counts")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getRoles() {
        List<Role> roles = roleRepository.findAll();
        List<Map<String, Object>> result = roles.stream().map(role -> {
            long userCount = userRepository.findAll().stream()
                .filter(u -> u.getRoles().stream().anyMatch(r -> r.getId().equals(role.getId())))
                .count();
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id",        role.getId());
            m.put("name",      role.getName());
            m.put("label",     role.getName().replace("ROLE_", ""));
            m.put("userCount", userCount);
            m.put("description", getRoleDescription(role.getName()));
            return m;
        }).collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @PostMapping("/roles")
    @Operation(summary = "Create a custom role")
    public ResponseEntity<ApiResponse<Role>> createRole(@RequestBody Map<String, String> body) {
        String name = body.get("name").toUpperCase().trim();
        if (!name.startsWith("ROLE_")) name = "ROLE_" + name;
        if (roleRepository.existsByName(name)) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Role already exists: " + name));
        }
        Role role = roleRepository.save(Role.builder().name(name).build());
        return ResponseEntity.ok(ApiResponse.success("Role created", role));
    }

    @DeleteMapping("/roles/{id}")
    @Operation(summary = "Delete a custom role")
    public ResponseEntity<ApiResponse<String>> deleteRole(@PathVariable Long id) {
        Role role = roleRepository.findById(id)
            .orElseThrow(() -> new com.ticketportal.exception.ResourceNotFoundException("Role","id", id));
        String name = role.getName();
        if (name.equals("ROLE_ADMIN") || name.equals("ROLE_MANAGER") ||
            name.equals("ROLE_DEVELOPER") || name.equals("ROLE_TESTER")) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Cannot delete system roles"));
        }
        roleRepository.delete(role);
        return ResponseEntity.ok(ApiResponse.success("Role deleted"));
    }

    // ── Stats overview ────────────────────────────────────────────────────────

    @GetMapping("/overview")
    @Operation(summary = "Get admin overview stats")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getOverview() {
        Map<String, Object> overview = new LinkedHashMap<>();
        overview.put("totalUsers",    userRepository.count());
        overview.put("activeUsers",   userRepository.findAll().stream().filter(u -> u.isActive()).count());
        overview.put("totalRoles",    roleRepository.count());
        overview.put("settingsCount", settingService.getAllSettings().size());
        return ResponseEntity.ok(ApiResponse.success(overview));
    }

    private String getRoleDescription(String roleName) {
        return switch (roleName) {
            case "ROLE_ADMIN"     -> "Full system access — manage users, roles, settings, all projects and tickets";
            case "ROLE_MANAGER"   -> "Create/manage projects and teams, assign tickets, view all reports";
            case "ROLE_DEVELOPER" -> "Create and update tickets, comment, upload attachments";
            case "ROLE_TESTER"    -> "Create test tickets, report bugs, update ticket status";
            default               -> "Custom role";
        };
    }
}
