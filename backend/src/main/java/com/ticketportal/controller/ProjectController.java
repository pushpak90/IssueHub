package com.ticketportal.controller;

import com.ticketportal.dto.request.CreateProjectRequest;
import com.ticketportal.dto.response.ApiResponse;
import com.ticketportal.dto.response.LabelResponse;
import com.ticketportal.dto.response.PagedResponse;
import com.ticketportal.dto.response.ProjectResponse;
import com.ticketportal.entity.Label;
import com.ticketportal.repository.LabelRepository;
import com.ticketportal.service.ProjectService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/projects")
@RequiredArgsConstructor
@Tag(name = "Projects", description = "Project management endpoints")
public class ProjectController {

    private final ProjectService projectService;
    private final LabelRepository labelRepository;

    @PostMapping
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    @Operation(summary = "Create a new project")
    public ResponseEntity<ApiResponse<ProjectResponse>> createProject(@Valid @RequestBody CreateProjectRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(ApiResponse.success("Project created", projectService.createProject(request)));
    }

    @GetMapping
    @Operation(summary = "Get all projects")
    public ResponseEntity<ApiResponse<PagedResponse<ProjectResponse>>> getAllProjects(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String search) {
        return ResponseEntity.ok(ApiResponse.success(projectService.getAllProjects(page, size, search)));
    }

    @GetMapping("/my")
    @Operation(summary = "Get my projects")
    public ResponseEntity<ApiResponse<PagedResponse<ProjectResponse>>> getMyProjects(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(ApiResponse.success(projectService.getMyProjects(page, size)));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get project by ID")
    public ResponseEntity<ApiResponse<ProjectResponse>> getProject(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(projectService.getProjectById(id)));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update project")
    public ResponseEntity<ApiResponse<ProjectResponse>> updateProject(@PathVariable Long id,
            @Valid @RequestBody CreateProjectRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Project updated", projectService.updateProject(id, request)));
    }

    @PostMapping("/{id}/members/{userId}")
    @Operation(summary = "Add member to project")
    public ResponseEntity<ApiResponse<String>> addMember(@PathVariable Long id, @PathVariable Long userId) {
        projectService.addMember(id, userId);
        return ResponseEntity.ok(ApiResponse.success("Member added"));
    }

    @DeleteMapping("/{id}/members/{userId}")
    @Operation(summary = "Remove member from project")
    public ResponseEntity<ApiResponse<String>> removeMember(@PathVariable Long id, @PathVariable Long userId) {
        projectService.removeMember(id, userId);
        return ResponseEntity.ok(ApiResponse.success("Member removed"));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete project")
    public ResponseEntity<ApiResponse<String>> deleteProject(@PathVariable Long id) {
        projectService.deleteProject(id);
        return ResponseEntity.ok(ApiResponse.success("Project deleted"));
    }

    @PatchMapping("/{id}/archive")
    @Operation(summary = "Archive project")
    public ResponseEntity<ApiResponse<String>> archiveProject(@PathVariable Long id) {
        projectService.archiveProject(id);
        return ResponseEntity.ok(ApiResponse.success("Project archived"));
    }

    @GetMapping("/{id}/labels")
    @Operation(summary = "Get project labels")
    public ResponseEntity<ApiResponse<List<LabelResponse>>> getProjectLabels(@PathVariable Long id) {
        com.ticketportal.entity.Project project = projectService.findById(id);
        List<LabelResponse> labels = labelRepository.findByProject(project).stream()
            .map(l -> LabelResponse.builder().id(l.getId()).name(l.getName()).color(l.getColor()).build())
            .collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success(labels));
    }

    @PostMapping("/{id}/labels")
    @Operation(summary = "Create label for project")
    public ResponseEntity<ApiResponse<LabelResponse>> createLabel(@PathVariable Long id,
            @RequestBody Map<String, String> body) {
        com.ticketportal.entity.Project project = projectService.findById(id);
        Label label = Label.builder()
            .name(body.get("name"))
            .color(body.get("color"))
            .project(project)
            .build();
        Label saved = labelRepository.save(label);
        LabelResponse response = LabelResponse.builder()
            .id(saved.getId()).name(saved.getName()).color(saved.getColor()).build();
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success("Label created", response));
    }
}
