package com.ticketportal.service;

import com.ticketportal.dto.request.PriorityConfigRequest;
import com.ticketportal.dto.request.StatusConfigRequest;
import com.ticketportal.dto.request.TypeConfigRequest;
import com.ticketportal.dto.response.PriorityConfigResponse;
import com.ticketportal.dto.response.StatusConfigResponse;
import com.ticketportal.dto.response.TypeConfigResponse;
import com.ticketportal.entity.Project;
import com.ticketportal.entity.TicketPriorityConfig;
import com.ticketportal.entity.TicketStatusConfig;
import com.ticketportal.entity.TicketTypeConfig;
import com.ticketportal.exception.ResourceNotFoundException;
import com.ticketportal.repository.ProjectRepository;
import com.ticketportal.repository.TicketPriorityConfigRepository;
import com.ticketportal.repository.TicketStatusConfigRepository;
import com.ticketportal.repository.TicketTypeConfigRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class TicketConfigService {

    private final TicketStatusConfigRepository statusRepo;
    private final TicketPriorityConfigRepository priorityRepo;
    private final TicketTypeConfigRepository typeRepo;
    private final ProjectRepository projectRepository;

    // ── Statuses ─────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<StatusConfigResponse> getStatuses(Long projectId) {
        List<TicketStatusConfig> statuses;
        if (projectId != null) {
            // Return project-specific if defined, else fall back to global
            List<TicketStatusConfig> projectStatuses =
                statusRepo.findByProjectIdAndIsActiveTrueOrderByPosition(projectId);
            statuses = projectStatuses.isEmpty()
                ? statusRepo.findByProjectIsNullAndIsActiveTrueOrderByPosition()
                : projectStatuses;
        } else {
            statuses = statusRepo.findByProjectIsNullAndIsActiveTrueOrderByPosition();
        }
        return statuses.stream().map(this::toStatusResponse).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<StatusConfigResponse> getAllStatusesForProject(Long projectId) {
        return statusRepo.findAllForProject(projectId).stream()
            .map(this::toStatusResponse).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<StatusConfigResponse> getGlobalStatuses() {
        return statusRepo.findByProjectIsNullOrderByPosition().stream()
            .map(this::toStatusResponse).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<StatusConfigResponse> getProjectStatuses(Long projectId) {
        return statusRepo.findByProjectIdOrderByPosition(projectId).stream()
            .map(this::toStatusResponse).collect(Collectors.toList());
    }

    @Transactional
    public StatusConfigResponse createStatus(StatusConfigRequest req) {
        String normalizedName = req.getName().toUpperCase().trim().replace(" ", "_");

        if (req.getProjectId() != null) {
            if (statusRepo.existsByNameAndProjectId(normalizedName, req.getProjectId())) {
                throw new IllegalArgumentException("Status '" + normalizedName + "' already exists for this project");
            }
        } else {
            if (statusRepo.existsByNameAndProjectIsNull(normalizedName)) {
                throw new IllegalArgumentException("Global status '" + normalizedName + "' already exists");
            }
        }

        Project project = null;
        if (req.getProjectId() != null) {
            project = projectRepository.findById(req.getProjectId())
                .orElseThrow(() -> new ResourceNotFoundException("Project", "id", req.getProjectId()));
        }

        // If this is set as default, unset previous default
        if (Boolean.TRUE.equals(req.getIsDefault())) {
            clearDefaultStatus(req.getProjectId());
        }

        TicketStatusConfig config = TicketStatusConfig.builder()
            .name(normalizedName)
            .displayName(req.getDisplayName())
            .color(req.getColor())
            .textColor(req.getTextColor())
            .icon(req.getIcon())
            .position(req.getPosition() != null ? req.getPosition() : getNextStatusPosition(req.getProjectId()))
            .isDefault(Boolean.TRUE.equals(req.getIsDefault()))
            .isFinal(Boolean.TRUE.equals(req.getIsFinal()))
            .isActive(true)
            .project(project)
            .build();

        return toStatusResponse(statusRepo.save(config));
    }

    @Transactional
    public StatusConfigResponse updateStatus(Long id, StatusConfigRequest req) {
        TicketStatusConfig config = statusRepo.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("StatusConfig", "id", id));

        if (req.getDisplayName() != null) config.setDisplayName(req.getDisplayName());
        if (req.getColor() != null) config.setColor(req.getColor());
        if (req.getTextColor() != null) config.setTextColor(req.getTextColor());
        if (req.getIcon() != null) config.setIcon(req.getIcon());
        if (req.getPosition() != null) config.setPosition(req.getPosition());
        if (req.getIsFinal() != null) config.setIsFinal(req.getIsFinal());

        if (Boolean.TRUE.equals(req.getIsDefault())) {
            Long projectId = config.getProject() != null ? config.getProject().getId() : null;
            clearDefaultStatus(projectId);
            config.setIsDefault(true);
        }

        return toStatusResponse(statusRepo.save(config));
    }

    @Transactional
    public void deleteStatus(Long id) {
        TicketStatusConfig config = statusRepo.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("StatusConfig", "id", id));
        config.setIsActive(false);
        statusRepo.save(config);
    }

    @Transactional
    public List<StatusConfigResponse> reorderStatuses(Long projectId, List<Long> orderedIds) {
        for (int i = 0; i < orderedIds.size(); i++) {
            statusRepo.findById(orderedIds.get(i)).ifPresent(s -> {
                s.setPosition(orderedIds.indexOf(s.getId()));
                statusRepo.save(s);
            });
        }
        return getStatuses(projectId);
    }

    private void clearDefaultStatus(Long projectId) {
        List<TicketStatusConfig> existing = projectId != null
            ? statusRepo.findByProjectIdOrderByPosition(projectId)
            : statusRepo.findByProjectIsNullOrderByPosition();
        existing.stream().filter(s -> Boolean.TRUE.equals(s.getIsDefault())).forEach(s -> {
            s.setIsDefault(false);
            statusRepo.save(s);
        });
    }

    private int getNextStatusPosition(Long projectId) {
        List<TicketStatusConfig> existing = projectId != null
            ? statusRepo.findByProjectIdOrderByPosition(projectId)
            : statusRepo.findByProjectIsNullOrderByPosition();
        return existing.size();
    }

    // ── Priorities ────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<PriorityConfigResponse> getPriorities() {
        return priorityRepo.findByIsActiveTrueOrderByLevel().stream()
            .map(this::toPriorityResponse).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<PriorityConfigResponse> getAllPriorities() {
        return priorityRepo.findAllByOrderByLevel().stream()
            .map(this::toPriorityResponse).collect(Collectors.toList());
    }

    @Transactional
    public PriorityConfigResponse createPriority(PriorityConfigRequest req) {
        String normalizedName = req.getName().toUpperCase().trim().replace(" ", "_");
        if (priorityRepo.existsByName(normalizedName)) {
            throw new IllegalArgumentException("Priority '" + normalizedName + "' already exists");
        }

        if (Boolean.TRUE.equals(req.getIsDefault())) {
            clearDefaultPriority();
        }

        TicketPriorityConfig config = TicketPriorityConfig.builder()
            .name(normalizedName)
            .displayName(req.getDisplayName())
            .color(req.getColor())
            .textColor(req.getTextColor())
            .dotColor(req.getDotColor())
            .icon(req.getIcon())
            .level(req.getLevel() != null ? req.getLevel() : getNextPriorityLevel())
            .isDefault(Boolean.TRUE.equals(req.getIsDefault()))
            .isActive(true)
            .build();

        return toPriorityResponse(priorityRepo.save(config));
    }

    @Transactional
    public PriorityConfigResponse updatePriority(Long id, PriorityConfigRequest req) {
        TicketPriorityConfig config = priorityRepo.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("PriorityConfig", "id", id));

        if (req.getDisplayName() != null) config.setDisplayName(req.getDisplayName());
        if (req.getColor() != null) config.setColor(req.getColor());
        if (req.getTextColor() != null) config.setTextColor(req.getTextColor());
        if (req.getDotColor() != null) config.setDotColor(req.getDotColor());
        if (req.getIcon() != null) config.setIcon(req.getIcon());
        if (req.getLevel() != null) config.setLevel(req.getLevel());

        if (Boolean.TRUE.equals(req.getIsDefault())) {
            clearDefaultPriority();
            config.setIsDefault(true);
        }

        return toPriorityResponse(priorityRepo.save(config));
    }

    @Transactional
    public void deletePriority(Long id) {
        TicketPriorityConfig config = priorityRepo.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("PriorityConfig", "id", id));
        config.setIsActive(false);
        priorityRepo.save(config);
    }

    private void clearDefaultPriority() {
        priorityRepo.findAllByOrderByLevel().stream()
            .filter(p -> Boolean.TRUE.equals(p.getIsDefault()))
            .forEach(p -> { p.setIsDefault(false); priorityRepo.save(p); });
    }

    private int getNextPriorityLevel() {
        return priorityRepo.findAllByOrderByLevel().size() + 1;
    }

    // ── Types ─────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<TypeConfigResponse> getTypes() {
        return typeRepo.findByIsActiveTrueOrderByPosition().stream()
            .map(this::toTypeResponse).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<TypeConfigResponse> getAllTypes() {
        return typeRepo.findAllByOrderByPosition().stream()
            .map(this::toTypeResponse).collect(Collectors.toList());
    }

    @Transactional
    public TypeConfigResponse createType(TypeConfigRequest req) {
        String normalizedName = req.getName().toUpperCase().trim().replace(" ", "_");
        if (typeRepo.existsByName(normalizedName)) {
            throw new IllegalArgumentException("Type '" + normalizedName + "' already exists");
        }

        if (Boolean.TRUE.equals(req.getIsDefault())) {
            clearDefaultType();
        }

        TicketTypeConfig config = TicketTypeConfig.builder()
            .name(normalizedName)
            .displayName(req.getDisplayName())
            .color(req.getColor())
            .textColor(req.getTextColor())
            .icon(req.getIcon())
            .position(req.getPosition() != null ? req.getPosition() : getNextTypePosition())
            .isDefault(Boolean.TRUE.equals(req.getIsDefault()))
            .isActive(true)
            .build();

        return toTypeResponse(typeRepo.save(config));
    }

    @Transactional
    public TypeConfigResponse updateType(Long id, TypeConfigRequest req) {
        TicketTypeConfig config = typeRepo.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("TypeConfig", "id", id));

        if (req.getDisplayName() != null) config.setDisplayName(req.getDisplayName());
        if (req.getColor() != null) config.setColor(req.getColor());
        if (req.getTextColor() != null) config.setTextColor(req.getTextColor());
        if (req.getIcon() != null) config.setIcon(req.getIcon());
        if (req.getPosition() != null) config.setPosition(req.getPosition());

        if (Boolean.TRUE.equals(req.getIsDefault())) {
            clearDefaultType();
            config.setIsDefault(true);
        }

        return toTypeResponse(typeRepo.save(config));
    }

    @Transactional
    public void deleteType(Long id) {
        TicketTypeConfig config = typeRepo.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("TypeConfig", "id", id));
        config.setIsActive(false);
        typeRepo.save(config);
    }

    private void clearDefaultType() {
        typeRepo.findAllByOrderByPosition().stream()
            .filter(t -> Boolean.TRUE.equals(t.getIsDefault()))
            .forEach(t -> { t.setIsDefault(false); typeRepo.save(t); });
    }

    private int getNextTypePosition() {
        return typeRepo.findAllByOrderByPosition().size();
    }

    // ── Seed defaults ─────────────────────────────────────────────────────────

    @Transactional
    public void seedDefaults() {
        seedDefaultStatuses();
        seedDefaultPriorities();
        seedDefaultTypes();
    }

    private void seedDefaultStatuses() {
        Object[][] defaults = {
            {"TODO",        "To Do",       "#6B7280", "#ffffff", null,  0, true,  false},
            {"IN_PROGRESS", "In Progress", "#3B82F6", "#ffffff", null,  1, false, false},
            {"IN_REVIEW",   "In Review",   "#8B5CF6", "#ffffff", null,  2, false, false},
            {"TESTING",     "Testing",     "#F59E0B", "#ffffff", null,  3, false, false},
            {"DONE",        "Done",        "#10B981", "#ffffff", null,  4, false, true },
            {"CLOSED",      "Closed",      "#4B5563", "#ffffff", null,  5, false, true },
            {"ON_HOLD",     "On Hold",     "#F97316", "#ffffff", null,  6, false, false},
            {"CANCELLED",   "Cancelled",   "#EF4444", "#ffffff", null,  7, false, true },
        };
        for (Object[] d : defaults) {
            String name = (String) d[0];
            if (!statusRepo.existsByNameAndProjectIsNull(name)) {
                statusRepo.save(TicketStatusConfig.builder()
                    .name(name)
                    .displayName((String) d[1])
                    .color((String) d[2])
                    .textColor((String) d[3])
                    .icon((String) d[4])
                    .position((Integer) d[5])
                    .isDefault((Boolean) d[6])
                    .isFinal((Boolean) d[7])
                    .isActive(true)
                    .build());
            }
        }
        log.info("Default statuses seeded.");
    }

    private void seedDefaultPriorities() {
        Object[][] defaults = {
            {"CRITICAL", "Critical", "#FEE2E2", "#DC2626", "#EF4444", "🔴", 1, false},
            {"HIGH",     "High",     "#FFEDD5", "#EA580C", "#F97316", "🟠", 2, false},
            {"MEDIUM",   "Medium",   "#FEF3C7", "#D97706", "#F59E0B", "🟡", 3, true },
            {"LOW",      "Low",      "#DCFCE7", "#16A34A", "#22C55E", "🟢", 4, false},
        };
        for (Object[] d : defaults) {
            String name = (String) d[0];
            if (!priorityRepo.existsByName(name)) {
                priorityRepo.save(TicketPriorityConfig.builder()
                    .name(name)
                    .displayName((String) d[1])
                    .color((String) d[2])
                    .textColor((String) d[3])
                    .dotColor((String) d[4])
                    .icon((String) d[5])
                    .level((Integer) d[6])
                    .isDefault((Boolean) d[7])
                    .isActive(true)
                    .build());
            }
        }
        log.info("Default priorities seeded.");
    }

    private void seedDefaultTypes() {
        Object[][] defaults = {
            {"BUG",           "Bug",           "#FEE2E2", "#DC2626", "🐛", 0, false},
            {"FEATURE",       "Feature",       "#DBEAFE", "#1D4ED8", "✨", 1, false},
            {"TASK",          "Task",          "#F3F4F6", "#374151", "✅", 2, true },
            {"IMPROVEMENT",   "Improvement",   "#EDE9FE", "#7C3AED", "⚡", 3, false},
            {"EPIC",          "Epic",          "#E0E7FF", "#4338CA", "🔮", 4, false},
            {"STORY",         "Story",         "#CCFBF1", "#0F766E", "📖", 5, false},
            {"TEST",          "Test",          "#FFEDD5", "#C2410C", "🧪", 6, false},
            {"DOCUMENTATION", "Documentation", "#F9FAFB", "#6B7280", "📄", 7, false},
        };
        for (Object[] d : defaults) {
            String name = (String) d[0];
            if (!typeRepo.existsByName(name)) {
                typeRepo.save(TicketTypeConfig.builder()
                    .name(name)
                    .displayName((String) d[1])
                    .color((String) d[2])
                    .textColor((String) d[3])
                    .icon((String) d[4])
                    .position((Integer) d[5])
                    .isDefault((Boolean) d[6])
                    .isActive(true)
                    .build());
            }
        }
        log.info("Default types seeded.");
    }

    // ── Mappers ───────────────────────────────────────────────────────────────

    public StatusConfigResponse toStatusResponse(TicketStatusConfig s) {
        return StatusConfigResponse.builder()
            .id(s.getId())
            .name(s.getName())
            .displayName(s.getDisplayName())
            .color(s.getColor())
            .textColor(s.getTextColor())
            .icon(s.getIcon())
            .position(s.getPosition())
            .isDefault(s.getIsDefault())
            .isFinal(s.getIsFinal())
            .isActive(s.getIsActive())
            .projectId(s.getProject() != null ? s.getProject().getId() : null)
            .projectName(s.getProject() != null ? s.getProject().getName() : null)
            .createdAt(s.getCreatedAt())
            .updatedAt(s.getUpdatedAt())
            .build();
    }

    public PriorityConfigResponse toPriorityResponse(TicketPriorityConfig p) {
        return PriorityConfigResponse.builder()
            .id(p.getId())
            .name(p.getName())
            .displayName(p.getDisplayName())
            .color(p.getColor())
            .textColor(p.getTextColor())
            .dotColor(p.getDotColor())
            .icon(p.getIcon())
            .level(p.getLevel())
            .isDefault(p.getIsDefault())
            .isActive(p.getIsActive())
            .createdAt(p.getCreatedAt())
            .updatedAt(p.getUpdatedAt())
            .build();
    }

    public TypeConfigResponse toTypeResponse(TicketTypeConfig t) {
        return TypeConfigResponse.builder()
            .id(t.getId())
            .name(t.getName())
            .displayName(t.getDisplayName())
            .color(t.getColor())
            .textColor(t.getTextColor())
            .icon(t.getIcon())
            .position(t.getPosition())
            .isDefault(t.getIsDefault())
            .isActive(t.getIsActive())
            .createdAt(t.getCreatedAt())
            .updatedAt(t.getUpdatedAt())
            .build();
    }
}
