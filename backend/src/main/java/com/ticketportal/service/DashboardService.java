package com.ticketportal.service;

import com.ticketportal.dto.response.DashboardStatsResponse;
import com.ticketportal.entity.Project;
import com.ticketportal.entity.User;

import com.ticketportal.repository.ProjectRepository;
import com.ticketportal.repository.TicketRepository;
import com.ticketportal.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final TicketRepository ticketRepository;
    private final ProjectRepository projectRepository;
    private final UserRepository userRepository;
    private final UserService userService;
    private final TicketService ticketService;

    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public DashboardStatsResponse getDashboardStats() {
        User currentUser = userService.getCurrentUser();
        boolean isAdmin = currentUser.getRoles().stream().anyMatch(r -> r.getName().equals("ROLE_ADMIN"));

        long totalProjects = projectRepository.count();
        long totalUsers = userRepository.count();

        Map<String, Long> byStatus = new LinkedHashMap<>();

        List<Project> projects = isAdmin
            ? projectRepository.findAll()
            : projectRepository.findAllProjectsByUser(currentUser);

        long totalCount = 0, openCount = 0, inProgressCount = 0, resolvedCount = 0;
        for (Project p : projects) {
            totalCount += ticketRepository.countByProject(p);
            openCount += ticketRepository.countByProjectAndStatus(p, "TODO");
            inProgressCount += ticketRepository.countByProjectAndStatus(p, "IN_PROGRESS");
            resolvedCount += ticketRepository.countByProjectAndStatus(p, "DONE");
        }

        long overdueCount = ticketRepository.findOverdueTicketsByAssignee(currentUser, LocalDate.now()).size();
        long activeProjects = projects.stream()
            .filter(p -> p.getStatus() == com.ticketportal.entity.enums.ProjectStatus.ACTIVE)
            .count();

        // Recent tickets
        var recentTickets = ticketRepository.findAll(PageRequest.of(0, 10, Sort.by("createdAt").descending()))
            .getContent().stream().map(ticketService::toResponse).collect(Collectors.toList());

        // My assigned tickets
        var myTickets = ticketRepository.findByAssignee(currentUser, PageRequest.of(0, 5, Sort.by("createdAt").descending()))
            .getContent().stream().map(ticketService::toResponse).collect(Collectors.toList());

        Map<String, Long> byPriority = new LinkedHashMap<>();
        byPriority.put("CRITICAL", 0L);
        byPriority.put("HIGH", 0L);
        byPriority.put("MEDIUM", 0L);
        byPriority.put("LOW", 0L);

        Map<String, Long> statusMap = new LinkedHashMap<>();
        statusMap.put("TODO", openCount);
        statusMap.put("IN_PROGRESS", inProgressCount);
        statusMap.put("DONE", resolvedCount);

        return DashboardStatsResponse.builder()
            .totalTickets(totalCount)
            .openTickets(openCount)
            .inProgressTickets(inProgressCount)
            .resolvedTickets(resolvedCount)
            .overdueTickets(overdueCount)
            .totalProjects(totalProjects)
            .activeProjects(activeProjects)
            .totalUsers(totalUsers)
            .ticketsByStatus(statusMap)
            .ticketsByPriority(byPriority)
            .ticketsByType(new LinkedHashMap<>())
            .recentTickets(recentTickets)
            .myAssignedTickets(myTickets)
            .build();
    }
}
