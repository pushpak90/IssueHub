package com.ticketportal.controller;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ticketportal.dto.response.ApiResponse;
import com.ticketportal.entity.SavedTicketFilter;
import com.ticketportal.entity.User;
import com.ticketportal.exception.ResourceNotFoundException;
import com.ticketportal.repository.SavedTicketFilterRepository;
import com.ticketportal.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/ticket-filters")
@RequiredArgsConstructor
@PreAuthorize("hasAnyAuthority('ROLE_ADMIN','ROLE_MANAGER')")
public class SavedTicketFilterController {

    private final SavedTicketFilterRepository filterRepository;
    private final UserService userService;
    private final ObjectMapper objectMapper;

    @GetMapping
    @Transactional(readOnly = true)
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> listFilters() {
        User current = userService.getCurrentUser();
        return ResponseEntity.ok(ApiResponse.success(
            filterRepository.findVisibleTo(current).stream().map(f -> toMap(f, current)).collect(Collectors.toList())
        ));
    }

    @PostMapping
    @Transactional
    public ResponseEntity<ApiResponse<Map<String, Object>>> createFilter(@RequestBody Map<String, Object> body)
            throws JsonProcessingException {
        User current = userService.getCurrentUser();
        SavedTicketFilter filter = SavedTicketFilter.builder()
            .name(requiredString(body, "name"))
            .description((String) body.getOrDefault("description", ""))
            .filterConfig(toJson(body.getOrDefault("filterConfig", Map.of())))
            .columnConfig(toJson(body.getOrDefault("columnConfig", List.of())))
            .shared(Boolean.TRUE.equals(body.get("shared")))
            .defaultFilter(false)
            .owner(current)
            .build();
        SavedTicketFilter saved = filterRepository.save(filter);
        return ResponseEntity.ok(ApiResponse.success("Filter saved", toMap(saved, current)));
    }

    @PutMapping("/{id}")
    @Transactional
    public ResponseEntity<ApiResponse<Map<String, Object>>> updateFilter(@PathVariable Long id,
            @RequestBody Map<String, Object> body) throws JsonProcessingException {
        User current = userService.getCurrentUser();
        SavedTicketFilter filter = getEditableFilter(id, current);
        if (body.containsKey("name")) filter.setName(requiredString(body, "name"));
        if (body.containsKey("description")) filter.setDescription((String) body.getOrDefault("description", ""));
        if (body.containsKey("filterConfig")) filter.setFilterConfig(toJson(body.get("filterConfig")));
        if (body.containsKey("columnConfig")) filter.setColumnConfig(toJson(body.get("columnConfig")));
        if (body.containsKey("shared")) filter.setShared(Boolean.TRUE.equals(body.get("shared")));
        SavedTicketFilter saved = filterRepository.save(filter);
        return ResponseEntity.ok(ApiResponse.success("Filter updated", toMap(saved, current)));
    }

    @PatchMapping("/{id}/default")
    @Transactional
    public ResponseEntity<ApiResponse<Map<String, Object>>> setDefault(@PathVariable Long id) {
        User current = userService.getCurrentUser();
        SavedTicketFilter filter = getEditableFilter(id, current);
        filterRepository.findByOwnerAndDefaultFilterTrue(current)
            .forEach(f -> {
                f.setDefaultFilter(false);
                filterRepository.save(f);
            });
        filter.setDefaultFilter(true);
        SavedTicketFilter saved = filterRepository.save(filter);
        return ResponseEntity.ok(ApiResponse.success("Default filter set", toMap(saved, current)));
    }

    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<ApiResponse<String>> deleteFilter(@PathVariable Long id) {
        User current = userService.getCurrentUser();
        SavedTicketFilter filter = getEditableFilter(id, current);
        filterRepository.delete(filter);
        return ResponseEntity.ok(ApiResponse.success("Filter deleted"));
    }

    private SavedTicketFilter getEditableFilter(Long id, User current) {
        SavedTicketFilter filter = filterRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Saved ticket filter", "id", id));
        if (!filter.getOwner().getId().equals(current.getId()) && !isAdmin(current)) {
            throw new com.ticketportal.exception.UnauthorizedException("You can only edit filters you own");
        }
        return filter;
    }

    private boolean isAdmin(User user) {
        return user.getRoles().stream().anyMatch(r -> r.getName().equals("ROLE_ADMIN"));
    }

    private String requiredString(Map<String, Object> body, String key) {
        Object value = body.get(key);
        if (value == null || value.toString().isBlank()) {
            throw new IllegalArgumentException(key + " is required");
        }
        return value.toString().trim();
    }

    private String toJson(Object value) throws JsonProcessingException {
        if (value == null) return "{}";
        if (value instanceof String s) return s;
        return objectMapper.writeValueAsString(value);
    }

    private Object fromJson(String json) {
        try {
            return objectMapper.readValue(json, Object.class);
        } catch (Exception ignored) {
            return json;
        }
    }

    private Map<String, Object> toMap(SavedTicketFilter f, User current) {
        Map<String, Object> m = new java.util.LinkedHashMap<>();
        m.put("id", f.getId());
        m.put("name", f.getName());
        m.put("description", f.getDescription());
        m.put("filterConfig", fromJson(f.getFilterConfig()));
        m.put("columnConfig", fromJson(f.getColumnConfig()));
        m.put("shared", f.isShared());
        m.put("defaultFilter", f.isDefaultFilter());
        m.put("ownerId", f.getOwner().getId());
        m.put("ownerName", f.getOwner().getFullName());
        m.put("editable", f.getOwner().getId().equals(current.getId()) || isAdmin(current));
        m.put("createdAt", f.getCreatedAt());
        m.put("updatedAt", f.getUpdatedAt());
        return m;
    }
}
