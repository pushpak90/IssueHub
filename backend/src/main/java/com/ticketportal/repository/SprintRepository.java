package com.ticketportal.repository;

import com.ticketportal.entity.Project;
import com.ticketportal.entity.Sprint;
import com.ticketportal.entity.enums.SprintStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SprintRepository extends JpaRepository<Sprint, Long> {

    List<Sprint> findByProjectOrderBySprintNumberDesc(Project project);

    Optional<Sprint> findByProjectAndStatus(Project project, SprintStatus status);

    boolean existsByProjectAndStatus(Project project, SprintStatus status);

    long countByProject(Project project);
}
