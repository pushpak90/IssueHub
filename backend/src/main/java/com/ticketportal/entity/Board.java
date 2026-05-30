package com.ticketportal.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "boards")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Board {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private User createdBy;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(name = "board_projects",
        joinColumns = @JoinColumn(name = "board_id"),
        inverseJoinColumns = @JoinColumn(name = "project_id"))
    @Builder.Default
    private Set<Project> projects = new HashSet<>();

    // JSON array of statuses e.g. "TODO,IN_PROGRESS,IN_REVIEW,DONE"
    @Column(name = "column_config", length = 500)
    @Builder.Default
    private String columnConfig = "TODO,IN_PROGRESS,IN_REVIEW,TESTING,DONE";

    @Column(name = "board_type", length = 20)
    @Builder.Default
    private String boardType = "KANBAN"; // KANBAN or SCRUM

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
