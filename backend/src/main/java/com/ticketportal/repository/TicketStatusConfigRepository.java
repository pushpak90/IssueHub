package com.ticketportal.repository;

import com.ticketportal.entity.TicketStatusConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TicketStatusConfigRepository extends JpaRepository<TicketStatusConfig, Long> {

    // Global statuses (no project)
    List<TicketStatusConfig> findByProjectIsNullAndIsActiveTrueOrderByPosition();

    // Project-specific statuses
    List<TicketStatusConfig> findByProjectIdAndIsActiveTrueOrderByPosition(Long projectId);

    // All statuses for a project: project-specific first, then globals if project has none
    @Query("SELECT s FROM TicketStatusConfig s WHERE s.isActive = true AND " +
           "(s.project.id = :projectId OR s.project IS NULL) ORDER BY s.project.id NULLS LAST, s.position ASC")
    List<TicketStatusConfig> findAllForProject(@Param("projectId") Long projectId);

    boolean existsByNameAndProjectIsNull(String name);

    boolean existsByNameAndProjectId(String name, Long projectId);

    Optional<TicketStatusConfig> findByNameAndProjectIsNull(String name);

    List<TicketStatusConfig> findByProjectIdOrderByPosition(Long projectId);

    List<TicketStatusConfig> findByProjectIsNullOrderByPosition();
}
