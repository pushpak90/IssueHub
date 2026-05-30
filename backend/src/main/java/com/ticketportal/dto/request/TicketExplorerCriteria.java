package com.ticketportal.dto.request;

import com.ticketportal.entity.enums.ProjectStatus;
import com.ticketportal.entity.enums.TicketPriority;
import com.ticketportal.entity.enums.TicketStatus;
import com.ticketportal.entity.enums.TicketType;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.util.List;

@Getter
@Setter
public class TicketExplorerCriteria {
    private String search;
    private List<Long> projectIds;
    private List<Long> categoryIds;
    private List<ProjectStatus> projectStatuses;
    private List<TicketStatus> statuses;
    private List<TicketPriority> priorities;
    private List<TicketType> types;
    private List<Long> assigneeIds;
    private List<Long> reporterIds;
    private List<Long> labelIds;
    private List<Long> sprintIds;
    private Boolean backlog;
    private Boolean overdue;
    private Boolean unassigned;
    private Boolean hasAttachments;
    private Boolean hasComments;
    private Boolean hasCommits;
    private LocalDate dueFrom;
    private LocalDate dueTo;
    private LocalDate createdFrom;
    private LocalDate createdTo;
    private LocalDate updatedFrom;
    private LocalDate updatedTo;
    private LocalDate resolvedFrom;
    private LocalDate resolvedTo;
    private Integer estimatedMin;
    private Integer estimatedMax;
    private Integer actualMin;
    private Integer actualMax;
}
