package com.ticketportal.controller;

import com.ticketportal.dto.response.ApiResponse;
import com.ticketportal.entity.Ticket;
import com.ticketportal.entity.TimeLog;
import com.ticketportal.exception.ResourceNotFoundException;
import com.ticketportal.repository.TimeLogRepository;
import com.ticketportal.repository.TicketRepository;
import com.ticketportal.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/tickets/{ticketId}/timelogs")
@RequiredArgsConstructor
@Tag(name = "Time Logs", description = "Work time tracking per ticket")
public class TimeLogController {

    private final TimeLogRepository timeLogRepository;
    private final TicketRepository ticketRepository;
    private final UserService userService;

    @GetMapping
    @Transactional(readOnly = true)
    @Operation(summary = "Get all time logs for a ticket")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getTimeLogs(
            @PathVariable Long ticketId) {
        Ticket ticket = getTicket(ticketId);
        List<Map<String, Object>> logs = timeLogRepository
            .findByTicketOrderByLogDateDescCreatedAtDesc(ticket)
            .stream().map(this::toMap).collect(Collectors.toList());
        Double total = timeLogRepository.sumHoursByTicket(ticket);
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("logs",       logs);
        result.put("totalHours", total != null ? total : 0.0);
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @PostMapping
    @Transactional
    @Operation(summary = "Log work time on a ticket")
    public ResponseEntity<ApiResponse<Map<String, Object>>> addLog(
            @PathVariable Long ticketId,
            @RequestBody Map<String, Object> body) {
        Ticket ticket = getTicket(ticketId);
        Object rawHours = body.get("hoursSpent");
        double hours = rawHours instanceof Number
            ? ((Number) rawHours).doubleValue()
            : Double.parseDouble(String.valueOf(rawHours));
        if (hours <= 0) throw new com.ticketportal.exception.BadRequestException("Hours must be greater than 0");

        String dateStr = (String) body.get("logDate");
        TimeLog log = TimeLog.builder()
            .ticket(ticket)
            .user(userService.getCurrentUser())
            .hoursSpent(hours)
            .description((String) body.get("description"))
            .logDate(dateStr != null && !dateStr.isBlank() ? LocalDate.parse(dateStr) : LocalDate.now())
            .build();
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(ApiResponse.success("Time logged", toMap(timeLogRepository.save(log))));
    }

    @DeleteMapping("/{logId}")
    @Transactional
    @Operation(summary = "Delete a time log entry")
    public ResponseEntity<ApiResponse<String>> deleteLog(
            @PathVariable Long ticketId, @PathVariable Long logId) {
        TimeLog log = timeLogRepository.findById(logId)
            .orElseThrow(() -> new ResourceNotFoundException("TimeLog", "id", logId));
        timeLogRepository.delete(log);
        return ResponseEntity.ok(ApiResponse.success("Time log deleted"));
    }

    private Ticket getTicket(Long id) {
        return ticketRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Ticket", "id", id));
    }

    private Map<String, Object> toMap(TimeLog l) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id",          l.getId());
        m.put("hoursSpent",  l.getHoursSpent());
        m.put("description", l.getDescription());
        m.put("logDate",     l.getLogDate() != null ? l.getLogDate().toString() : null);
        m.put("user",        l.getUser() != null ? l.getUser().getFullName() : null);
        m.put("userId",      l.getUser() != null ? l.getUser().getId() : null);
        m.put("createdAt",   l.getCreatedAt() != null ? l.getCreatedAt().toString() : null);
        return m;
    }
}
