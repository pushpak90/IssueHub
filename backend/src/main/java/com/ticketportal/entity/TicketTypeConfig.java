package com.ticketportal.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "ticket_type_configs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TicketTypeConfig {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String name;  // Internal key stored in Ticket.type e.g. "BUG", "FEATURE"

    @Column(name = "display_name", nullable = false, length = 100)
    private String displayName;

    private String color;       // hex color e.g. "#EF4444"

    @Column(name = "text_color")
    private String textColor;

    private String icon;        // emoji or icon name e.g. "🐛"

    @Column(nullable = false)
    @Builder.Default
    private Integer position = 0;

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
