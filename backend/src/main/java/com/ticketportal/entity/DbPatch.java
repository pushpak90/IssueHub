package com.ticketportal.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "db_patches")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class DbPatch {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 200)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "sql_content", columnDefinition = "LONGTEXT", nullable = false)
    private String sqlContent;

    @Column(name = "status", length = 20)
    @Builder.Default
    private String status = "PENDING";  // PENDING | APPLIED | FAILED

    @Column(name = "execution_result", columnDefinition = "TEXT")
    private String executionResult;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private User createdBy;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "applied_by")
    private User appliedBy;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "applied_at")
    private LocalDateTime appliedAt;
}
