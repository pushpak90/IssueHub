package com.ticketportal.repository;

import com.ticketportal.entity.TicketTypeConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TicketTypeConfigRepository extends JpaRepository<TicketTypeConfig, Long> {

    List<TicketTypeConfig> findByIsActiveTrueOrderByPosition();

    List<TicketTypeConfig> findAllByOrderByPosition();

    boolean existsByName(String name);

    Optional<TicketTypeConfig> findByName(String name);
}
