-- IssueHub PostgreSQL demo data
-- Paste this whole file into Neon/PostgreSQL SQL editor and execute.
-- Important: this file does NOT insert users. It uses the users created by the app:
-- admin, john.doe, jane.smith, bob.tester

BEGIN;

DO $$
DECLARE
    missing_users text;
BEGIN
    SELECT string_agg(required_username, ', ')
    INTO missing_users
    FROM (
        VALUES ('admin'), ('john.doe'), ('jane.smith'), ('bob.tester')
    ) AS required(required_username)
    WHERE NOT EXISTS (
        SELECT 1
        FROM users u
        WHERE u.username = required.required_username
    );

    IF missing_users IS NOT NULL THEN
        RAISE EXCEPTION
            'Missing required users: %. First register/login or let backend DataInitializer create these users, then run this seed.',
            missing_users;
    END IF;
END $$;

-- Roles/configs are safe reference data. No users are inserted here.
INSERT INTO roles (name)
SELECT role_name
FROM (VALUES
    ('ROLE_ADMIN'),
    ('ROLE_MANAGER'),
    ('ROLE_DEVELOPER'),
    ('ROLE_TESTER'),
    ('ROLE_CSE')
) AS v(role_name)
WHERE NOT EXISTS (SELECT 1 FROM roles r WHERE r.name = v.role_name);

INSERT INTO project_categories (name, description, color, icon, created_at)
VALUES
    ('Internal Product', 'Internal engineering and product delivery work.', '#2563EB', 'folder', NOW()),
    ('Client Support', 'Client support, enhancement, UAT, and release work.', '#059669', 'briefcase', NOW())
ON CONFLICT (name) DO UPDATE
SET description = EXCLUDED.description,
    color = EXCLUDED.color,
    icon = EXCLUDED.icon;

INSERT INTO ticket_priority_configs
    (name, display_name, color, text_color, dot_color, icon, level, is_default, is_active, created_at, updated_at)
SELECT *
FROM (VALUES
    ('CRITICAL', 'Critical', '#FEE2E2', '#DC2626', '#EF4444', 'alert-triangle', 1, FALSE, TRUE, NOW(), NOW()),
    ('HIGH', 'High', '#FFEDD5', '#EA580C', '#F97316', 'arrow-up', 2, FALSE, TRUE, NOW(), NOW()),
    ('MEDIUM', 'Medium', '#FEF3C7', '#D97706', '#F59E0B', 'minus', 3, TRUE, TRUE, NOW(), NOW()),
    ('LOW', 'Low', '#DCFCE7', '#16A34A', '#22C55E', 'arrow-down', 4, FALSE, TRUE, NOW(), NOW())
) AS v(name, display_name, color, text_color, dot_color, icon, level, is_default, is_active, created_at, updated_at)
WHERE NOT EXISTS (
    SELECT 1 FROM ticket_priority_configs c WHERE c.name = v.name
);

INSERT INTO ticket_type_configs
    (name, display_name, color, text_color, icon, position, is_default, is_active, created_at, updated_at)
SELECT *
FROM (VALUES
    ('BUG', 'Bug', '#FEE2E2', '#DC2626', 'bug', 0, FALSE, TRUE, NOW(), NOW()),
    ('FEATURE', 'Feature', '#DBEAFE', '#1D4ED8', 'sparkles', 1, FALSE, TRUE, NOW(), NOW()),
    ('TASK', 'Task', '#F3F4F6', '#374151', 'check-square', 2, TRUE, TRUE, NOW(), NOW()),
    ('IMPROVEMENT', 'Improvement', '#EDE9FE', '#7C3AED', 'zap', 3, FALSE, TRUE, NOW(), NOW()),
    ('TEST', 'Test', '#FFEDD5', '#C2410C', 'flask-conical', 4, FALSE, TRUE, NOW(), NOW()),
    ('DOCUMENTATION', 'Documentation', '#F9FAFB', '#6B7280', 'file-text', 5, FALSE, TRUE, NOW(), NOW())
) AS v(name, display_name, color, text_color, icon, position, is_default, is_active, created_at, updated_at)
WHERE NOT EXISTS (
    SELECT 1 FROM ticket_type_configs c WHERE c.name = v.name
);

