package com.ticketportal.service;

import com.ticketportal.dto.request.LoginRequest;
import com.ticketportal.dto.request.RefreshTokenRequest;
import com.ticketportal.dto.request.RegisterRequest;
import com.ticketportal.dto.response.JwtResponse;
import com.ticketportal.entity.RefreshToken;
import com.ticketportal.entity.Role;
import com.ticketportal.entity.User;
import com.ticketportal.exception.BadRequestException;
import com.ticketportal.exception.ResourceNotFoundException;
import com.ticketportal.exception.TokenRefreshException;
import com.ticketportal.repository.RefreshTokenRepository;
import com.ticketportal.repository.RoleRepository;
import com.ticketportal.repository.UserRepository;
import com.ticketportal.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider tokenProvider;

    @Value("${app.jwt.refresh-expiration}")
    private long refreshTokenDurationMs;

    @Transactional
    public JwtResponse login(LoginRequest request) {
        Authentication authentication = authenticationManager.authenticate(
            new UsernamePasswordAuthenticationToken(request.getUsernameOrEmail(), request.getPassword())
        );

        SecurityContextHolder.getContext().setAuthentication(authentication);
        String jwt = tokenProvider.generateToken(
            (org.springframework.security.core.userdetails.UserDetails) authentication.getPrincipal()
        );

        org.springframework.security.core.userdetails.UserDetails userDetails =
            (org.springframework.security.core.userdetails.UserDetails) authentication.getPrincipal();

        User user = userRepository.findByEmail(userDetails.getUsername())
            .orElseThrow(() -> new ResourceNotFoundException("User", "email", userDetails.getUsername()));

        user.setLastLogin(java.time.LocalDateTime.now());
        userRepository.save(user);

        RefreshToken refreshToken = createRefreshToken(user);

        Set<String> roles = userDetails.getAuthorities().stream()
            .map(GrantedAuthority::getAuthority)
            .collect(Collectors.toSet());

        return JwtResponse.builder()
            .accessToken(jwt)
            .refreshToken(refreshToken.getToken())
            .userId(user.getId())
            .username(user.getUsername())
            .email(user.getEmail())
            .firstName(user.getFirstName())
            .lastName(user.getLastName())
            .avatar(user.getAvatar())
            .roles(roles)
            .build();
    }

    @Transactional
    public User register(RegisterRequest request) {
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new BadRequestException("Username '" + request.getUsername() + "' is already taken");
        }
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new BadRequestException("Email '" + request.getEmail() + "' is already registered");
        }

        User user = User.builder()
            .username(request.getUsername())
            .email(request.getEmail())
            .password(passwordEncoder.encode(request.getPassword()))
            .firstName(request.getFirstName())
            .lastName(request.getLastName())
            .active(true)
            .build();

        Set<Role> roles = new HashSet<>();
        if (request.getRoles() == null || request.getRoles().isEmpty()) {
            roles.add(getRoleByName(Role.DEVELOPER));
        } else {
            request.getRoles().forEach(roleName -> {
                String fullRoleName = roleName.startsWith("ROLE_") ? roleName : "ROLE_" + roleName.toUpperCase();
                roles.add(getRoleByName(fullRoleName));
            });
        }
        user.setRoles(roles);

        return userRepository.save(user);
    }

    @Transactional
    public JwtResponse refreshToken(RefreshTokenRequest request) {
        return refreshTokenRepository.findByToken(request.getRefreshToken())
            .map(this::verifyRefreshTokenExpiry)
            .map(RefreshToken::getUser)
            .map(user -> {
                String newToken = tokenProvider.generateTokenFromUsername(user.getEmail());
                return JwtResponse.builder()
                    .accessToken(newToken)
                    .refreshToken(request.getRefreshToken())
                    .build();
            })
            .orElseThrow(() -> new TokenRefreshException(request.getRefreshToken(), "Refresh token not found"));
    }

    @Transactional
    public void logout(String userEmail) {
        userRepository.findByEmail(userEmail).ifPresent(user ->
            refreshTokenRepository.deleteByUser(user)
        );
    }

    private RefreshToken createRefreshToken(User user) {
        // Reuse existing row if present (UPDATE), otherwise INSERT — avoids duplicate key
        RefreshToken token = refreshTokenRepository.findByUser(user)
            .orElse(RefreshToken.builder().user(user).build());

        token.setToken(UUID.randomUUID().toString());
        token.setExpiresAt(Instant.now().plusMillis(refreshTokenDurationMs));
        return refreshTokenRepository.save(token);
    }

    private RefreshToken verifyRefreshTokenExpiry(RefreshToken token) {
        if (token.getExpiresAt().compareTo(Instant.now()) < 0) {
            refreshTokenRepository.delete(token);
            throw new TokenRefreshException(token.getToken(), "Refresh token has expired. Please log in again.");
        }
        return token;
    }

    private Role getRoleByName(String name) {
        return roleRepository.findByName(name)
            .orElseThrow(() -> new ResourceNotFoundException("Role", "name", name));
    }
}
