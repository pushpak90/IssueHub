package com.ticketportal.repository;

import com.ticketportal.entity.Ticket;
import com.ticketportal.entity.TimeLog;
import com.ticketportal.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TimeLogRepository extends JpaRepository<TimeLog, Long> {

    List<TimeLog> findByTicketOrderByLogDateDescCreatedAtDesc(Ticket ticket);

    @Query("SELECT COALESCE(SUM(t.hoursSpent), 0) FROM TimeLog t WHERE t.ticket = :ticket")
    Double sumHoursByTicket(@Param("ticket") Ticket ticket);

    List<TimeLog> findByUserOrderByCreatedAtDesc(User user);
}
