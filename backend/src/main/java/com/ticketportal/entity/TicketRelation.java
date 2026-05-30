package com.ticketportal.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "ticket_relations",
    uniqueConstraints = @UniqueConstraint(columnNames = {"source_id", "target_id", "relation_type"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class TicketRelation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "source_id", nullable = false)
    private Ticket source;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "target_id", nullable = false)
    private Ticket target;

    @Column(name = "relation_type", nullable = false, length = 30)
    private String relationType;  // BLOCKS, BLOCKED_BY, RELATES_TO, DUPLICATES, DUPLICATED_BY

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private User createdBy;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
