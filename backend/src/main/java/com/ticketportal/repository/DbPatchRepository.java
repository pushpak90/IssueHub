package com.ticketportal.repository;

import com.ticketportal.entity.DbPatch;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DbPatchRepository extends JpaRepository<DbPatch, Long> {
    List<DbPatch> findAllByOrderByCreatedAtDesc();
}
