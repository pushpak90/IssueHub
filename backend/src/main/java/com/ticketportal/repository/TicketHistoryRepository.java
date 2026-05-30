package com.ticketportal.repository;

import com.ticketportal.entity.Ticket;
import com.ticketportal.entity.TicketHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TicketHistoryRepository extends JpaRepository<TicketHistory, Long> {

    List<TicketHistory> findByTicketOrderByCreatedAtDesc(Ticket ticket);
}
