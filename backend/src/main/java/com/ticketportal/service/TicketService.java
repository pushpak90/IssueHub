package com.ticketportal.service;

import com.ticketportal.dto.request.CreateTicketRequest;
import com.ticketportal.dto.request.UpdateTicketRequest;
import com.ticketportal.dto.response.*;
import com.ticketportal.entity.*;
import com.ticketportal.entity.enums.TicketPriority;
import com.ticketportal.entity.enums.TicketStatus;
import com.ticketportal.entity.enums.TicketType;
import com.ticketportal.exception.ResourceNotFoundException;
import com.ticketportal.exception.UnauthorizedException;
import com.ticketportal.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class TicketService {

    private final TicketRepository ticketRepository;
    private final ProjectRepository projectRepository;
    private final LabelRepository labelRepository;
    private final TicketHistoryRepository historyRepository;
    private final AttachmentRepository attachmentRepository;
    private final UserService userService;
    private final NotificationService notificationService;

    @Transactional
    public TicketResponse createTicket(CreateTicketRequest request) {
        User currentUser = userService.getCurrentUser();
        Project project = projectRepository.findById(request.getProjectId())
            .orElseThrow(() -> new ResourceNotFoundException("Project", "id", request.getProjectId()));

        String ticketNumber = project.getKeyPrefix() + "-" + (project.getTicketCounter() + 1);
        project.setTicketCounter(project.getTicketCounter() + 1);
        projectRepository.save(project);

        Ticket ticket = Ticket.builder()
            .ticketNumber(ticketNumber)
            .title(request.getTitle())
            .description(request.getDescription())
            .priority(request.getPriority() != null ? request.getPriority() : TicketPriority.MEDIUM)
            .type(request.getType() != null ? request.getType() : TicketType.TASK)
            .project(project)
            .reporter(currentUser)
            .dueDate(request.getDueDate())
            .estimatedHours(request.getEstimatedHours())
            .build();

        if (request.getAssigneeId() != null) {
            User assignee = userService.findById(request.getAssigneeId());
            ticket.setAssignee(assignee);
        }

        if (request.getLabelIds() != null && !request.getLabelIds().isEmpty()) {
            Set<Label> labels = new HashSet<>(labelRepository.findAllById(request.getLabelIds()));
            ticket.setLabels(labels);
        }

        Ticket saved = ticketRepository.save(ticket);

        recordHistory(saved, currentUser, "CREATED", null, null, "CREATED");

        if (saved.getAssignee() != null && !saved.getAssignee().getId().equals(currentUser.getId())) {
            notificationService.createTicketAssignedNotification(saved);
        }

        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public TicketResponse getTicketById(Long id) {
        return toResponse(findById(id));
    }

    @Transactional(readOnly = true)
    public TicketResponse getTicketByNumber(String ticketNumber) {
        Ticket ticket = ticketRepository.findByTicketNumber(ticketNumber)
            .orElseThrow(() -> new ResourceNotFoundException("Ticket", "number", ticketNumber));
        return toResponse(ticket);
    }

    @Transactional(readOnly = true)
    public Ticket findById(Long id) {
        return ticketRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Ticket", "id", id));
    }

    @Transactional(readOnly = true)
    public PagedResponse<TicketResponse> getTicketsForProject(Long projectId, int page, int size,
            TicketStatus status, TicketPriority priority, TicketType type,
            Long assigneeId, String search) {
        Project project = projectRepository.findById(projectId)
            .orElseThrow(() -> new ResourceNotFoundException("Project", "id", projectId));
        PageRequest pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        String searchTerm = (search != null && !search.isBlank()) ? search : "";
        Page<Ticket> tickets = ticketRepository.findTicketsWithFilters(
            project, status, priority, type, assigneeId, searchTerm, pageable);
        return toPagedResponse(tickets);
    }

    @Transactional(readOnly = true)
    public PagedResponse<TicketResponse> getAllTicketsGlobal(int page, int size,
            Long projectId, TicketStatus status, TicketPriority priority,
            Long assigneeId, String search) {
        // assigneeId is fully controlled by the caller — no forced override
        String searchTerm = (search != null && !search.isBlank()) ? search : "";
        PageRequest pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        return toPagedResponse(ticketRepository.findAllTicketsGlobal(
            projectId, status, priority, assigneeId, searchTerm, pageable));
    }

    @Transactional(readOnly = true)
    public List<com.ticketportal.entity.Ticket> findAllByIds(List<Long> ids) {
        return ticketRepository.findAllById(ids);
    }

    @Transactional(readOnly = true)
    public PagedResponse<TicketResponse> getMyTickets(int page, int size) {
        User user = userService.getCurrentUser();
        PageRequest pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        return toPagedResponse(ticketRepository.findByAssignee(user, pageable));
    }

    @Transactional
    public TicketResponse updateTicket(Long id, UpdateTicketRequest request) {
        User currentUser = userService.getCurrentUser();
        Ticket ticket = findById(id);

        if (request.getTitle() != null && !request.getTitle().equals(ticket.getTitle())) {
            recordHistory(ticket, currentUser, "title", ticket.getTitle(), request.getTitle(), "UPDATED");
            ticket.setTitle(request.getTitle());
        }
        if (request.getDescription() != null) ticket.setDescription(request.getDescription());

        if (request.getStatus() != null && !request.getStatus().equals(ticket.getStatus())) {
            recordHistory(ticket, currentUser, "status",
                ticket.getStatus().getDisplayName(),
                request.getStatus().getDisplayName(), "STATUS_CHANGED");
            if (request.getStatus() == TicketStatus.DONE || request.getStatus() == TicketStatus.CLOSED) {
                ticket.setResolvedAt(LocalDateTime.now());
            }
            ticket.setStatus(request.getStatus());
            notificationService.createStatusChangedNotification(ticket, currentUser);
        }

        if (request.getPriority() != null && !request.getPriority().equals(ticket.getPriority())) {
            recordHistory(ticket, currentUser, "priority",
                ticket.getPriority().getDisplayName(),
                request.getPriority().getDisplayName(), "UPDATED");
            ticket.setPriority(request.getPriority());
        }

        if (request.getType() != null && !request.getType().equals(ticket.getType())) {
            recordHistory(ticket, currentUser, "type",
                ticket.getType().getDisplayName(),
                request.getType().getDisplayName(), "UPDATED");
            ticket.setType(request.getType());
        }

        if (request.getDueDate() != null && !request.getDueDate().equals(ticket.getDueDate())) {
            recordHistory(ticket, currentUser, "dueDate",
                ticket.getDueDate() != null ? ticket.getDueDate().toString() : "None",
                request.getDueDate().toString(), "UPDATED");
            ticket.setDueDate(request.getDueDate());
        }
        if (request.getEstimatedHours() != null) ticket.setEstimatedHours(request.getEstimatedHours());
        if (request.getActualHours() != null) ticket.setActualHours(request.getActualHours());
        if (request.getResolutionNote() != null) ticket.setResolutionNote(request.getResolutionNote());

        if (request.getAssigneeId() != null) {
            Long oldAssigneeId = ticket.getAssignee() != null ? ticket.getAssignee().getId() : null;
            if (!request.getAssigneeId().equals(oldAssigneeId)) {
                User newAssignee = userService.findById(request.getAssigneeId());
                // Store names instead of IDs
                String oldName = ticket.getAssignee() != null ? ticket.getAssignee().getFullName() : "Unassigned";
                String newName = newAssignee.getFullName();
                recordHistory(ticket, currentUser, "assignee", oldName, newName, "UPDATED");
                ticket.setAssignee(newAssignee);
                notificationService.createTicketAssignedNotification(ticket);
            }
        }

        if (request.getLabelIds() != null) {
            ticket.setLabels(new HashSet<>(labelRepository.findAllById(request.getLabelIds())));
        }

        return toResponse(ticketRepository.save(ticket));
    }

    @Transactional
    public void deleteTicket(Long id) {
        User currentUser = userService.getCurrentUser();
        Ticket ticket = findById(id);
        boolean isAdmin = currentUser.getRoles().stream().anyMatch(r -> r.getName().equals("ROLE_ADMIN"));
        if (!isAdmin && !ticket.getReporter().getId().equals(currentUser.getId())) {
            throw new UnauthorizedException("You don't have permission to delete this ticket");
        }
        ticketRepository.delete(ticket);
    }

    @Transactional(readOnly = true)
    public List<TicketHistoryResponse> getTicketHistory(Long id) {
        Ticket ticket = findById(id);
        return historyRepository.findByTicketOrderByCreatedAtDesc(ticket).stream()
            .map(h -> TicketHistoryResponse.builder()
                .id(h.getId())
                .changedBy(userService.toResponse(h.getChangedBy()))
                .fieldName(h.getFieldName())
                .oldValue(h.getOldValue())
                .newValue(h.getNewValue())
                .changeType(h.getChangeType())
                .createdAt(h.getCreatedAt())
                .build())
            .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<AttachmentResponse> getTicketAttachments(Long id) {
        Ticket ticket = findById(id);
        return attachmentRepository.findByTicket(ticket).stream()
            .map(a -> AttachmentResponse.builder()
                .id(a.getId())
                .fileName(a.getFileName())
                .originalName(a.getOriginalName())
                .fileSize(a.getFileSize())
                .contentType(a.getContentType())
                .downloadUrl("/api/files/download/" + a.getFileName())
                .uploadedBy(userService.toResponse(a.getUploadedBy()))
                .createdAt(a.getCreatedAt())
                .build())
            .collect(Collectors.toList());
    }

    private void recordHistory(Ticket ticket, User user, String field, String oldVal, String newVal, String type) {
        TicketHistory history = TicketHistory.builder()
            .ticket(ticket).changedBy(user).fieldName(field)
            .oldValue(oldVal).newValue(newVal).changeType(type).build();
        historyRepository.save(history);
    }

    public TicketResponse toResponse(Ticket ticket) {
        return TicketResponse.builder()
            .id(ticket.getId())
            .ticketNumber(ticket.getTicketNumber())
            .title(ticket.getTitle())
            .description(ticket.getDescription())
            .status(ticket.getStatus())
            .priority(ticket.getPriority())
            .type(ticket.getType())
            .projectId(ticket.getProject().getId())
            .projectName(ticket.getProject().getName())
            .reporter(ticket.getReporter() != null ? userService.toResponse(ticket.getReporter()) : null)
            .assignee(ticket.getAssignee() != null ? userService.toResponse(ticket.getAssignee()) : null)
            .dueDate(ticket.getDueDate())
            .estimatedHours(ticket.getEstimatedHours())
            .actualHours(ticket.getActualHours())
            .labels(ticket.getLabels().stream()
                .map(l -> LabelResponse.builder().id(l.getId()).name(l.getName()).color(l.getColor()).build())
                .collect(Collectors.toList()))
            .commentCount(ticket.getComments().size())
            .attachmentCount(ticket.getAttachments().size())
            .resolutionNote(ticket.getResolutionNote())
            .createdAt(ticket.getCreatedAt())
            .updatedAt(ticket.getUpdatedAt())
            .resolvedAt(ticket.getResolvedAt())
            .build();
    }

    private PagedResponse<TicketResponse> toPagedResponse(Page<Ticket> page) {
        return PagedResponse.<TicketResponse>builder()
            .content(page.getContent().stream().map(this::toResponse).collect(Collectors.toList()))
            .page(page.getNumber()).size(page.getSize())
            .totalElements(page.getTotalElements()).totalPages(page.getTotalPages())
            .last(page.isLast()).first(page.isFirst()).build();
    }
}
