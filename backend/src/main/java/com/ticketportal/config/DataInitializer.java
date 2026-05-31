package com.ticketportal.config;

import com.ticketportal.entity.Label;
import com.ticketportal.entity.Project;
import com.ticketportal.entity.Role;
import com.ticketportal.entity.Ticket;
import com.ticketportal.entity.User;
import com.ticketportal.entity.enums.ProjectStatus;
import com.ticketportal.repository.LabelRepository;
import com.ticketportal.repository.ProjectRepository;
import com.ticketportal.repository.RoleRepository;
import com.ticketportal.repository.TicketRepository;
import com.ticketportal.repository.UserRepository;
import com.ticketportal.service.SystemSettingService;
import com.ticketportal.service.TicketConfigService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.Set;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements CommandLineRunner {

    private final RoleRepository roleRepository;
    private final UserRepository userRepository;
    private final ProjectRepository projectRepository;
    private final LabelRepository labelRepository;
    private final TicketRepository ticketRepository;
    private final PasswordEncoder passwordEncoder;
    private final SystemSettingService systemSettingService;
    private final TicketConfigService ticketConfigService;

    @Override
    @Transactional
    public void run(String... args) {
        initRoles();
        initUsers();
        ticketConfigService.seedDefaults();   // seed status/priority/type configs before sample data
        initSampleData();
        systemSettingService.initializeDefaults();
        log.info("Data initialization complete.");
    }

    private void initRoles() {
        for (String name : new String[]{Role.ADMIN, Role.MANAGER, Role.DEVELOPER, Role.TESTER}) {
            if (!roleRepository.existsByName(name)) {
                roleRepository.save(Role.builder().name(name).build());
                log.info("Created role: {}", name);
            }
        }
    }

    private void initUsers() {
        String password = passwordEncoder.encode("Admin@123");

        if (!userRepository.existsByEmail("admin@ticketportal.com")) {
            Role adminRole = roleRepository.findByName(Role.ADMIN).orElseThrow();
            userRepository.save(User.builder()
                    .username("admin")
                    .email("admin@ticketportal.com")
                    .password(password)
                    .firstName("System")
                    .lastName("Admin")
                    .active(true)
                    .roles(Set.of(adminRole))
                    .build());
            log.info("Created admin user: admin@ticketportal.com / Admin@123");
        }

        if (!userRepository.existsByEmail("john.doe@ticketportal.com")) {
            Role devRole = roleRepository.findByName(Role.DEVELOPER).orElseThrow();
            userRepository.save(User.builder()
                    .username("john.doe")
                    .email("john.doe@ticketportal.com")
                    .password(password)
                    .firstName("John").lastName("Doe")
                    .active(true).roles(Set.of(devRole)).build());
        }

        if (!userRepository.existsByEmail("jane.smith@ticketportal.com")) {
            Role managerRole = roleRepository.findByName(Role.MANAGER).orElseThrow();
            userRepository.save(User.builder()
                    .username("jane.smith")
                    .email("jane.smith@ticketportal.com")
                    .password(password)
                    .firstName("Jane").lastName("Smith")
                    .active(true).roles(Set.of(managerRole)).build());
        }

        if (!userRepository.existsByEmail("bob.tester@ticketportal.com")) {
            Role testerRole = roleRepository.findByName(Role.TESTER).orElseThrow();
            userRepository.save(User.builder()
                    .username("bob.tester")
                    .email("bob.tester@ticketportal.com")
                    .password(password)
                    .firstName("Bob").lastName("Tester")
                    .active(true).roles(Set.of(testerRole)).build());
        }
    }

    private void initSampleData() {
        if (projectRepository.count() > 0) return;

        User admin = userRepository.findByEmail("admin@ticketportal.com").orElseThrow();
        User john  = userRepository.findByEmail("john.doe@ticketportal.com").orElseThrow();
        User jane  = userRepository.findByEmail("jane.smith@ticketportal.com").orElseThrow();
        User bob   = userRepository.findByEmail("bob.tester@ticketportal.com").orElseThrow();

        Project project = Project.builder()
                .name("Ticket Portal Development")
                .description("Main development project for the ticket management system")
                .keyPrefix("TKT")
                .status(ProjectStatus.ACTIVE)
                .owner(admin)
                .ticketCounter(5)
                .build();
        project.getMembers().addAll(Set.of(admin, john, jane, bob));
        projectRepository.save(project);

        labelRepository.save(Label.builder().name("Bug").color("#EF4444").project(project).build());
        labelRepository.save(Label.builder().name("Feature").color("#3B82F6").project(project).build());
        labelRepository.save(Label.builder().name("Enhancement").color("#8B5CF6").project(project).build());
        labelRepository.save(Label.builder().name("Testing").color("#F59E0B").project(project).build());

        ticketRepository.save(Ticket.builder()
                .ticketNumber("TKT-1").title("Setup project infrastructure")
                .description("Initialize the project with proper CI/CD pipeline")
                .status("DONE").priority("HIGH").type("TASK")
                .project(project).reporter(admin).assignee(john).build());

        ticketRepository.save(Ticket.builder()
                .ticketNumber("TKT-2").title("Implement authentication module")
                .description("Create login, register, and JWT authentication endpoints")
                .status("IN_PROGRESS").priority("HIGH").type("FEATURE")
                .project(project).reporter(jane).assignee(john).build());

        ticketRepository.save(Ticket.builder()
                .ticketNumber("TKT-3").title("Design kanban board UI")
                .description("Create a drag-and-drop kanban board for ticket management")
                .status("TODO").priority("MEDIUM").type("FEATURE")
                .project(project).reporter(jane).assignee(john).build());

        ticketRepository.save(Ticket.builder()
                .ticketNumber("TKT-4").title("Fix login page responsive issues")
                .description("Login page is not rendering properly on mobile devices")
                .status("IN_REVIEW").priority("HIGH").type("BUG")
                .project(project).reporter(bob).assignee(john).build());

        ticketRepository.save(Ticket.builder()
                .ticketNumber("TKT-5").title("Add email notification system")
                .description("Implement email notifications for ticket assignments and updates")
                .status("TODO").priority("LOW").type("FEATURE")
                .project(project).reporter(admin).assignee(jane).build());

        log.info("Sample project and tickets created.");
    }
}
