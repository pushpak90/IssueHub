package com.ticketportal.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "ticket_priority_configs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TicketPriorityConfig {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String name;  // Internal key stored in Ticket.priority e.g. "HIGH", "MEDIUM"

    @Column(name = "display_name", nullable = false, length = 100)
    private String displayName;

    private String color;       // hex color for badge background e.g. "#FEE2E2"

    @Column(name = "text_color")
    private String textColor;   // hex color for badge text e.g. "#DC2626"

    @Column(name = "dot_color")
    private String dotColor;    // hex color for dot indicator e.g. "#EF4444"

    private String icon;        // emoji or icon identifier

    @Column(nullable = false)
    @Builder.Default
    private Integer level = 0;  // ordering: 1 = highest priority (critical), higher = lower priority

    @Column(name = "is_default")
    @Builder.Default
    private Boolean isDefault = false;

    @Column(name = "is_active")
    @Builder.Default
    private Boolean isActive = true;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
