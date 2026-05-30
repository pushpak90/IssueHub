package com.ticketportal.repository;

import com.ticketportal.entity.SavedTicketFilter;
import com.ticketportal.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SavedTicketFilterRepository extends JpaRepository<SavedTicketFilter, Long> {

    @Query("SELECT f FROM SavedTicketFilter f WHERE f.owner = :owner OR f.shared = true ORDER BY f.defaultFilter DESC, f.name ASC")
    List<SavedTicketFilter> findVisibleTo(@Param("owner") User owner);

    List<SavedTicketFilter> findByOwnerAndDefaultFilterTrue(User owner);
}
