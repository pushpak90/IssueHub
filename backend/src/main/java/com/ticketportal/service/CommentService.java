package com.ticketportal.service;

import com.ticketportal.dto.request.CreateCommentRequest;
import com.ticketportal.dto.response.CommentResponse;
import com.ticketportal.entity.Comment;
import com.ticketportal.entity.Ticket;
import com.ticketportal.entity.User;
import com.ticketportal.exception.ResourceNotFoundException;
import com.ticketportal.exception.UnauthorizedException;
import com.ticketportal.entity.enums.NotificationType;
import com.ticketportal.repository.CommentRepository;
import com.ticketportal.repository.TicketRepository;
import com.ticketportal.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CommentService {

    private final CommentRepository commentRepository;
    private final TicketRepository ticketRepository;
    private final UserRepository userRepository;
    private final UserService userService;
    private final NotificationService notificationService;

    private static final Pattern MENTION_PATTERN = Pattern.compile("@([\\w.@+-]+)");

    @Transactional
    public CommentResponse addComment(Long ticketId, CreateCommentRequest request) {
        User currentUser = userService.getCurrentUser();
        Ticket ticket = ticketRepository.findById(ticketId)
            .orElseThrow(() -> new ResourceNotFoundException("Ticket", "id", ticketId));

        Comment comment = Comment.builder()
            .content(request.getContent())
            .ticket(ticket)
            .author(currentUser)
            .edited(false)
            .build();

        if (request.getParentId() != null) {
            Comment parent = commentRepository.findById(request.getParentId())
                .orElseThrow(() -> new ResourceNotFoundException("Comment", "id", request.getParentId()));
            comment.setParent(parent);
        }

        Comment saved = commentRepository.save(comment);
        notificationService.createCommentNotification(ticket, currentUser);
        processMentions(request.getContent(), saved, currentUser);
        return toResponse(saved);
    }

    private void processMentions(String content, Comment comment, User author) {
        Matcher matcher = MENTION_PATTERN.matcher(content);
        Set<Long> notified = new HashSet<>();

        while (matcher.find()) {
            String mention = matcher.group(1).trim();
            userRepository.findByUsernameOrEmail(mention, mention).ifPresent(user -> {
                if (!user.getId().equals(author.getId()) && !notified.contains(user.getId())) {
                    notified.add(user.getId());
                    notificationService.createNotification(
                        user,
                        "You were mentioned in a comment",
                        author.getFullName() + " mentioned you in "
                            + comment.getTicket().getTicketNumber()
                            + ": \"" + content.substring(0, Math.min(content.length(), 60)) + "...\"",
                        NotificationType.MENTION,
                        comment.getTicket().getId(),
                        "TICKET"
                    );
                }
            });
        }
    }

    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public List<CommentResponse> getTicketComments(Long ticketId) {
        Ticket ticket = ticketRepository.findById(ticketId)
            .orElseThrow(() -> new ResourceNotFoundException("Ticket", "id", ticketId));
        return commentRepository.findByTicketAndParentIsNullOrderByCreatedAtAsc(ticket)
            .stream().map(this::toResponse).collect(Collectors.toList());
    }

    @Transactional
    public CommentResponse updateComment(Long id, String content) {
        User currentUser = userService.getCurrentUser();
        Comment comment = commentRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Comment", "id", id));
        if (!comment.getAuthor().getId().equals(currentUser.getId())) {
            throw new UnauthorizedException("You can only edit your own comments");
        }
        comment.setContent(content);
        comment.setEdited(true);
        return toResponse(commentRepository.save(comment));
    }

    @Transactional
    public void deleteComment(Long id) {
        User currentUser = userService.getCurrentUser();
        Comment comment = commentRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Comment", "id", id));
        boolean isAdmin = currentUser.getRoles().stream().anyMatch(r -> r.getName().equals("ROLE_ADMIN"));
        if (!isAdmin && !comment.getAuthor().getId().equals(currentUser.getId())) {
            throw new UnauthorizedException("You can only delete your own comments");
        }
        commentRepository.delete(comment);
    }

    private CommentResponse toResponse(Comment comment) {
        List<CommentResponse> replies = comment.getReplies() != null
            ? comment.getReplies().stream().map(this::toResponse).collect(Collectors.toList())
            : List.of();
        return CommentResponse.builder()
            .id(comment.getId())
            .content(comment.getContent())
            .ticketId(comment.getTicket().getId())
            .author(userService.toResponse(comment.getAuthor()))
            .parentId(comment.getParent() != null ? comment.getParent().getId() : null)
            .replies(replies)
            .edited(comment.isEdited())
            .createdAt(comment.getCreatedAt())
            .updatedAt(comment.getUpdatedAt())
            .build();
    }
}
