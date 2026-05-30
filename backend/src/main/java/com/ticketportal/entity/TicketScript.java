package com.ticketportal.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "ticket_scripts")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class TicketScript {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ticket_id", nullable = false)
    private Ticket ticket;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    // SQL, PROCEDURE, MIGRATION, OTHER
    @Column(name = "script_type", length = 30)
    @Builder.Default
    private String scriptType = "SQL";

    @Column(name = "sql_content", columnDefinition = "LONGTEXT", nullable = false)
    private String sqlContent;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "added_by")
    private User addedBy;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
