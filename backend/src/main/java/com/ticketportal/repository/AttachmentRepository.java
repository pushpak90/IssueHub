package com.ticketportal.repository;

import com.ticketportal.entity.Attachment;
import com.ticketportal.entity.Ticket;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AttachmentRepository extends JpaRepository<Attachment, Long> {

    List<Attachment> findByTicket(Ticket ticket);
}