INSERT INTO ticket_status_configs
    (name, display_name, color, text_color, icon, position, is_default, is_final, is_active, project_id, created_at, updated_at)
SELECT *
FROM (VALUES
    ('TODO', 'To Do', '#6B7280', '#FFFFFF', 'circle', 0, TRUE, FALSE, TRUE, NULL::bigint, NOW(), NOW()),
    ('DEV_IN_PROGRESS', 'Dev In Progress', '#2563EB', '#FFFFFF', 'code', 1, FALSE, FALSE, TRUE, NULL::bigint, NOW(), NOW()),
    ('IN_PROGRESS', 'In Progress', '#3B82F6', '#FFFFFF', 'loader', 2, FALSE, FALSE, TRUE, NULL::bigint, NOW(), NOW()),
    ('IN_REVIEW', 'In Review', '#8B5CF6', '#FFFFFF', 'eye', 3, FALSE, FALSE, TRUE, NULL::bigint, NOW(), NOW()),
    ('TESTING', 'Testing', '#F59E0B', '#FFFFFF', 'flask-conical', 4, FALSE, FALSE, TRUE, NULL::bigint, NOW(), NOW()),
    ('DONE', 'Done', '#10B981', '#FFFFFF', 'check', 5, FALSE, TRUE, TRUE, NULL::bigint, NOW(), NOW()),
    ('CLOSED', 'Closed', '#4B5563', '#FFFFFF', 'lock', 6, FALSE, TRUE, TRUE, NULL::bigint, NOW(), NOW())
) AS v(name, display_name, color, text_color, icon, position, is_default, is_final, is_active, project_id, created_at, updated_at)
WHERE NOT EXISTS (
    SELECT 1
    FROM ticket_status_configs c
    WHERE c.name = v.name
      AND c.project_id IS NULL
);

INSERT INTO system_settings (setting_key, category, description, setting_value, updated_at)
SELECT *
FROM (VALUES
    ('app.name', 'APP', 'Application display name', 'IssueHub', NOW()),
    ('app.description', 'APP', 'Application description', 'Project, sprint, and support ticket management portal', NOW()),
    ('app.default_status', 'TICKET', 'Default ticket status on create', 'TODO', NOW()),
    ('app.default_priority', 'TICKET', 'Default ticket priority', 'MEDIUM', NOW()),
    ('app.default_type', 'TICKET', 'Default ticket type', 'TASK', NOW()),
    ('board.columns', 'BOARD', 'Kanban board columns', 'TODO,DEV_IN_PROGRESS,IN_REVIEW,TESTING,DONE,CLOSED', NOW()),
    ('board.done_column', 'BOARD', 'Column that marks ticket as done', 'DONE', NOW()),
    ('notif.email_enabled', 'NOTIFICATION', 'Enable email notifications', 'false', NOW()),
    ('notif.mention_enabled', 'NOTIFICATION', 'Enable mention notifications', 'true', NOW())
) AS v(setting_key, category, description, setting_value, updated_at)
WHERE NOT EXISTS (
    SELECT 1 FROM system_settings s WHERE s.setting_key = v.setting_key
);

-- Projects
INSERT INTO projects
    (name, description, key_prefix, status, owner_id, category_id, ticket_counter, deleted, created_at, updated_at)
SELECT
    'Ticket Portal Development',
    'Main development project for the IssueHub ticket management system.',
    'TKT',
    'ACTIVE',
    (SELECT id FROM users WHERE username = 'admin'),
    (SELECT id FROM project_categories WHERE name = 'Internal Product'),
    6,
    FALSE,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM projects WHERE key_prefix = 'TKT' OR name = 'Ticket Portal Development'
);

INSERT INTO projects
    (name, description, key_prefix, status, owner_id, category_id, ticket_counter, deleted, created_at, updated_at)
SELECT
    'ABC Finance Support',
    'Client support and enhancement project covering intake, development, QA, UAT, live release, and closure.',
    'ABC',
    'ACTIVE',
    (SELECT id FROM users WHERE username = 'jane.smith'),
    (SELECT id FROM project_categories WHERE name = 'Client Support'),
    10,
    FALSE,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM projects WHERE key_prefix = 'ABC' OR name = 'ABC Finance Support'
);

