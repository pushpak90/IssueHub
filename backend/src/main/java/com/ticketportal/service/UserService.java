package com.ticketportal.service;

import com.ticketportal.dto.request.UpdateUserRequest;
import com.ticketportal.dto.response.PagedResponse;
import com.ticketportal.dto.response.UserResponse;
import com.ticketportal.entity.User;
import com.ticketportal.exception.ResourceNotFoundException;
import com.ticketportal.repository.RoleRepository;
import com.ticketportal.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;

    @Transactional(readOnly = true)
    public User getCurrentUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmail(email)
            .orElseThrow(() -> new ResourceNotFoundException("User", "email", email));
    }

    public UserResponse getCurrentUserResponse() {
        return toResponse(getCurrentUser());
    }

    @Transactional(readOnly = true)
    public UserResponse getUserById(Long id) {
        return toResponse(findById(id));
    }

    public User findById(Long id) {
        return userRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("User", "id", id));
    }

    @Transactional(readOnly = true)
    public PagedResponse<UserResponse> getAllUsers(int page, int size, String search) {
        PageRequest pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        Page<User> users;
        if (search != null && !search.isBlank()) {
            users = userRepository.searchUsers(search, pageable);
        } else {
            users = userRepository.findAll(pageable);
        }
        return toPagedResponse(users);
    }

    @Transactional
    public UserResponse updateUser(Long id, UpdateUserRequest request) {
        User user = findById(id);
        if (request.getFirstName() != null) user.setFirstName(request.getFirstName());
        if (request.getLastName() != null) user.setLastName(request.getLastName());
        if (request.getPhone() != null) user.setPhone(request.getPhone());
        if (request.getBio() != null) user.setBio(request.getBio());
        if (request.getAvatar() != null) user.setAvatar(request.getAvatar());
        return toResponse(userRepository.save(user));
    }

    @Transactional
    public UserResponse updateUserRole(Long id, String roleName) {
        User user = findById(id);
        String fullRoleName = roleName.startsWith("ROLE_") ? roleName : "ROLE_" + roleName.toUpperCase();
        com.ticketportal.entity.Role role = roleRepository.findByName(fullRoleName)
            .orElseThrow(() -> new com.ticketportal.exception.ResourceNotFoundException("Role", "name", fullRoleName));
        // Use a mutable HashSet — Hibernate requires it to manage the collection
        java.util.Set<com.ticketportal.entity.Role> newRoles = new java.util.HashSet<>();
        newRoles.add(role);
        user.getRoles().clear();
        user.getRoles().addAll(newRoles);
        return toResponse(userRepository.save(user));
    }

    @Transactional
    public void toggleUserStatus(Long id) {
        User user = findById(id);
        user.setActive(!user.isActive());
        userRepository.save(user);
    }

    @Transactional(readOnly = true)
    public List<UserResponse> getAllActiveUsers() {
        return userRepository.findAllByActive(true, PageRequest.of(0, 1000))
            .stream().map(this::toResponse).collect(Collectors.toList());
    }

    public UserResponse toResponse(User user) {
        return UserResponse.builder()
            .id(user.getId())
            .username(user.getUsername())
            .email(user.getEmail())
            .firstName(user.getFirstName())
            .lastName(user.getLastName())
            .fullName(user.getFullName())
            .avatar(user.getAvatar())
            .phone(user.getPhone())
            .bio(user.getBio())
            .active(user.isActive())
            .roles(user.getRoles().stream().map(r -> r.getName()).collect(Collectors.toSet()))
            .createdAt(user.getCreatedAt())
            .lastLogin(user.getLastLogin())
            .build();
    }

    private PagedResponse<UserResponse> toPagedResponse(Page<User> page) {
        List<UserResponse> content = page.getContent().stream().map(this::toResponse).collect(Collectors.toList());
        return PagedResponse.<UserResponse>builder()
            .content(content).page(page.getNumber()).size(page.getSize())
            .totalElements(page.getTotalElements()).totalPages(page.getTotalPages())
            .last(page.isLast()).first(page.isFirst()).build();
    }
}
