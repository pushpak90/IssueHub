package com.ticketportal.service;

import com.ticketportal.dto.response.TicketResponse;
import com.ticketportal.entity.Board;
import com.ticketportal.entity.Project;
import com.ticketportal.entity.User;
import com.ticketportal.exception.BadRequestException;
import com.ticketportal.exception.ResourceNotFoundException;
import com.ticketportal.exception.UnauthorizedException;
import com.ticketportal.repository.BoardRepository;
import com.ticketportal.repository.ProjectRepository;
import com.ticketportal.repository.TicketRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class BoardService {

    private final BoardRepository boardRepository;
    private final ProjectRepository projectRepository;
    private final TicketRepository ticketRepository;
    private final UserService userService;
    private final TicketService ticketService;

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getAllBoards() {
        User currentUser = userService.getCurrentUser();
        boolean isAdmin = currentUser.getRoles().stream()
            .anyMatch(r -> r.getName().equals("ROLE_ADMIN") || r.getName().equals("ROLE_MANAGER"));

        List<Board> boards = isAdmin
            ? boardRepository.findAllByOrderByCreatedAtDesc()
            : boardRepository.findBoardsAccessibleByUser(currentUser);

        return boards.stream().map(this::toMap).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getBoardById(Long id) {
        return toMap(getBoard(id));
    }

    @Transactional
    public Map<String, Object> createBoard(String name, String description,
                                            String boardType, List<Long> projectIds,
                                            String columnConfig) {
        User currentUser = userService.getCurrentUser();

        Board board = Board.builder()
            .name(name)
            .description(description)
            .boardType(boardType != null ? boardType : "KANBAN")
            .columnConfig(columnConfig != null ? columnConfig : "TODO,IN_PROGRESS,IN_REVIEW,TESTING,DONE")
            .createdBy(currentUser)
            .build();

        if (projectIds != null && !projectIds.isEmpty()) {
            Set<Project> projects = new HashSet<>(projectRepository.findAllById(projectIds));
            board.setProjects(projects);
        }

        return toMap(boardRepository.save(board));
    }

    @Transactional
    public Map<String, Object> updateBoard(Long id, Map<String, Object> updates) {
        Board board = getBoard(id);
        checkBoardOwner(board);

        if (updates.containsKey("name"))         board.setName((String) updates.get("name"));
        if (updates.containsKey("description"))  board.setDescription((String) updates.get("description"));
        if (updates.containsKey("columnConfig")) board.setColumnConfig((String) updates.get("columnConfig"));

        if (updates.containsKey("projectIds")) {
            @SuppressWarnings("unchecked")
            List<Integer> ids = (List<Integer>) updates.get("projectIds");
            Set<Project> projects = new HashSet<>(
                projectRepository.findAllById(ids.stream().map(Integer::longValue).collect(Collectors.toList()))
            );
            board.setProjects(projects);
        }

        return toMap(boardRepository.save(board));
    }

    @Transactional
    public void deleteBoard(Long id) {
        Board board = getBoard(id);
        checkBoardOwner(board);
        boardRepository.delete(board);
    }

    @Transactional
    public Map<String, Object> addProject(Long boardId, Long projectId) {
        Board board = getBoard(boardId);
        checkBoardOwner(board);
        Project project = projectRepository.findById(projectId)
            .orElseThrow(() -> new ResourceNotFoundException("Project", "id", projectId));
        board.getProjects().add(project);
        return toMap(boardRepository.save(board));
    }

    @Transactional
    public Map<String, Object> removeProject(Long boardId, Long projectId) {
        Board board = getBoard(boardId);
        checkBoardOwner(board);
        board.getProjects().removeIf(p -> p.getId().equals(projectId));
        return toMap(boardRepository.save(board));
    }

    @Transactional(readOnly = true)
    public List<TicketResponse> getBoardTickets(Long boardId, String status,
                                                  String priority, String search) {
        Board board = getBoard(boardId);
        String searchTerm = (search != null && !search.isBlank()) ? search : "";

        com.ticketportal.entity.enums.TicketStatus statusEnum = null;
        com.ticketportal.entity.enums.TicketPriority priorityEnum = null;
        try { if (status   != null) statusEnum   = com.ticketportal.entity.enums.TicketStatus.valueOf(status); } catch (Exception ignored) {}
        try { if (priority != null) priorityEnum = com.ticketportal.entity.enums.TicketPriority.valueOf(priority); } catch (Exception ignored) {}

        List<TicketResponse> result = new ArrayList<>();
        for (Project project : board.getProjects()) {
            var page = ticketRepository.findTicketsWithFilters(
                project, statusEnum, priorityEnum, null, null, searchTerm,
                PageRequest.of(0, 500, Sort.by("createdAt").descending())
            );
            page.getContent().stream().map(ticketService::toResponse).forEach(result::add);
        }
        result.sort(Comparator.comparing(t -> t.getCreatedAt() != null ? t.getCreatedAt().toString() : "", Comparator.reverseOrder()));
        return result;
    }

    private Board getBoard(Long id) {
        return boardRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Board", "id", id));
    }

    private void checkBoardOwner(Board board) {
        User currentUser = userService.getCurrentUser();
        boolean isAdmin = currentUser.getRoles().stream()
            .anyMatch(r -> r.getName().equals("ROLE_ADMIN"));
        if (!isAdmin && !board.getCreatedBy().getId().equals(currentUser.getId())) {
            throw new UnauthorizedException("Only the board creator or Admin can modify this board");
        }
    }

    private Map<String, Object> toMap(Board board) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id",           board.getId());
        m.put("name",         board.getName());
        m.put("description",  board.getDescription());
        m.put("boardType",    board.getBoardType());
        m.put("columnConfig", board.getColumnConfig());
        m.put("createdBy",    board.getCreatedBy() != null ? board.getCreatedBy().getFullName() : null);
        m.put("createdById",  board.getCreatedBy() != null ? board.getCreatedBy().getId() : null);
        m.put("projectCount", board.getProjects().size());
        m.put("projects", board.getProjects().stream().map(p -> {
            Map<String, Object> pm = new LinkedHashMap<>();
            pm.put("id",        p.getId());
            pm.put("name",      p.getName());
            pm.put("keyPrefix", p.getKeyPrefix());
            return pm;
        }).collect(Collectors.toList()));
        m.put("createdAt",    board.getCreatedAt() != null ? board.getCreatedAt().toString() : null);
        return m;
    }
}
