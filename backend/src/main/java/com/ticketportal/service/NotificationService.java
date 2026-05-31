package com.ticketportal.service;

import com.ticketportal.dto.response.NotificationResponse;
import com.ticketportal.dto.response.PagedResponse;
import com.ticketportal.entity.Notification;
import com.ticketportal.entity.Ticket;
import com.ticketportal.entity.User;
import com.ticketportal.entity.enums.NotificationType;
import com.ticketportal.exception.ResourceNotFoundException;
import com.ticketportal.repository.NotificationRepository;
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
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserService userService;

    public PagedResponse<NotificationResponse> getMyNotifications(int page, int size) {
        User user = userService.getCurrentUser();
        PageRequest pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        Page<Notification> notifications = notificationRepository.findByUserOrderByCreatedAtDesc(user, pageable);
        List<NotificationResponse> content = notifications.getContent().stream()
            .map(this::toResponse).collect(Collectors.toList());
        return PagedResponse.<NotificationResponse>builder()
            .content(content).page(notifications.getNumber()).size(notifications.getSize())
            .totalElements(notifications.getTotalElements()).totalPages(notifications.getTotalPages())
            .last(notifications.isLast()).first(notifications.isFirst()).build();
    }

    public long getUnreadCount() {
        User user = userService.getCurrentUser();
        return notificationRepository.countByUserAndReadFalse(user);
    }

    @Transactional
    public void markAsRead(Long id) {
        User user = userService.getCurrentUser();
        Notification notification = notificationRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Notification", "id", id));
        if (notification.getUser().getId().equals(user.getId())) {
            notification.setRead(true);
            notificationRepository.save(notification);
        }
    }

    @Transactional
    public void markAllAsRead() {
        User user = userService.getCurrentUser();
        notificationRepository.markAllAsRead(user);
    }

    public void createTicketAssignedNotification(Ticket ticket) {
        if (ticket.getAssignee() == null) return;
        createNotification(
            ticket.getAssignee(),
            "Ticket Assigned",
            "You have been assigned to: " + ticket.getTicketNumber() + " - " + ticket.getTitle(),
            NotificationType.TICKET_ASSIGNED,
            ticket.getId(), "TICKET"
        );
    }

    public void createStatusChangedNotification(Ticket ticket, User changedBy) {
        if (ticket.getReporter() == null) return;
        if (ticket.getReporter().getId().equals(changedBy.getId())) return;
        createNotification(
            ticket.getReporter(),
            "Ticket Status Updated",
            ticket.getTicketNumber() + " status changed to: " + ticket.getStatus(),
            NotificationType.TICKET_STATUS_CHANGED,
            ticket.getId(), "TICKET"
        );
    }

    public void createCommentNotification(Ticket ticket, User commentAuthor) {
        if (ticket.getAssignee() != null && !ticket.getAssignee().getId().equals(commentAuthor.getId())) {
            createNotification(
                ticket.getAssignee(),
                "New Comment",
                commentAuthor.getFullName() + " commented on: " + ticket.getTicketNumber(),
                NotificationType.TICKET_COMMENTED,
                ticket.getId(), "TICKET"
            );
        }
    }

    @Transactional
    public void createNotification(User user, String title, String message, NotificationType type,
                                    Long referenceId, String referenceType) {
        Notification notification = Notification.builder()
            .user(user).title(title).message(message).type(type)
            .referenceId(referenceId).referenceType(referenceType).read(false).build();
        notificationRepository.save(notification);
    }

    private NotificationResponse toResponse(Notification n) {
        return NotificationResponse.builder()
            .id(n.getId()).title(n.getTitle()).message(n.getMessage())
            .type(n.getType()).referenceId(n.getReferenceId()).referenceType(n.getReferenceType())
            .read(n.isRead()).createdAt(n.getCreatedAt()).build();
    }
}