-- Keep counters high enough for the seeded ticket numbers.
UPDATE projects
SET ticket_counter = GREATEST(COALESCE(ticket_counter, 0), 6),
    updated_at = NOW()
WHERE key_prefix = 'TKT';

UPDATE projects
SET ticket_counter = GREATEST(COALESCE(ticket_counter, 0), 10),
    updated_at = NOW()
WHERE key_prefix = 'ABC';

-- Project members
INSERT INTO project_members (project_id, user_id)
SELECT p.id, u.id
FROM projects p
JOIN users u ON u.username IN ('admin', 'john.doe', 'jane.smith', 'bob.tester')
WHERE p.key_prefix IN ('TKT', 'ABC')
  AND NOT EXISTS (
      SELECT 1 FROM project_members pm WHERE pm.project_id = p.id AND pm.user_id = u.id
  );

-- Labels
INSERT INTO labels (name, color, project_id)
SELECT v.name, v.color, p.id
FROM (VALUES
    ('Bug', '#EF4444', 'TKT'),
    ('Feature', '#3B82F6', 'TKT'),
    ('Enhancement', '#8B5CF6', 'TKT'),
    ('Testing', '#F59E0B', 'TKT'),
    ('Client Request', '#2563EB', 'ABC'),
    ('Production Issue', '#DC2626', 'ABC'),
    ('Enhancement', '#7C3AED', 'ABC'),
    ('Backend', '#0F766E', 'ABC'),
    ('Frontend', '#DB2777', 'ABC'),
    ('Integration', '#9333EA', 'ABC'),
    ('UAT Approved', '#16A34A', 'ABC'),
    ('Documentation', '#10B981', 'ABC')
) AS v(name, color, project_key)
JOIN projects p ON p.key_prefix = v.project_key
WHERE NOT EXISTS (
    SELECT 1 FROM labels l WHERE l.project_id = p.id AND l.name = v.name
);

-- Teams
INSERT INTO teams (name, description, project_id, lead_id, deleted, created_at, updated_at)
SELECT v.name, v.description, p.id, lead_user.id, FALSE, NOW(), NOW()
FROM (VALUES
    ('Product Engineering', 'Developers and reviewers working on the internal IssueHub product.', 'TKT', 'jane.smith'),
    ('CSE Support Team', 'Support intake, triage, client communication, and UAT coordination.', 'ABC', 'jane.smith'),
    ('Development Team', 'Implementation team for client fixes and enhancements.', 'ABC', 'john.doe'),
    ('QA Testing Team', 'Functional, regression, and release validation team.', 'ABC', 'bob.tester')
) AS v(name, description, project_key, lead_username)
JOIN projects p ON p.key_prefix = v.project_key
JOIN users lead_user ON lead_user.username = v.lead_username
WHERE NOT EXISTS (
    SELECT 1 FROM teams t WHERE t.project_id = p.id AND t.name = v.name
);

INSERT INTO team_members (team_id, user_id)
SELECT t.id, u.id
FROM teams t
JOIN projects p ON p.id = t.project_id
JOIN users u ON (
    (t.name = 'Product Engineering' AND u.username IN ('john.doe', 'jane.smith', 'bob.tester')) OR
    (t.name = 'CSE Support Team' AND u.username IN ('admin', 'jane.smith')) OR
    (t.name = 'Development Team' AND u.username IN ('john.doe', 'jane.smith')) OR
    (t.name = 'QA Testing Team' AND u.username IN ('bob.tester', 'jane.smith'))
)
WHERE p.key_prefix IN ('TKT', 'ABC')
  AND NOT EXISTS (
      SELECT 1 FROM team_members tm WHERE tm.team_id = t.id AND tm.user_id = u.id
  );

