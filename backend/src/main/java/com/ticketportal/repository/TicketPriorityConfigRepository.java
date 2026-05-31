package com.ticketportal.repository;

import com.ticketportal.entity.TicketPriorityConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TicketPriorityConfigRepository extends JpaRepository<TicketPriorityConfig, Long> {

    List<TicketPriorityConfig> findByIsActiveTrueOrderByLevel();

    List<TicketPriorityConfig> findAllByOrderByLevel();

    boolean existsByName(String name);

    Optional<TicketPriorityConfig> findByName(String name);
}
