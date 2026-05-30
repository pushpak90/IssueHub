package com.ticketportal.repository;

import com.ticketportal.entity.Ticket;
import com.ticketportal.entity.TicketScript;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TicketScriptRepository extends JpaRepository<TicketScript, Long> {
    List<TicketScript> findByTicketOrderByCreatedAtDesc(Ticket ticket);
}