-- Boards
INSERT INTO boards (name, description, created_by, column_config, board_type, created_at, updated_at)
SELECT v.name, v.description, u.id, v.column_config, v.board_type, NOW(), NOW()
FROM (VALUES
    ('Engineering Kanban', 'Product delivery board for IssueHub engineering work.', 'admin', 'TODO,DEV_IN_PROGRESS,IN_REVIEW,TESTING,DONE', 'KANBAN'),
    ('ABC Finance Delivery Board', 'Client support board from intake to release closure.', 'jane.smith', 'TODO,DEV_IN_PROGRESS,IN_REVIEW,TESTING,DONE,CLOSED', 'KANBAN')
) AS v(name, description, created_by_username, column_config, board_type)
JOIN users u ON u.username = v.created_by_username
WHERE NOT EXISTS (
    SELECT 1 FROM boards b WHERE b.name = v.name
);

INSERT INTO board_projects (board_id, project_id)
SELECT b.id, p.id
FROM (VALUES
    ('Engineering Kanban', 'TKT'),
    ('ABC Finance Delivery Board', 'ABC')
) AS v(board_name, project_key)
JOIN boards b ON b.name = v.board_name
JOIN projects p ON p.key_prefix = v.project_key
WHERE NOT EXISTS (
    SELECT 1 FROM board_projects bp WHERE bp.board_id = b.id AND bp.project_id = p.id
);

-- Sprints
INSERT INTO sprints (name, goal, project_id, status, start_date, end_date, sprint_number, created_at, completed_at)
SELECT
    'Sprint 1 - ABC Finance SLA Release',
    'Deliver SLA alerting, payment email fix, mobile login repair, and UAT-ready support improvements.',
    p.id,
    'ACTIVE',
    DATE '2026-06-13',
    DATE '2026-06-27',
    1,
    NOW(),
    NULL
FROM projects p
WHERE p.key_prefix = 'ABC'
  AND NOT EXISTS (
      SELECT 1 FROM sprints s WHERE s.project_id = p.id AND s.name = 'Sprint 1 - ABC Finance SLA Release'
  );

-- Tickets
INSERT INTO tickets
    (ticket_number, title, description, status, priority, type, project_id, reporter_id, assignee_id,
     due_date, estimated_hours, actual_hours, sprint_id, resolution_note, deleted, created_at, updated_at, resolved_at)
SELECT
    v.ticket_number,
    v.title,
    v.description,
    v.status,
    v.priority,
    v.type,
    p.id,
    reporter.id,
    assignee.id,
    v.due_date,
    v.estimated_hours,
    v.actual_hours,
    s.id,
    v.resolution_note,
    FALSE,
    NOW(),
    NOW(),
    v.resolved_at
