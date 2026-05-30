package com.ticketportal.repository;

import com.ticketportal.entity.Ticket;
import com.ticketportal.entity.TicketRelation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TicketRelationRepository extends JpaRepository<TicketRelation, Long> {

    @Query("SELECT r FROM TicketRelation r WHERE r.source = :ticket OR r.target = :ticket")
    List<TicketRelation> findAllForTicket(@Param("ticket") Ticket ticket);

    boolean existsBySourceAndTargetAndRelationType(Ticket source, Ticket target, String relationType);
}
