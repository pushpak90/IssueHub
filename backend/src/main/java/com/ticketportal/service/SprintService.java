package com.ticketportal.service;

import com.ticketportal.entity.Project;
import com.ticketportal.entity.Sprint;
import com.ticketportal.entity.Ticket;
import com.ticketportal.entity.enums.SprintStatus;
import com.ticketportal.entity.enums.TicketStatus;
import com.ticketportal.exception.BadRequestException;
import com.ticketportal.exception.ResourceNotFoundException;
import com.ticketportal.repository.ProjectRepository;
import com.ticketportal.repository.SprintRepository;
import com.ticketportal.repository.TicketRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class SprintService {

    private final SprintRepository sprintRepository;
    private final ProjectRepository projectRepository;
    private final TicketRepository ticketRepository;

    @Transactional(readOnly = true)
    public List<Sprint> getProjectSprints(Long projectId) {
        Project project = getProject(projectId);
        return sprintRepository.findByProjectOrderBySprintNumberDesc(project);
    }

    @Transactional(readOnly = true)
    public Sprint getActiveSprint(Long projectId) {
        Project project = getProject(projectId);
        return sprintRepository.findByProjectAndStatus(project, SprintStatus.ACTIVE).orElse(null);
    }

    @Transactional
    public Sprint createSprint(Long projectId, String name, String goal, LocalDate startDate, LocalDate endDate) {
        Project project = getProject(projectId);
        long sprintCount = sprintRepository.countByProject(project);

        Sprint sprint = Sprint.builder()
            .name(name != null ? name : "Sprint " + (sprintCount + 1))
            .goal(goal)
            .project(project)
            .status(SprintStatus.PLANNING)
            .startDate(startDate)
            .endDate(endDate)
            .sprintNumber((int) (sprintCount + 1))
            .build();

        return sprintRepository.save(sprint);
    }

    @Transactional
    public Sprint updateSprint(Long sprintId, Map<String, Object> updates) {
        Sprint sprint = getSprint(sprintId);
        if (updates.containsKey("name")) sprint.setName((String) updates.get("name"));
        if (updates.containsKey("goal")) sprint.setGoal((String) updates.get("goal"));
        if (updates.containsKey("startDate")) {
            String sd = (String) updates.get("startDate");
            sprint.setStartDate((sd != null && !sd.isBlank()) ? LocalDate.parse(sd.trim()) : null);
        }
        if (updates.containsKey("endDate")) {
            String ed = (String) updates.get("endDate");
            sprint.setEndDate((ed != null && !ed.isBlank()) ? LocalDate.parse(ed.trim()) : null);
        }
        return sprintRepository.save(sprint);
    }

    @Transactional
    public Sprint startSprint(Long sprintId) {
        Sprint sprint = getSprint(sprintId);
        if (sprint.getStatus() != SprintStatus.PLANNING) {
            throw new BadRequestException("Only PLANNING sprints can be started");
        }
        if (sprintRepository.existsByProjectAndStatus(sprint.getProject(), SprintStatus.ACTIVE)) {
            throw new BadRequestException("A sprint is already active in this project. Complete it before starting a new one.");
        }
        sprint.setStatus(SprintStatus.ACTIVE);
        if (sprint.getStartDate() == null) sprint.setStartDate(LocalDate.now());
        return sprintRepository.save(sprint);
    }

    @Transactional
    public Sprint completeSprint(Long sprintId) {
        Sprint sprint = getSprint(sprintId);
        if (sprint.getStatus() != SprintStatus.ACTIVE) {
            throw new BadRequestException("Only ACTIVE sprints can be completed");
        }
        // Move incomplete tickets back to backlog
        for (Ticket ticket : sprint.getTickets()) {
            if (ticket.getStatus() != TicketStatus.DONE && ticket.getStatus() != TicketStatus.CLOSED) {
                ticket.setSprint(null);
                ticketRepository.save(ticket);
            }
        }
        sprint.setStatus(SprintStatus.COMPLETED);
        sprint.setCompletedAt(LocalDateTime.now());
        return sprintRepository.save(sprint);
    }

    @Transactional
    public void deleteSprint(Long sprintId) {
        Sprint sprint = getSprint(sprintId);
        if (sprint.getStatus() == SprintStatus.ACTIVE) {
            throw new BadRequestException("Cannot delete an active sprint. Complete it first.");
        }
        // Move all tickets back to backlog
        sprint.getTickets().forEach(ticket -> {
            ticket.setSprint(null);
            ticketRepository.save(ticket);
        });
        sprintRepository.delete(sprint);
    }

    @Transactional
    public void addTicketToSprint(Long sprintId, Long ticketId) {
        Sprint sprint = getSprint(sprintId);
        if (sprint.getStatus() == SprintStatus.COMPLETED) {
            throw new BadRequestException("Cannot add tickets to a completed sprint");
        }
        Ticket ticket = ticketRepository.findById(ticketId)
            .orElseThrow(() -> new ResourceNotFoundException("Ticket", "id", ticketId));
        ticket.setSprint(sprint);
        ticketRepository.save(ticket);
    }

    @Transactional
    public void removeTicketFromSprint(Long sprintId, Long ticketId) {
        Ticket ticket = ticketRepository.findById(ticketId)
            .orElseThrow(() -> new ResourceNotFoundException("Ticket", "id", ticketId));
        if (ticket.getSprint() == null || !ticket.getSprint().getId().equals(sprintId)) {
            throw new BadRequestException("Ticket is not in this sprint");
        }
        ticket.setSprint(null);
        ticketRepository.save(ticket);
    }

    @Transactional(readOnly = true)
    public List<Ticket> getSprintTickets(Long sprintId) {
        Sprint sprint = getSprint(sprintId);
        return sprint.getTickets();
    }

    @Transactional(readOnly = true)
    public List<Ticket> getBacklogTickets(Long projectId) {
        Project project = getProject(projectId);
        return ticketRepository.findBacklogTickets(project);
    }

    private Sprint getSprint(Long id) {
        return sprintRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Sprint", "id", id));
    }

    private Project getProject(Long id) {
        return projectRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Project", "id", id));
    }
}