FROM (VALUES
    ('TKT-1', 'Setup project infrastructure', 'Initialize CI/CD pipeline, environment variables, and deployment configuration.', 'DONE', 'HIGH', 'TASK', 'TKT', 'admin', 'john.doe', DATE '2026-06-08', 10, 9, NULL::text, 'Pipeline is configured and verified.', NOW()::timestamp),
    ('TKT-2', 'Implement authentication module', 'Create login, register, JWT refresh, and protected route handling.', 'IN_PROGRESS', 'HIGH', 'FEATURE', 'TKT', 'jane.smith', 'john.doe', DATE '2026-06-28', 18, 7, NULL::text, NULL::text, NULL::timestamp),
    ('TKT-3', 'Design kanban board UI', 'Build draggable ticket columns with labels, priority badges, and quick filters.', 'TODO', 'MEDIUM', 'FEATURE', 'TKT', 'jane.smith', 'john.doe', DATE '2026-07-02', 16, NULL::integer, NULL::text, NULL::text, NULL::timestamp),
    ('TKT-4', 'Fix login page responsive issues', 'Login page form and image panel overlap on small mobile browsers.', 'IN_REVIEW', 'HIGH', 'BUG', 'TKT', 'bob.tester', 'john.doe', DATE '2026-06-26', 6, 4, NULL::text, NULL::text, NULL::timestamp),
    ('TKT-5', 'Add email notification system', 'Send notifications for assignment, comments, mentions, and status changes.', 'TODO', 'LOW', 'FEATURE', 'TKT', 'admin', 'jane.smith', DATE '2026-07-10', 14, NULL::integer, NULL::text, NULL::text, NULL::timestamp),
    ('ABC-1', 'Add client-wise SLA breach alert on support dashboard', 'ABC Finance needs visible SLA breach alerts with client name, ticket number, pending hours, assigned user, and escalation state.', 'CLOSED', 'HIGH', 'IMPROVEMENT', 'ABC', 'jane.smith', 'john.doe', DATE '2026-06-20', 16, 15, 'Sprint 1 - ABC Finance SLA Release', 'Released to live and verified by support.', NOW()::timestamp),
    ('ABC-2', 'Payment confirmation email not sent after successful transaction', 'Successful payments sometimes do not trigger confirmation emails. Requires urgent production fix and regression testing.', 'DEV_IN_PROGRESS', 'CRITICAL', 'BUG', 'ABC', 'jane.smith', 'john.doe', DATE '2026-06-26', 12, 5, 'Sprint 1 - ABC Finance SLA Release', NULL::text, NULL::timestamp),
    ('ABC-3', 'Login page layout breaks on mobile browser', 'CSE reported mobile layout overlap after latest release; frontend fix and TEST validation required.', 'TESTING', 'HIGH', 'BUG', 'ABC', 'bob.tester', 'bob.tester', DATE '2026-06-25', 8, 6, 'Sprint 1 - ABC Finance SLA Release', NULL::text, NULL::timestamp),
    ('ABC-4', 'Add filter by client name in ticket explorer', 'Managers need to filter tickets by client name for weekly support review and escalation calls.', 'IN_REVIEW', 'MEDIUM', 'IMPROVEMENT', 'ABC', 'jane.smith', 'john.doe', DATE '2026-06-28', 10, 8, 'Sprint 1 - ABC Finance SLA Release', NULL::text, NULL::timestamp),
    ('ABC-5', 'Prepare regression test cases for SLA dashboard', 'QA must prepare positive, negative, and boundary cases for SLA breach alert behavior.', 'TODO', 'MEDIUM', 'TEST', 'ABC', 'john.doe', 'bob.tester', DATE '2026-06-27', 6, NULL::integer, 'Sprint 1 - ABC Finance SLA Release', NULL::text, NULL::timestamp),
    ('ABC-6', 'Update UAT checklist for production release', 'Add SLA alert validation and production sign-off steps for CSE UAT.', 'DONE', 'LOW', 'DOCUMENTATION', 'ABC', 'jane.smith', 'bob.tester', DATE '2026-06-24', 4, 4, 'Sprint 1 - ABC Finance SLA Release', 'UAT checklist updated and approved.', NOW()::timestamp),
    ('ABC-7', 'API timeout while fetching old transaction history', 'Transaction history API times out for large ABC Finance accounts; requires query optimization and integration verification.', 'TESTING', 'HIGH', 'BUG', 'ABC', 'jane.smith', 'john.doe', DATE '2026-06-29', 14, 10, 'Sprint 1 - ABC Finance SLA Release', NULL::text, NULL::timestamp),
    ('ABC-8', 'Add escalation comment template for CSE users', 'CSE users need reusable escalation comment templates for faster client communication.', 'IN_REVIEW', 'MEDIUM', 'FEATURE', 'ABC', 'admin', 'jane.smith', DATE '2026-06-30', 9, 6, 'Sprint 1 - ABC Finance SLA Release', NULL::text, NULL::timestamp),
    ('ABC-9', 'Add SSO handoff note for enterprise clients', 'Document the SSO handoff steps and assignment flow for enterprise support tickets.', 'DONE', 'MEDIUM', 'DOCUMENTATION', 'ABC', 'admin', 'jane.smith', DATE '2026-06-25', 5, 5, NULL::text, 'Documentation added and reviewed.', NOW()::timestamp),
    ('ABC-10', 'Create release readiness report for managers', 'Managers need a report showing sprint status, open blockers, testing progress, and UAT approval state.', 'TODO', 'MEDIUM', 'FEATURE', 'ABC', 'jane.smith', 'john.doe', DATE '2026-07-01', 12, NULL::integer, NULL::text, NULL::text, NULL::timestamp)
) AS v(ticket_number, title, description, status, priority, type, project_key, reporter_username, assignee_username, due_date, estimated_hours, actual_hours, sprint_name, resolution_note, resolved_at)
JOIN projects p ON p.key_prefix = v.project_key
JOIN users reporter ON reporter.username = v.reporter_username
LEFT JOIN users assignee ON assignee.username = v.assignee_username
LEFT JOIN sprints s ON s.project_id = p.id AND s.name = v.sprint_name
ON CONFLICT (ticket_number) DO NOTHING;

