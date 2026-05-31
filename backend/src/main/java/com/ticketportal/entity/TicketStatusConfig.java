package com.ticketportal.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "ticket_status_configs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TicketStatusConfig {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String name;  // Internal key stored in Ticket.status e.g. "TODO", "IN_PROGRESS"

    @Column(name = "display_name", nullable = false, length = 100)
    private String displayName;  // e.g. "To Do", "In Progress"

    private String color;   // hex color e.g. "#3B82F6"

    @Column(name = "text_color")
    private String textColor;   // e.g. "#ffffff"

    private String icon;

    @Column(nullable = false)
    @Builder.Default
    private Integer position = 0;

    @Column(name = "is_default")
    @Builder.Default
    private Boolean isDefault = false;  // default status for new tickets in this project

    @Column(name = "is_final")
    @Builder.Default
    private Boolean isFinal = false;  // marks ticket as resolved/done when set

    @Column(name = "is_active")
    @Builder.Default
    private Boolean isActive = true;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id")
    private Project project;  // NULL = global default; not-NULL = project-specific override

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
