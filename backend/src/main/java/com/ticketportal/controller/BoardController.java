package com.ticketportal.controller;

import com.ticketportal.dto.response.ApiResponse;
import com.ticketportal.dto.response.TicketResponse;
import com.ticketportal.service.BoardService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/boards")
@RequiredArgsConstructor
@Tag(name = "Boards", description = "Multi-project board endpoints")
public class BoardController {

    private final BoardService boardService;

    @GetMapping
    @Operation(summary = "Get all boards accessible to current user")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getAllBoards() {
        return ResponseEntity.ok(ApiResponse.success(boardService.getAllBoards()));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get board by ID")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getBoard(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(boardService.getBoardById(id)));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    @Operation(summary = "Create a board — Admin/Manager only")
    public ResponseEntity<ApiResponse<Map<String, Object>>> createBoard(@RequestBody Map<String, Object> body) {
        String name         = (String) body.get("name");
        String description  = (String) body.get("description");
        String boardType    = (String) body.get("boardType");
        String columnConfig = (String) body.get("columnConfig");
        @SuppressWarnings("unchecked")
        List<Integer> rawIds = (List<Integer>) body.get("projectIds");
        List<Long> projectIds = rawIds != null
            ? rawIds.stream().map(Integer::longValue).collect(java.util.stream.Collectors.toList())
            : null;
        var result = boardService.createBoard(name, description, boardType, projectIds, columnConfig);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success("Board created", result));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    @Operation(summary = "Update board")
    public ResponseEntity<ApiResponse<Map<String, Object>>> updateBoard(
            @PathVariable Long id, @RequestBody Map<String, Object> body) {
        return ResponseEntity.ok(ApiResponse.success("Board updated", boardService.updateBoard(id, body)));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    @Operation(summary = "Delete board")
    public ResponseEntity<ApiResponse<String>> deleteBoard(@PathVariable Long id) {
        boardService.deleteBoard(id);
        return ResponseEntity.ok(ApiResponse.success("Board deleted"));
    }

    @PostMapping("/{id}/projects/{projectId}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    @Operation(summary = "Add project to board")
    public ResponseEntity<ApiResponse<Map<String, Object>>> addProject(
            @PathVariable Long id, @PathVariable Long projectId) {
        return ResponseEntity.ok(ApiResponse.success("Project added", boardService.addProject(id, projectId)));
    }

    @DeleteMapping("/{id}/projects/{projectId}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    @Operation(summary = "Remove project from board")
    public ResponseEntity<ApiResponse<Map<String, Object>>> removeProject(
            @PathVariable Long id, @PathVariable Long projectId) {
        return ResponseEntity.ok(ApiResponse.success("Project removed", boardService.removeProject(id, projectId)));
    }

    @GetMapping("/{id}/tickets")
    @Operation(summary = "Get all tickets for a board (from all its projects)")
    public ResponseEntity<ApiResponse<List<TicketResponse>>> getBoardTickets(
            @PathVariable Long id,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String priority,
            @RequestParam(required = false) String search) {
        return ResponseEntity.ok(ApiResponse.success(boardService.getBoardTickets(id, status, priority, search)));
    }
}