-- Ticket labels
INSERT INTO ticket_labels (ticket_id, label_id)
SELECT t.id, l.id
FROM (VALUES
    ('TKT-1', 'Enhancement'), ('TKT-2', 'Feature'), ('TKT-3', 'Feature'), ('TKT-4', 'Bug'), ('TKT-4', 'Testing'), ('TKT-5', 'Feature'),
    ('ABC-1', 'Client Request'), ('ABC-1', 'Enhancement'), ('ABC-1', 'Backend'), ('ABC-1', 'UAT Approved'),
    ('ABC-2', 'Production Issue'), ('ABC-2', 'Bug'), ('ABC-2', 'Backend'), ('ABC-2', 'Integration'),
    ('ABC-3', 'Bug'), ('ABC-3', 'Frontend'), ('ABC-3', 'Testing'),
    ('ABC-4', 'Enhancement'), ('ABC-4', 'Frontend'),
    ('ABC-5', 'Testing'), ('ABC-5', 'Documentation'),
    ('ABC-6', 'Documentation'), ('ABC-6', 'UAT Approved'),
    ('ABC-7', 'Production Issue'), ('ABC-7', 'Backend'), ('ABC-7', 'Integration'), ('ABC-7', 'Testing'),
    ('ABC-8', 'Client Request'), ('ABC-8', 'Enhancement'),
    ('ABC-9', 'Documentation'),
    ('ABC-10', 'Enhancement')
) AS v(ticket_number, label_name)
JOIN tickets t ON t.ticket_number = v.ticket_number
JOIN projects p ON p.id = t.project_id
JOIN labels l ON l.project_id = p.id AND l.name = v.label_name
WHERE NOT EXISTS (
    SELECT 1 FROM ticket_labels tl WHERE tl.ticket_id = t.id AND tl.label_id = l.id
);

-- Comments
INSERT INTO comments (content, created_at, edited, deleted, updated_at, author_id, parent_id, ticket_id)
SELECT v.content, v.created_at, FALSE, FALSE, v.created_at, u.id, NULL, t.id
FROM (VALUES
    ('TKT-4', 'john.doe', '@bob.tester responsive fix is ready for review on the staging build.', NOW() - INTERVAL '3 days'),
    ('ABC-1', 'jane.smith', 'Client requirement received: SLA breach alert must show pending hours and escalation state.', NOW() - INTERVAL '10 days'),
    ('ABC-1', 'john.doe', 'SLA calculation and dashboard alert implementation completed.', NOW() - INTERVAL '8 days'),
    ('ABC-1', 'bob.tester', 'Regression passed. UAT approved and live verification completed.', NOW() - INTERVAL '6 days'),
    ('ABC-2', 'jane.smith', 'Production impact confirmed. Please prioritize email trigger investigation.', NOW() - INTERVAL '2 days'),
    ('ABC-2', 'john.doe', 'Found intermittent queue acknowledgement failure. Patch is in progress.', NOW() - INTERVAL '1 day'),
    ('ABC-3', 'bob.tester', 'Mobile layout fix passed Android Chrome. iOS Safari verification is pending.', NOW() - INTERVAL '12 hours'),
    ('ABC-4', 'jane.smith', 'Filter should support partial client name search and preserve existing advanced filters.', NOW() - INTERVAL '1 day'),
    ('ABC-7', 'john.doe', 'Added index coverage and reduced transaction history payload size.', NOW() - INTERVAL '18 hours'),
    ('ABC-8', 'admin', 'Template copy should stay formal and include next action owner.', NOW() - INTERVAL '20 hours'),
    ('ABC-10', 'jane.smith', 'Report should be useful in the Monday manager review without manual spreadsheet work.', NOW() - INTERVAL '4 hours')
) AS v(ticket_number, author_username, content, created_at)
JOIN tickets t ON t.ticket_number = v.ticket_number
JOIN users u ON u.username = v.author_username
WHERE NOT EXISTS (
    SELECT 1 FROM comments c WHERE c.ticket_id = t.id AND c.content = v.content
);

