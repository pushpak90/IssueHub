package com.ticketportal.repository;

import com.ticketportal.entity.Project;
import com.ticketportal.entity.User;
import com.ticketportal.entity.enums.ProjectStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProjectRepository extends JpaRepository<Project, Long> {

    List<Project> findByOwner(User owner);

    Page<Project> findByStatus(ProjectStatus status, Pageable pageable);

    @Query("SELECT p FROM Project p WHERE p.owner = :user OR :user MEMBER OF p.members")
    Page<Project> findProjectsByUser(@Param("user") User user, Pageable pageable);

    @Query("SELECT p FROM Project p WHERE p.owner = :user OR :user MEMBER OF p.members")
    List<Project> findAllProjectsByUser(@Param("user") User user);

    @Query("SELECT p FROM Project p WHERE LOWER(p.name) LIKE LOWER(CONCAT('%', :search, '%'))")
    Page<Project> searchProjects(@Param("search") String search, Pageable pageable);

    boolean existsByKeyPrefix(String keyPrefix);

    List<Project> findByCategoryId(Long categoryId);
}
