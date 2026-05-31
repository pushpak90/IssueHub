package com.ticketportal.service;

import com.ticketportal.dto.request.CreateProjectRequest;
import com.ticketportal.dto.response.LabelResponse;
import com.ticketportal.dto.response.PagedResponse;
import com.ticketportal.dto.response.ProjectResponse;
import com.ticketportal.entity.Project;
import com.ticketportal.entity.User;
import com.ticketportal.entity.enums.ProjectStatus;
import com.ticketportal.exception.BadRequestException;
import com.ticketportal.exception.ResourceNotFoundException;
import com.ticketportal.exception.UnauthorizedException;
import com.ticketportal.entity.ProjectCategory;
import com.ticketportal.repository.ProjectCategoryRepository;
import com.ticketportal.repository.ProjectRepository;
import com.ticketportal.repository.TicketRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ProjectService {

    private final ProjectRepository projectRepository;
    private final TicketRepository ticketRepository;
    private final ProjectCategoryRepository categoryRepository;
    private final UserService userService;

    @Transactional
    public ProjectResponse createProject(CreateProjectRequest request) {
        User currentUser = userService.getCurrentUser();
        if (projectRepository.existsByKeyPrefix(request.getKeyPrefix())) {
            throw new BadRequestException("Project key '" + request.getKeyPrefix() + "' already exists");
        }
        Project project = Project.builder()
            .name(request.getName())
            .description(request.getDescription())
            .keyPrefix(request.getKeyPrefix())
            .owner(currentUser)
            .status(ProjectStatus.ACTIVE)
            .build();
        project.getMembers().add(currentUser);

        // Assign to category if provided
        if (request.getCategoryId() != null) {
            categoryRepository.findById(request.getCategoryId())
                .ifPresent(project::setCategory);
        }

        return toResponse(projectRepository.save(project));
    }

    @Transactional(readOnly = true)
    public ProjectResponse getProjectById(Long id) {
        return toResponse(findById(id));
    }

    @Transactional(readOnly = true)
    public Project findById(Long id) {
        return projectRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Project", "id", id));
    }

    @Transactional(readOnly = true)
    public PagedResponse<ProjectResponse> getMyProjects(int page, int size) {
        User user = userService.getCurrentUser();
        PageRequest pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        Page<Project> projects = projectRepository.findProjectsByUser(user, pageable);
        return toPagedResponse(projects);
    }

    @Transactional(readOnly = true)
    public PagedResponse<ProjectResponse> getAllProjects(int page, int size, String search) {
        PageRequest pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        Page<Project> projects = (search != null && !search.isBlank())
            ? projectRepository.searchProjects(search, pageable)
            : projectRepository.findAll(pageable);
        return toPagedResponse(projects);
    }

    @Transactional
    public ProjectResponse updateProject(Long id, CreateProjectRequest request) {
        Project project = findById(id);
        checkOwnerOrAdmin(project);
        if (request.getName() != null) project.setName(request.getName());
        if (request.getDescription() != null) project.setDescription(request.getDescription());

        // categoryId == 0L → remove from category; > 0 → assign; null → keep existing
        if (request.getCategoryId() != null) {
            if (request.getCategoryId() == 0L) {
                project.setCategory(null);
            } else {
                categoryRepository.findById(request.getCategoryId())
                    .ifPresent(project::setCategory);
            }
        }

        return toResponse(projectRepository.save(project));
    }

    @Transactional
    public void deleteProject(Long id) {
        Project project = findById(id);
        checkOwnerOrAdmin(project);
        projectRepository.delete(project);
    }

    @Transactional
    public void addMember(Long projectId, Long userId) {
        Project project = findById(projectId);
        checkOwnerOrAdmin(project);
        User user = userService.findById(userId);
        project.getMembers().add(user);
        projectRepository.save(project);
    }

    @Transactional
    public void removeMember(Long projectId, Long userId) {
        Project project = findById(projectId);
        checkOwnerOrAdmin(project);
        User user = userService.findById(userId);
        project.getMembers().remove(user);
        projectRepository.save(project);
    }

    @Transactional
    public void archiveProject(Long id) {
        Project project = findById(id);
        checkOwnerOrAdmin(project);
        project.setStatus(ProjectStatus.ARCHIVED);
        projectRepository.save(project);
    }

    private void checkOwnerOrAdmin(Project project) {
        User user = userService.getCurrentUser();
        boolean isAdmin = user.getRoles().stream().anyMatch(r -> r.getName().equals("ROLE_ADMIN"));
        if (!isAdmin && !project.getOwner().getId().equals(user.getId())) {
            throw new UnauthorizedException("You don't have permission to modify this project");
        }
    }

    public ProjectResponse toResponse(Project project) {
        long total = ticketRepository.countByProject(project);
        long open = ticketRepository.countByProjectAndStatus(project, "DONE");

        return ProjectResponse.builder()
            .id(project.getId())
            .name(project.getName())
            .description(project.getDescription())
            .keyPrefix(project.getKeyPrefix())
            .status(project.getStatus())
            .categoryId(project.getCategory() != null ? project.getCategory().getId() : null)
            .categoryName(project.getCategory() != null ? project.getCategory().getName() : null)
            .categoryColor(project.getCategory() != null ? project.getCategory().getColor() : null)
            .categoryIcon(project.getCategory() != null ? project.getCategory().getIcon() : null)
            .owner(userService.toResponse(project.getOwner()))
            .members(project.getMembers().stream().map(userService::toResponse).collect(Collectors.toList()))
            .memberCount(project.getMembers().size())
            .totalTickets(total)
            .openTickets(total - open)
            .createdAt(project.getCreatedAt())
            .updatedAt(project.getUpdatedAt())
            .build();
    }

    private PagedResponse<ProjectResponse> toPagedResponse(Page<Project> page) {
        return PagedResponse.<ProjectResponse>builder()
            .content(page.getContent().stream().map(this::toResponse).collect(Collectors.toList()))
            .page(page.getNumber()).size(page.getSize())
            .totalElements(page.getTotalElements()).totalPages(page.getTotalPages())
            .last(page.isLast()).first(page.isFirst()).build();
    }
}
