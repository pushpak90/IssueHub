package com.ticketportal.controller;

import com.ticketportal.dto.response.ApiResponse;
import com.ticketportal.entity.Ticket;
import com.ticketportal.entity.TicketRelation;
import com.ticketportal.exception.BadRequestException;
import com.ticketportal.exception.ResourceNotFoundException;
import com.ticketportal.repository.TicketRelationRepository;
import com.ticketportal.repository.TicketRepository;
import com.ticketportal.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/tickets/{ticketId}/relations")
@RequiredArgsConstructor
@Tag(name = "Ticket Relations", description = "Link tickets together")
public class TicketRelationController {

    private final TicketRelationRepository relationRepository;
    private final TicketRepository ticketRepository;
    private final UserService userService;

    private static final List<String> VALID_TYPES = List.of(
        "BLOCKS", "BLOCKED_BY", "RELATES_TO", "DUPLICATES", "DUPLICATED_BY"
    );

    @GetMapping
    @Transactional(readOnly = true)
    @Operation(summary = "Get all relations for a ticket")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getRelations(
            @PathVariable Long ticketId) {
        Ticket ticket = getTicket(ticketId);
        List<Map<String, Object>> result = relationRepository.findAllForTicket(ticket)
            .stream().map(r -> toMap(r, ticket)).collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @PostMapping
    @Transactional
    @Operation(summary = "Add a relation between two tickets")
    public ResponseEntity<ApiResponse<Map<String, Object>>> addRelation(
            @PathVariable Long ticketId,
            @RequestBody Map<String, Object> body) {
        String type = (String) body.get("relationType");
        Object rawId = body.get("targetTicketId");
        Long targetId = rawId instanceof Number ? ((Number) rawId).longValue() :
            Long.parseLong(String.valueOf(rawId));

        if (!VALID_TYPES.contains(type))
            throw new BadRequestException("Invalid relation type: " + type);
        if (ticketId.equals(targetId))
            throw new BadRequestException("Cannot link a ticket to itself");

        Ticket source = getTicket(ticketId);
        Ticket target = getTicket(targetId);

        if (relationRepository.existsBySourceAndTargetAndRelationType(source, target, type))
            throw new BadRequestException("This relation already exists");

        TicketRelation rel = TicketRelation.builder()
            .source(source).target(target)
            .relationType(type)
            .createdBy(userService.getCurrentUser())
            .build();
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(ApiResponse.success("Relation added", toMap(relationRepository.save(rel), source)));
    }

    @DeleteMapping("/{relationId}")
    @Transactional
    @Operation(summary = "Remove a relation")
    public ResponseEntity<ApiResponse<String>> deleteRelation(
            @PathVariable Long ticketId, @PathVariable Long relationId) {
        TicketRelation rel = relationRepository.findById(relationId)
            .orElseThrow(() -> new ResourceNotFoundException("Relation", "id", relationId));
        relationRepository.delete(rel);
        return ResponseEntity.ok(ApiResponse.success("Relation removed"));
    }

    private Ticket getTicket(Long id) {
        return ticketRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Ticket", "id", id));
    }

    private Map<String, Object> toMap(TicketRelation r, Ticket currentTicket) {
        boolean isSource = r.getSource().getId().equals(currentTicket.getId());
        Ticket other = isSource ? r.getTarget() : r.getSource();
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id",            r.getId());
        m.put("relationType",  r.getRelationType());
        m.put("otherTicketId",     other.getId());
        m.put("otherTicketNumber", other.getTicketNumber());
        m.put("otherTicketTitle",  other.getTitle());
        m.put("otherTicketStatus", other.getStatus().name());
        m.put("createdAt",     r.getCreatedAt() != null ? r.getCreatedAt().toString() : null);
        return m;
    }
}
