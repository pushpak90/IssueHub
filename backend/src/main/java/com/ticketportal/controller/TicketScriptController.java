package com.ticketportal.controller;

import com.ticketportal.dto.response.ApiResponse;
import com.ticketportal.entity.Ticket;
import com.ticketportal.entity.TicketScript;
import com.ticketportal.exception.BadRequestException;
import com.ticketportal.exception.ResourceNotFoundException;
import com.ticketportal.repository.TicketRepository;
import com.ticketportal.repository.TicketScriptRepository;
import com.ticketportal.service.UserService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/tickets/{ticketId}/scripts")
@RequiredArgsConstructor
@Tag(name = "Ticket Scripts", description = "DB scripts / patches linked to a ticket")
public class TicketScriptController {

    private final TicketScriptRepository scriptRepository;
    private final TicketRepository ticketRepository;
    private final UserService userService;

    @GetMapping
    @Transactional(readOnly = true)
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getScripts(
            @PathVariable Long ticketId) {
        Ticket ticket = getTicket(ticketId);
        List<Map<String, Object>> result = scriptRepository
            .findByTicketOrderByCreatedAtDesc(ticket)
            .stream().map(this::toMap).collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @PostMapping
    @Transactional
    public ResponseEntity<ApiResponse<Map<String, Object>>> addScript(
            @PathVariable Long ticketId,
            @RequestBody Map<String, String> body) {
        String title = body.get("title");
        String sql   = body.get("sqlContent");
        if (title == null || title.isBlank()) throw new BadRequestException("Title is required");
        if (sql   == null || sql.isBlank())   throw new BadRequestException("SQL content is required");

        Ticket ticket = getTicket(ticketId);
        TicketScript script = TicketScript.builder()
            .ticket(ticket)
            .title(title.trim())
            .description(body.get("description"))
            .scriptType(body.getOrDefault("scriptType", "SQL"))
            .sqlContent(sql)
            .addedBy(userService.getCurrentUser())
            .build();
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(ApiResponse.success("Script added", toMap(scriptRepository.save(script))));
    }

    @DeleteMapping("/{scriptId}")
    @Transactional
    public ResponseEntity<ApiResponse<String>> deleteScript(
            @PathVariable Long ticketId,
            @PathVariable Long scriptId) {
        TicketScript script = scriptRepository.findById(scriptId)
            .orElseThrow(() -> new ResourceNotFoundException("TicketScript", "id", scriptId));
        if (!script.getTicket().getId().equals(ticketId))
            throw new BadRequestException("Script does not belong to this ticket");
        scriptRepository.delete(script);
        return ResponseEntity.ok(ApiResponse.success("Script removed"));
    }

    private Ticket getTicket(Long id) {
        return ticketRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Ticket", "id", id));
    }

    private Map<String, Object> toMap(TicketScript s) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id",          s.getId());
        m.put("title",       s.getTitle());
        m.put("description", s.getDescription());
        m.put("scriptType",  s.getScriptType());
        m.put("sqlContent",  s.getSqlContent());
        m.put("addedBy",     s.getAddedBy() != null ? s.getAddedBy().getFullName() : null);
        m.put("addedById",   s.getAddedBy() != null ? s.getAddedBy().getId() : null);
        m.put("createdAt",   s.getCreatedAt() != null ? s.getCreatedAt().toString() : null);
        return m;
    }
}