-- Ticket history
INSERT INTO ticket_history (ticket_id, changed_by, field_name, old_value, new_value, change_type, created_at)
SELECT t.id, u.id, v.field_name, v.old_value, v.new_value, v.change_type, v.created_at
FROM (VALUES
    ('ABC-1', 'jane.smith', 'CREATED', NULL::text, NULL::text, 'CREATED', NOW() - INTERVAL '10 days'),
    ('ABC-1', 'john.doe', 'status', 'TODO', 'DEV_IN_PROGRESS', 'STATUS_CHANGED', NOW() - INTERVAL '9 days'),
    ('ABC-1', 'bob.tester', 'status', 'TESTING', 'CLOSED', 'STATUS_CHANGED', NOW() - INTERVAL '6 days'),
    ('ABC-2', 'jane.smith', 'CREATED', NULL::text, NULL::text, 'CREATED', NOW() - INTERVAL '2 days'),
    ('ABC-2', 'john.doe', 'status', 'TODO', 'DEV_IN_PROGRESS', 'STATUS_CHANGED', NOW() - INTERVAL '1 day'),
    ('ABC-3', 'bob.tester', 'status', 'IN_REVIEW', 'TESTING', 'STATUS_CHANGED', NOW() - INTERVAL '12 hours'),
    ('ABC-6', 'bob.tester', 'status', 'TODO', 'DONE', 'STATUS_CHANGED', NOW() - INTERVAL '1 day'),
    ('ABC-7', 'john.doe', 'status', 'DEV_IN_PROGRESS', 'TESTING', 'STATUS_CHANGED', NOW() - INTERVAL '18 hours'),
    ('ABC-9', 'jane.smith', 'status', 'IN_REVIEW', 'DONE', 'STATUS_CHANGED', NOW() - INTERVAL '1 day')
) AS v(ticket_number, username, field_name, old_value, new_value, change_type, created_at)
JOIN tickets t ON t.ticket_number = v.ticket_number
JOIN users u ON u.username = v.username
WHERE NOT EXISTS (
    SELECT 1
    FROM ticket_history h
    WHERE h.ticket_id = t.id
      AND h.change_type = v.change_type
      AND h.field_name = v.field_name
      AND COALESCE(h.old_value, '') = COALESCE(v.old_value, '')
      AND COALESCE(h.new_value, '') = COALESCE(v.new_value, '')
);

-- Notifications
INSERT INTO notifications
    (user_id, title, message, type, reference_id, reference_type, is_read, created_at, deleted)
SELECT u.id, v.title, v.message, v.type, t.id, 'TICKET', v.is_read, v.created_at, FALSE
FROM (VALUES
    ('john.doe', 'Ticket Assigned', 'You have been assigned to ABC-2 - Payment confirmation email not sent after successful transaction', 'TICKET_ASSIGNED', 'ABC-2', FALSE, NOW() - INTERVAL '2 days'),
    ('bob.tester', 'Ticket Assigned', 'You have been assigned to ABC-3 - Login page layout breaks on mobile browser', 'TICKET_ASSIGNED', 'ABC-3', FALSE, NOW() - INTERVAL '1 day'),
    ('jane.smith', 'Ticket Status Updated', 'ABC-1 status changed to CLOSED', 'TICKET_STATUS_CHANGED', 'ABC-1', TRUE, NOW() - INTERVAL '6 days'),
    ('john.doe', 'New Comment', 'Jane Smith commented on ABC-2', 'TICKET_COMMENTED', 'ABC-2', FALSE, NOW() - INTERVAL '1 day'),
    ('bob.tester', 'Ticket Status Updated', 'ABC-7 status changed to TESTING', 'TICKET_STATUS_CHANGED', 'ABC-7', FALSE, NOW() - INTERVAL '18 hours')
) AS v(username, title, message, type, ticket_number, is_read, created_at)
JOIN users u ON u.username = v.username
JOIN tickets t ON t.ticket_number = v.ticket_number
WHERE NOT EXISTS (
    SELECT 1
    FROM notifications n
    WHERE n.user_id = u.id
      AND n.reference_id = t.id
      AND n.title = v.title
      AND n.message = v.message
);

