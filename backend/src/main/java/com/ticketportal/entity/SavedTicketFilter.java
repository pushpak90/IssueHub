package com.ticketportal.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "saved_ticket_filters")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SavedTicketFilter {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    @Column(nullable = false, length = 120)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "filter_config", nullable = false, columnDefinition = "LONGTEXT")
    private String filterConfig;

    @Column(name = "column_config", columnDefinition = "LONGTEXT")
    private String columnConfig;

    @Column(name = "shared", nullable = false)
    @Builder.Default
    private boolean shared = false;

    @Column(name = "default_filter", nullable = false)
    @Builder.Default
    private boolean defaultFilter = false;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_id", nullable = false)
    private User owner;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
