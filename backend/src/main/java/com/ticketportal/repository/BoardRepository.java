package com.ticketportal.repository;

import com.ticketportal.entity.Board;
import com.ticketportal.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BoardRepository extends JpaRepository<Board, Long> {

    List<Board> findAllByOrderByCreatedAtDesc();

    @Query("SELECT DISTINCT b FROM Board b LEFT JOIN b.projects p LEFT JOIN p.members m " +
           "WHERE b.createdBy = :user OR m = :user")
    List<Board> findBoardsAccessibleByUser(@Param("user") User user);
}
