package com.ticketportal.repository;

import com.ticketportal.entity.Project;
import com.ticketportal.entity.Team;
import com.ticketportal.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TeamRepository extends JpaRepository<Team, Long> {

    List<Team> findByProject(Project project);

    @Query("SELECT t FROM Team t WHERE :user MEMBER OF t.members")
    List<Team> findTeamsByUser(@Param("user") User user);
}
