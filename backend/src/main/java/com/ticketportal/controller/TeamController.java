package com.ticketportal.controller;

import com.ticketportal.dto.request.CreateTeamRequest;
import com.ticketportal.dto.response.ApiResponse;
import com.ticketportal.dto.response.TeamResponse;
import com.ticketportal.service.TeamService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/teams")
@RequiredArgsConstructor
@Tag(name = "Teams", description = "Team management endpoints")
public class TeamController {

    private final TeamService teamService;

    @PostMapping
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    @Operation(summary = "Create a team")
    public ResponseEntity<ApiResponse<TeamResponse>> createTeam(@Valid @RequestBody CreateTeamRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(ApiResponse.success("Team created", teamService.createTeam(request)));
    }

    @GetMapping
    @Operation(summary = "Get all teams")
    public ResponseEntity<ApiResponse<List<TeamResponse>>> getAllTeams() {
        return ResponseEntity.ok(ApiResponse.success(teamService.getAllTeams()));
    }

    @GetMapping("/project/{projectId}")
    @Operation(summary = "Get teams for a project")
    public ResponseEntity<ApiResponse<List<TeamResponse>>> getProjectTeams(@PathVariable Long projectId) {
        return ResponseEntity.ok(ApiResponse.success(teamService.getProjectTeams(projectId)));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get team by ID")
    public ResponseEntity<ApiResponse<TeamResponse>> getTeam(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(teamService.getTeamById(id)));
    }

    @PostMapping("/{id}/members/{userId}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    @Operation(summary = "Add member to team")
    public ResponseEntity<ApiResponse<TeamResponse>> addMember(@PathVariable Long id, @PathVariable Long userId) {
        return ResponseEntity.ok(ApiResponse.success("Member added", teamService.addMember(id, userId)));
    }

    @DeleteMapping("/{id}/members/{userId}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    @Operation(summary = "Remove member from team")
    public ResponseEntity<ApiResponse<TeamResponse>> removeMember(@PathVariable Long id, @PathVariable Long userId) {
        return ResponseEntity.ok(ApiResponse.success("Member removed", teamService.removeMember(id, userId)));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    @Operation(summary = "Delete team")
    public ResponseEntity<ApiResponse<String>> deleteTeam(@PathVariable Long id) {
        teamService.deleteTeam(id);
        return ResponseEntity.ok(ApiResponse.success("Team deleted"));
    }
}
