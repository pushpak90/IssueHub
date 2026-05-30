package com.ticketportal.service;

import com.ticketportal.dto.request.CreateTeamRequest;
import com.ticketportal.dto.response.TeamResponse;
import com.ticketportal.entity.Project;
import com.ticketportal.entity.Team;
import com.ticketportal.entity.User;
import com.ticketportal.exception.ResourceNotFoundException;
import com.ticketportal.repository.ProjectRepository;
import com.ticketportal.repository.TeamRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TeamService {

    private final TeamRepository teamRepository;
    private final ProjectRepository projectRepository;
    private final UserService userService;

    @Transactional
    public TeamResponse createTeam(CreateTeamRequest request) {
        Project project = projectRepository.findById(request.getProjectId())
            .orElseThrow(() -> new ResourceNotFoundException("Project", "id", request.getProjectId()));

        Team team = Team.builder()
            .name(request.getName())
            .description(request.getDescription())
            .project(project)
            .build();

        if (request.getLeadId() != null) {
            team.setLead(userService.findById(request.getLeadId()));
        }

        if (request.getMemberIds() != null && !request.getMemberIds().isEmpty()) {
            Set<User> members = new HashSet<>();
            request.getMemberIds().forEach(id -> members.add(userService.findById(id)));
            team.setMembers(members);
        }

        return toResponse(teamRepository.save(team));
    }

    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public List<TeamResponse> getProjectTeams(Long projectId) {
        Project project = projectRepository.findById(projectId)
            .orElseThrow(() -> new ResourceNotFoundException("Project", "id", projectId));
        return teamRepository.findByProject(project).stream()
            .map(this::toResponse).collect(Collectors.toList());
    }

    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public TeamResponse getTeamById(Long id) {
        Team team = teamRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Team", "id", id));
        return toResponse(team);
    }

    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public List<TeamResponse> getAllTeams() {
        return teamRepository.findAll().stream().map(this::toResponse).collect(Collectors.toList());
    }

    @Transactional
    public TeamResponse addMember(Long teamId, Long userId) {
        Team team = teamRepository.findById(teamId)
            .orElseThrow(() -> new ResourceNotFoundException("Team", "id", teamId));
        team.getMembers().add(userService.findById(userId));
        return toResponse(teamRepository.save(team));
    }

    @Transactional
    public TeamResponse removeMember(Long teamId, Long userId) {
        Team team = teamRepository.findById(teamId)
            .orElseThrow(() -> new ResourceNotFoundException("Team", "id", teamId));
        team.getMembers().removeIf(m -> m.getId().equals(userId));
        return toResponse(teamRepository.save(team));
    }

    @Transactional
    public void deleteTeam(Long id) {
        teamRepository.deleteById(id);
    }

    private TeamResponse toResponse(Team team) {
        return TeamResponse.builder()
            .id(team.getId())
            .name(team.getName())
            .description(team.getDescription())
            .projectId(team.getProject() != null ? team.getProject().getId() : null)
            .projectName(team.getProject() != null ? team.getProject().getName() : null)
            .lead(team.getLead() != null ? userService.toResponse(team.getLead()) : null)
            .members(team.getMembers().stream().map(userService::toResponse).collect(Collectors.toList()))
            .memberCount(team.getMembers().size())
            .createdAt(team.getCreatedAt())
            .build();
    }
}
