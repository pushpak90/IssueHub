package com.ticketportal.repository;

import com.ticketportal.entity.Label;
import com.ticketportal.entity.Project;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface LabelRepository extends JpaRepository<Label, Long> {

    List<Label> findByProject(Project project);
}