-- Time logs
INSERT INTO time_logs (ticket_id, user_id, hours_spent, description, log_date, created_at)
SELECT t.id, u.id, v.hours_spent, v.description, v.log_date, NOW()
FROM (VALUES
    ('ABC-1', 'john.doe', 6.5::double precision, 'Implemented SLA breach calculation and dashboard alert card.', DATE '2026-06-18'),
    ('ABC-1', 'bob.tester', 3.0::double precision, 'Executed regression and UAT verification cases.', DATE '2026-06-20'),
    ('ABC-2', 'john.doe', 5.0::double precision, 'Investigated queue acknowledgement and email trigger retry logic.', DATE '2026-06-24'),
    ('ABC-3', 'bob.tester', 2.5::double precision, 'Validated responsive login fix on mobile browsers.', DATE '2026-06-25'),
    ('ABC-7', 'john.doe', 4.0::double precision, 'Optimized transaction history query and payload mapping.', DATE '2026-06-24')
) AS v(ticket_number, username, hours_spent, description, log_date)
JOIN tickets t ON t.ticket_number = v.ticket_number
JOIN users u ON u.username = v.username
WHERE NOT EXISTS (
    SELECT 1
    FROM time_logs tl
    WHERE tl.ticket_id = t.id
      AND tl.user_id = u.id
      AND tl.description = v.description
      AND tl.log_date = v.log_date
);

-- Ticket commits
INSERT INTO ticket_commits (ticket_id, commit_hash, commit_message, branch, added_by, created_at)
SELECT t.id, v.commit_hash, v.commit_message, v.branch, u.id, v.created_at
FROM (VALUES
    ('ABC-1', '2f4c5e7abc00112233445566778899aabbccddeeff0011223344556677889900', 'Add SLA breach alert widget and escalation indicator', 'feature/abc-sla-alert', 'john.doe', NOW() - INTERVAL '8 days'),
    ('ABC-2', '4a9d8f7abc00112233445566778899aabbccddeeff0011223344556677889900', 'Retry payment confirmation email after queue ack timeout', 'fix/payment-email-confirmation', 'john.doe', NOW() - INTERVAL '1 day'),
    ('ABC-3', '7c1b9e6abc00112233445566778899aabbccddeeff0011223344556677889900', 'Fix mobile login layout spacing and form wrapping', 'fix/mobile-login-layout', 'john.doe', NOW() - INTERVAL '12 hours'),
    ('ABC-7', '9e2a6b5abc00112233445566778899aabbccddeeff0011223344556677889900', 'Optimize transaction history API for large client accounts', 'perf/transaction-history', 'john.doe', NOW() - INTERVAL '18 hours')
) AS v(ticket_number, commit_hash, commit_message, branch, username, created_at)
JOIN tickets t ON t.ticket_number = v.ticket_number
JOIN users u ON u.username = v.username
WHERE NOT EXISTS (
    SELECT 1 FROM ticket_commits tc WHERE tc.commit_hash = v.commit_hash
);

-- Align identity sequences after any explicit or pre-existing rows.
DO $$
DECLARE
    item record;
    seq_name text;
BEGIN
    FOR item IN SELECT * FROM (VALUES
        ('boards', 'id'),
        ('comments', 'id'),
        ('labels', 'id'),
        ('notifications', 'id'),
        ('project_categories', 'id'),
        ('projects', 'id'),
        ('roles', 'id'),
        ('sprints', 'id'),
        ('teams', 'id'),
        ('ticket_commits', 'id'),
        ('ticket_history', 'id'),
        ('ticket_priority_configs', 'id'),
        ('ticket_status_configs', 'id'),
        ('ticket_type_configs', 'id'),
        ('tickets', 'id'),
        ('time_logs', 'id')
    ) AS v(table_name, column_name) LOOP
        SELECT pg_get_serial_sequence(format('%I', item.table_name), item.column_name) INTO seq_name;
        IF seq_name IS NOT NULL THEN
            EXECUTE format(
                'SELECT setval(%L, GREATEST(COALESCE((SELECT MAX(%I) FROM %I), 0), 1), true)',
                seq_name,
                item.column_name,
                item.table_name
            );
        END IF;
    END LOOP;
END $$;

COMMIT;
