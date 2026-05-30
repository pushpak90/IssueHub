package com.ticketportal.repository;

import com.ticketportal.entity.ProjectCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProjectCategoryRepository extends JpaRepository<ProjectCategory, Long> {
    List<ProjectCategory> findAllByOrderByNameAsc();
    Optional<ProjectCategory> findByName(String name);
    boolean existsByName(String name);
}
