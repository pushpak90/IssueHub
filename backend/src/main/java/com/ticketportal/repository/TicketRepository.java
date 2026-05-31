package com.ticketportal.repository;

import com.ticketportal.entity.Project;
import com.ticketportal.entity.Ticket;
import com.ticketportal.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface TicketRepository extends JpaRepository<Ticket, Long>, JpaSpecificationExecutor<Ticket> {

    Optional<Ticket> findByTicketNumber(String ticketNumber);

    Page<Ticket> findByProject(Project project, Pageable pageable);

    List<Ticket> findByProjectAndStatus(Project project, String status);

    Page<Ticket> findByAssignee(User assignee, Pageable pageable);

    Page<Ticket> findByReporter(User reporter, Pageable pageable);

    @Query("SELECT t FROM Ticket t WHERE t.project = :project AND " +
        "(:status IS NULL OR t.status = :status) AND " +
        "(:priority IS NULL OR t.priority = :priority) AND " +
        "(:type IS NULL OR t.type = :type) AND " +
        "(:assigneeId IS NULL OR t.assignee.id = :assigneeId) AND " +
        "(LOWER(t.title) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
        "LOWER(t.ticketNumber) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<Ticket> findTicketsWithFilters(
        @Param("project") Project project,
        @Param("status") String status,
        @Param("priority") String priority,
        @Param("type") String type,
        @Param("assigneeId") Long assigneeId,
        @Param("search") String search,
        Pageable pageable);

    @Query("SELECT t.status as status, COUNT(t) as count FROM Ticket t WHERE t.project = :project GROUP BY t.status")
    List<Object[]> countByStatusForProject(@Param("project") Project project);

    @Query("SELECT t.priority as priority, COUNT(t) as count FROM Ticket t WHERE t.project = :project GROUP BY t.priority")
    List<Object[]> countByPriorityForProject(@Param("project") Project project);

    @Query("SELECT COUNT(t) FROM Ticket t WHERE t.assignee = :user AND t.status NOT IN ('DONE', 'CLOSED', 'CANCELLED')")
    Long countOpenTicketsByAssignee(@Param("user") User user);

    @Query("SELECT t FROM Ticket t WHERE t.assignee = :user AND t.dueDate < :today AND t.status NOT IN ('DONE', 'CLOSED', 'CANCELLED')")
    List<Ticket> findOverdueTicketsByAssignee(@Param("user") User user, @Param("today") LocalDate today);

    @Query("SELECT t FROM Ticket t WHERE " +
        "(:projectId IS NULL OR t.project.id = :projectId) AND " +
        "(:status IS NULL OR t.status = :status) AND " +
        "(:priority IS NULL OR t.priority = :priority) AND " +
        "(:assigneeId IS NULL OR t.assignee.id = :assigneeId) AND " +
        "(LOWER(t.title) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
        "LOWER(t.ticketNumber) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<Ticket> findAllTicketsGlobal(
        @Param("projectId") Long projectId,
        @Param("status") String status,
        @Param("priority") String priority,
        @Param("assigneeId") Long assigneeId,
        @Param("search") String search,
        Pageable pageable);

    @Query("SELECT t FROM Ticket t WHERE t.project = :project AND t.sprint IS NULL ORDER BY t.createdAt DESC")
    List<Ticket> findBacklogTickets(@Param("project") Project project);

    @Query("SELECT t FROM Ticket t WHERE t.sprint.id = :sprintId ORDER BY t.createdAt DESC")
    List<Ticket> findBySprintId(@Param("sprintId") Long sprintId);

    Long countByProject(Project project);

    Long countByProjectAndStatus(Project project, String status);
}
