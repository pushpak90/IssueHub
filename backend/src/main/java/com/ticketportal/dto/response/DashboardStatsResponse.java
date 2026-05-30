package com.ticketportal.dto.response;

import lombok.*;

import java.util.List;
import java.util.Map;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DashboardStatsResponse {
    private long totalTickets;
    private long openTickets;
    private long inProgressTickets;
    private long resolvedTickets;
    private long overdueTickets;
    private long totalProjects;
    private long activeProjects;
    private long totalUsers;
    private Map<String, Long> ticketsByStatus;
    private Map<String, Long> ticketsByPriority;
    private Map<String, Long> ticketsByType;
    private List<TicketResponse> recentTickets;
    private List<TicketResponse> myAssignedTickets;
}
