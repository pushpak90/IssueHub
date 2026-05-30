package com.ticketportal.repository;

import com.ticketportal.entity.Comment;
import com.ticketportal.entity.Ticket;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CommentRepository extends JpaRepository<Comment, Long> {

    List<Comment> findByTicketAndParentIsNullOrderByCreatedAtAsc(Ticket ticket);

    Page<Comment> findByTicket(Ticket ticket, Pageable pageable);

    long countByTicket(Ticket ticket);
}
