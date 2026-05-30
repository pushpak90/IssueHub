-- Insert default roles (only if not exist)
INSERT IGNORE INTO roles (name) VALUES ('ROLE_ADMIN');
INSERT IGNORE INTO roles (name) VALUES ('ROLE_MANAGER');
INSERT IGNORE INTO roles (name) VALUES ('ROLE_DEVELOPER');
INSERT IGNORE INTO roles (name) VALUES ('ROLE_TESTER');

-- Insert default admin user (password: Admin@123)
INSERT IGNORE INTO users (id, username, email, password, first_name, last_name, active, created_at)
VALUES (1, 'admin', 'admin@ticketportal.com',
        '$2b$10$FdT572kzJji6iuJsB6WDR.9YQsaA23wuYJzj64YnnpFjrhjhynrRu',
        'System', 'Admin', true, NOW());

-- Assign admin role
INSERT IGNORE INTO user_roles (user_id, role_id)
SELECT 1, id FROM roles WHERE name = 'ROLE_ADMIN';

-- Insert sample developer user (password: Admin@123)
INSERT IGNORE INTO users (id, username, email, password, first_name, last_name, active, created_at)
VALUES (2, 'john.doe', 'john.doe@ticketportal.com',
        '$2b$10$FdT572kzJji6iuJsB6WDR.9YQsaA23wuYJzj64YnnpFjrhjhynrRu',
        'John', 'Doe', true, NOW());

INSERT IGNORE INTO user_roles (user_id, role_id)
SELECT 2, id FROM roles WHERE name = 'ROLE_DEVELOPER';

-- Insert sample manager user (password: Admin@123)
INSERT IGNORE INTO users (id, username, email, password, first_name, last_name, active, created_at)
VALUES (3, 'jane.smith', 'jane.smith@ticketportal.com',
        '$2b$10$FdT572kzJji6iuJsB6WDR.9YQsaA23wuYJzj64YnnpFjrhjhynrRu',
        'Jane', 'Smith', true, NOW());

INSERT IGNORE INTO user_roles (user_id, role_id)
SELECT 3, id FROM roles WHERE name = 'ROLE_MANAGER';

-- Insert sample tester user (password: Admin@123)
INSERT IGNORE INTO users (id, username, email, password, first_name, last_name, active, created_at)
VALUES (4, 'bob.tester', 'bob.tester@ticketportal.com',
        '$2b$10$FdT572kzJji6iuJsB6WDR.9YQsaA23wuYJzj64YnnpFjrhjhynrRu',
        'Bob', 'Tester', true, NOW());

INSERT IGNORE INTO user_roles (user_id, role_id)
SELECT 4, id FROM roles WHERE name = 'ROLE_TESTER';

-- Insert sample project
INSERT IGNORE INTO projects (id, name, description, key_prefix, status, owner_id, created_at)
VALUES (1, 'Ticket Portal Development', 'Main development project for the ticket management system',
        'TKT', 'ACTIVE', 1, NOW());

-- Insert project members
INSERT IGNORE INTO project_members (project_id, user_id) VALUES (1, 1);
INSERT IGNORE INTO project_members (project_id, user_id) VALUES (1, 2);
INSERT IGNORE INTO project_members (project_id, user_id) VALUES (1, 3);
INSERT IGNORE INTO project_members (project_id, user_id) VALUES (1, 4);

-- Insert sample labels
INSERT IGNORE INTO labels (id, name, color, project_id) VALUES (1, 'Bug', '#EF4444', 1);
INSERT IGNORE INTO labels (id, name, color, project_id) VALUES (2, 'Feature', '#3B82F6', 1);
INSERT IGNORE INTO labels (id, name, color, project_id) VALUES (3, 'Enhancement', '#8B5CF6', 1);
INSERT IGNORE INTO labels (id, name, color, project_id) VALUES (4, 'Documentation', '#10B981', 1);
INSERT IGNORE INTO labels (id, name, color, project_id) VALUES (5, 'Testing', '#F59E0B', 1);

-- Insert sample tickets
INSERT IGNORE INTO tickets (id, ticket_number, title, description, status, priority, type, project_id, reporter_id, assignee_id, created_at)
VALUES (1, 'TKT-1', 'Setup project infrastructure',
        'Initialize the project with proper CI/CD pipeline and deployment configuration',
        'DONE', 'HIGH', 'TASK', 1, 1, 2, NOW());

INSERT IGNORE INTO tickets (id, ticket_number, title, description, status, priority, type, project_id, reporter_id, assignee_id, created_at)
VALUES (2, 'TKT-2', 'Implement authentication module',
        'Create login, register, and JWT authentication endpoints',
        'IN_PROGRESS', 'HIGH', 'FEATURE', 1, 3, 2, NOW());

INSERT IGNORE INTO tickets (id, ticket_number, title, description, status, priority, type, project_id, reporter_id, assignee_id, created_at)
VALUES (3, 'TKT-3', 'Design kanban board UI',
        'Create a drag-and-drop kanban board for ticket management',
        'TODO', 'MEDIUM', 'FEATURE', 1, 3, 2, NOW());

INSERT IGNORE INTO tickets (id, ticket_number, title, description, status, priority, type, project_id, reporter_id, assignee_id, created_at)
VALUES (4, 'TKT-4', 'Fix login page responsive issues',
        'Login page is not rendering properly on mobile devices',
        'IN_REVIEW', 'HIGH', 'BUG', 1, 4, 2, NOW());

INSERT IGNORE INTO tickets (id, ticket_number, title, description, status, priority, type, project_id, reporter_id, assignee_id, created_at)
VALUES (5, 'TKT-5', 'Add email notification system',
        'Implement email notifications for ticket assignments and updates',
        'TODO', 'LOW', 'FEATURE', 1, 1, 3, NOW());

-- Insert sample team
INSERT IGNORE INTO teams (id, name, description, project_id, created_at)
VALUES (1, 'Core Dev Team', 'Main development team', 1, NOW());

INSERT IGNORE INTO team_members (team_id, user_id) VALUES (1, 2);
INSERT IGNORE INTO team_members (team_id, user_id) VALUES (1, 3);
INSERT IGNORE INTO team_members (team_id, user_id) VALUES (1, 4);
