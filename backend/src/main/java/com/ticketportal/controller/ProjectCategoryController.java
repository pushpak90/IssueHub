package com.ticketportal.controller;

import com.ticketportal.dto.response.ApiResponse;
import com.ticketportal.entity.Project;
import com.ticketportal.entity.ProjectCategory;
import com.ticketportal.exception.BadRequestException;
import com.ticketportal.exception.ResourceNotFoundException;
import com.ticketportal.repository.ProjectCategoryRepository;
import com.ticketportal.repository.ProjectRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/categories")
@RequiredArgsConstructor
@Tag(name = "Project Categories", description = "Project category management")
public class ProjectCategoryController {

    private final ProjectCategoryRepository categoryRepository;
    private final ProjectRepository projectRepository;

    @GetMapping
    @Transactional(readOnly = true)
    @Operation(summary = "Get all categories with their projects")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getAll() {
        List<Map<String, Object>> result = categoryRepository.findAllByOrderByNameAsc()
            .stream().map(this::toMap).collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @GetMapping("/{id}")
    @Transactional(readOnly = true)
    @Operation(summary = "Get category by ID")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getById(@PathVariable Long id) {
        ProjectCategory cat = getCategory(id);
        return ResponseEntity.ok(ApiResponse.success(toMap(cat)));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    @Operation(summary = "Create a category — Admin/Manager only")
    public ResponseEntity<ApiResponse<Map<String, Object>>> create(@RequestBody Map<String, String> body) {
        String name = body.get("name");
        if (name == null || name.isBlank()) throw new BadRequestException("Category name is required");
        if (categoryRepository.existsByName(name))
            throw new BadRequestException("Category '" + name + "' already exists");

        ProjectCategory cat = ProjectCategory.builder()
            .name(name.trim())
            .description(body.get("description"))
            .color(body.getOrDefault("color", "#3B82F6"))
            .icon(body.getOrDefault("icon", "📁"))
            .build();
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(ApiResponse.success("Category created", toMap(categoryRepository.save(cat))));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    @Operation(summary = "Update a category")
    public ResponseEntity<ApiResponse<Map<String, Object>>> update(
            @PathVariable Long id, @RequestBody Map<String, String> body) {
        ProjectCategory cat = getCategory(id);
        if (body.containsKey("name"))        cat.setName(body.get("name"));
        if (body.containsKey("description")) cat.setDescription(body.get("description"));
        if (body.containsKey("color"))       cat.setColor(body.get("color"));
        if (body.containsKey("icon"))        cat.setIcon(body.get("icon"));
        return ResponseEntity.ok(ApiResponse.success("Category updated", toMap(categoryRepository.save(cat))));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    @Transactional
    @Operation(summary = "Delete a category — unassigns all its projects")
    public ResponseEntity<ApiResponse<String>> delete(@PathVariable Long id) {
        ProjectCategory cat = getCategory(id);
        // Unassign all projects from this category before deleting
        List<Project> projects = projectRepository.findByCategoryId(id);
        projects.forEach(p -> { p.setCategory(null); projectRepository.save(p); });
        categoryRepository.delete(cat);
        return ResponseEntity.ok(ApiResponse.success("Category deleted"));
    }

    @PatchMapping("/projects/{projectId}/assign/{categoryId}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    @Operation(summary = "Assign a project to a category")
    public ResponseEntity<ApiResponse<String>> assignProject(
            @PathVariable Long projectId, @PathVariable Long categoryId) {
        Project project = projectRepository.findById(projectId)
            .orElseThrow(() -> new ResourceNotFoundException("Project", "id", projectId));
        ProjectCategory cat = getCategory(categoryId);
        project.setCategory(cat);
        projectRepository.save(project);
        return ResponseEntity.ok(ApiResponse.success("Project assigned to category: " + cat.getName()));
    }

    @PatchMapping("/projects/{projectId}/unassign")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    @Operation(summary = "Remove project from its category")
    public ResponseEntity<ApiResponse<String>> unassignProject(@PathVariable Long projectId) {
        Project project = projectRepository.findById(projectId)
            .orElseThrow(() -> new ResourceNotFoundException("Project", "id", projectId));
        project.setCategory(null);
        projectRepository.save(project);
        return ResponseEntity.ok(ApiResponse.success("Project unassigned from category"));
    }

    private ProjectCategory getCategory(Long id) {
        return categoryRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("ProjectCategory", "id", id));
    }

    private Map<String, Object> toMap(ProjectCategory cat) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id",           cat.getId());
        m.put("name",         cat.getName());
        m.put("description",  cat.getDescription());
        m.put("color",        cat.getColor());
        m.put("icon",         cat.getIcon());
        m.put("projectCount", cat.getProjects().size());
        m.put("projects", cat.getProjects().stream().map(p -> {
            Map<String, Object> pm = new LinkedHashMap<>();
            pm.put("id",        p.getId());
            pm.put("name",      p.getName());
            pm.put("keyPrefix", p.getKeyPrefix());
            pm.put("status",    p.getStatus().name());
            return pm;
        }).collect(Collectors.toList()));
        m.put("createdAt", cat.getCreatedAt() != null ? cat.getCreatedAt().toString() : null);
        return m;
    }
}
