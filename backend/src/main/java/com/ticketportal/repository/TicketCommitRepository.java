package com.ticketportal.repository;

import com.ticketportal.entity.Ticket;
import com.ticketportal.entity.TicketCommit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TicketCommitRepository extends JpaRepository<TicketCommit, Long> {
    List<TicketCommit> findByTicketOrderByCreatedAtDesc(Ticket ticket);
    long countByTicket(Ticket ticket);

    // Batch-fetch commits for multiple tickets — avoids N+1 on export
    List<TicketCommit> findByTicketIn(List<Ticket> tickets);
}
