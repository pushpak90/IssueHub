-- IssueHub heavy PostgreSQL demo data
-- Paste this whole file into Neon/PostgreSQL SQL editor and execute.
-- Important: this file does NOT insert users. It uses the users created by the app:
-- admin, john.doe, jane.smith, bob.tester
--
-- Scale produced by this script:
--   10 projects total targets (keeps existing TKT/ABC compatible, adds 8 heavier projects)
--   4 sprints per heavy project
--   35 tickets per heavy project
--   labels, teams, boards, comments, history, notifications, time logs, commits,
--   attachments, ticket scripts, ticket relations, and saved ticket filters.

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
    ('Client Support', 'Client support, enhancement, UAT, and release work.', '#059669', 'briefcase', NOW()),
    ('Enterprise Platform', 'Large platform programs with integrations, security, and operations.', '#7C3AED', 'layers', NOW()),
    ('Data & Analytics', 'Reporting, analytics, dashboards, data quality, and BI delivery.', '#0891B2', 'bar-chart', NOW()),
    ('Mobile Apps', 'Mobile application delivery, releases, defects, and store readiness.', '#DB2777', 'smartphone', NOW()),
    ('Operations', 'DevOps, reliability, monitoring, automation, and internal operations.', '#475569', 'settings', NOW())
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
    ('board.columns', 'BOARD', 'Kanban board columns', 'TODO,DEV_IN_PROGRESS,IN_PROGRESS,IN_REVIEW,TESTING,DONE,CLOSED', NOW()),
    ('board.done_column', 'BOARD', 'Column that marks ticket as done', 'DONE', NOW()),
    ('notif.email_enabled', 'NOTIFICATION', 'Enable email notifications', 'false', NOW()),
    ('notif.mention_enabled', 'NOTIFICATION', 'Enable mention notifications', 'true', NOW())
) AS v(setting_key, category, description, setting_value, updated_at)
WHERE NOT EXISTS (
    SELECT 1 FROM system_settings s WHERE s.setting_key = v.setting_key
);

-- Project portfolio. Existing TKT/ABC are kept compatible with the smaller reference script.
WITH project_seed(name, description, key_prefix, status, owner_username, category_name, target_tickets) AS (
    VALUES
        ('Ticket Portal Development', 'Main development project for the IssueHub ticket management system.', 'TKT', 'ACTIVE', 'admin', 'Internal Product', 35),
        ('ABC Finance Support', 'Client support and enhancement project covering intake, development, QA, UAT, live release, and closure.', 'ABC', 'ACTIVE', 'jane.smith', 'Client Support', 35),
        ('Atlas Commerce Platform', 'Enterprise commerce roadmap covering checkout, catalog, fulfillment, and partner integrations.', 'ATL', 'ACTIVE', 'admin', 'Enterprise Platform', 35),
        ('Nova Mobile Banking', 'Mobile banking roadmap with onboarding, biometric login, card controls, and release hardening.', 'NMB', 'ACTIVE', 'jane.smith', 'Mobile Apps', 35),
        ('Helios Analytics Warehouse', 'Data warehouse, metric governance, dashboard performance, and reporting automation.', 'HAW', 'ACTIVE', 'john.doe', 'Data & Analytics', 35),
        ('Orion Support Desk', 'Support desk automation, SLA workflows, escalation templates, and customer communication.', 'OSD', 'ACTIVE', 'jane.smith', 'Client Support', 35),
        ('Pulse CRM Revamp', 'CRM usability, sales pipeline visibility, account history, and manager reporting.', 'PCR', 'ACTIVE', 'admin', 'Enterprise Platform', 35),
        ('Quantum Inventory Cloud', 'Inventory accuracy, warehouse sync, purchase order approvals, and stock reconciliation.', 'QIC', 'ACTIVE', 'john.doe', 'Enterprise Platform', 35),
        ('Sentinel DevOps Reliability', 'Observability, CI/CD reliability, incident automation, and infrastructure hygiene.', 'SDR', 'ACTIVE', 'admin', 'Operations', 35),
        ('Zenith Knowledge Base', 'Knowledge base authoring, review workflow, article analytics, and search quality.', 'ZKB', 'ACTIVE', 'jane.smith', 'Internal Product', 35)
)
INSERT INTO projects
    (name, description, key_prefix, status, owner_id, category_id, ticket_counter, deleted, created_at, updated_at)
SELECT
    ps.name,
    ps.description,
    ps.key_prefix,
    ps.status,
    owner_user.id,
    pc.id,
    ps.target_tickets,
    FALSE,
    NOW() - INTERVAL '60 days',
    NOW()
FROM project_seed ps
JOIN users owner_user ON owner_user.username = ps.owner_username
JOIN project_categories pc ON pc.name = ps.category_name
WHERE NOT EXISTS (
    SELECT 1 FROM projects p WHERE p.key_prefix = ps.key_prefix OR p.name = ps.name
);

WITH project_seed(key_prefix, target_tickets) AS (
    VALUES
        ('TKT', 35), ('ABC', 35), ('ATL', 35), ('NMB', 35), ('HAW', 35),
        ('OSD', 35), ('PCR', 35), ('QIC', 35), ('SDR', 35), ('ZKB', 35)
)
UPDATE projects p
SET ticket_counter = GREATEST(COALESCE(p.ticket_counter, 0), ps.target_tickets),
    updated_at = NOW()
FROM project_seed ps
WHERE p.key_prefix = ps.key_prefix;

-- Members across all demo projects.
INSERT INTO project_members (project_id, user_id)
SELECT p.id, u.id
FROM projects p
JOIN users u ON u.username IN ('admin', 'john.doe', 'jane.smith', 'bob.tester')
WHERE p.key_prefix IN ('TKT', 'ABC', 'ATL', 'NMB', 'HAW', 'OSD', 'PCR', 'QIC', 'SDR', 'ZKB')
  AND NOT EXISTS (
      SELECT 1 FROM project_members pm WHERE pm.project_id = p.id AND pm.user_id = u.id
  );

-- Project labels.
WITH label_seed(name, color) AS (
    VALUES
        ('Bug', '#EF4444'),
        ('Feature', '#3B82F6'),
        ('Enhancement', '#8B5CF6'),
        ('Testing', '#F59E0B'),
        ('Backend', '#0F766E'),
        ('Frontend', '#DB2777'),
        ('Integration', '#9333EA'),
        ('Documentation', '#10B981'),
        ('Security', '#B91C1C'),
        ('Performance', '#0891B2'),
        ('Data Quality', '#4F46E5'),
        ('Client Request', '#2563EB'),
        ('Production Issue', '#DC2626'),
        ('UAT Approved', '#16A34A')
)
INSERT INTO labels (name, color, project_id)
SELECT ls.name, ls.color, p.id
FROM projects p
CROSS JOIN label_seed ls
WHERE p.key_prefix IN ('TKT', 'ABC', 'ATL', 'NMB', 'HAW', 'OSD', 'PCR', 'QIC', 'SDR', 'ZKB')
  AND NOT EXISTS (
      SELECT 1 FROM labels l WHERE l.project_id = p.id AND l.name = ls.name
  );

-- Teams and team members.
WITH team_seed(name, description, lead_username) AS (
    VALUES
        ('Product Squad', 'Product managers, delivery leads, and implementation owners.', 'jane.smith'),
        ('Engineering Squad', 'Backend and frontend engineers delivering feature and defect work.', 'john.doe'),
        ('QA Squad', 'Functional, regression, release, and UAT validation team.', 'bob.tester'),
        ('Support Squad', 'Support intake, triage, escalation, and customer communication.', 'jane.smith')
)
INSERT INTO teams (name, description, project_id, lead_id, deleted, created_at, updated_at)
SELECT ts.name, ts.description, p.id, lead_user.id, FALSE, NOW() - INTERVAL '55 days', NOW()
FROM projects p
CROSS JOIN team_seed ts
JOIN users lead_user ON lead_user.username = ts.lead_username
WHERE p.key_prefix IN ('TKT', 'ABC', 'ATL', 'NMB', 'HAW', 'OSD', 'PCR', 'QIC', 'SDR', 'ZKB')
  AND NOT EXISTS (
      SELECT 1 FROM teams t WHERE t.project_id = p.id AND t.name = ts.name
  );

INSERT INTO team_members (team_id, user_id)
SELECT t.id, u.id
FROM teams t
JOIN projects p ON p.id = t.project_id
JOIN users u ON (
    (t.name = 'Product Squad' AND u.username IN ('admin', 'jane.smith')) OR
    (t.name = 'Engineering Squad' AND u.username IN ('john.doe', 'jane.smith')) OR
    (t.name = 'QA Squad' AND u.username IN ('bob.tester', 'jane.smith')) OR
    (t.name = 'Support Squad' AND u.username IN ('admin', 'jane.smith', 'bob.tester'))
)
WHERE p.key_prefix IN ('TKT', 'ABC', 'ATL', 'NMB', 'HAW', 'OSD', 'PCR', 'QIC', 'SDR', 'ZKB')
  AND NOT EXISTS (
      SELECT 1 FROM team_members tm WHERE tm.team_id = t.id AND tm.user_id = u.id
  );

-- Boards per project plus one portfolio board.
INSERT INTO boards (name, description, created_by, column_config, board_type, created_at, updated_at)
SELECT
    p.key_prefix || ' Delivery Board',
    'Kanban board for ' || p.name || ' delivery, QA, and release tracking.',
    owner_user.id,
    'TODO,DEV_IN_PROGRESS,IN_PROGRESS,IN_REVIEW,TESTING,DONE,CLOSED',
    'KANBAN',
    NOW() - INTERVAL '50 days',
    NOW()
FROM projects p
JOIN users owner_user ON owner_user.id = p.owner_id
WHERE p.key_prefix IN ('TKT', 'ABC', 'ATL', 'NMB', 'HAW', 'OSD', 'PCR', 'QIC', 'SDR', 'ZKB')
  AND NOT EXISTS (
      SELECT 1 FROM boards b WHERE b.name = p.key_prefix || ' Delivery Board'
  );

INSERT INTO boards (name, description, created_by, column_config, board_type, created_at, updated_at)
SELECT
    'Portfolio Command Board',
    'Cross-project board for management review across the heavy demo portfolio.',
    u.id,
    'TODO,DEV_IN_PROGRESS,IN_PROGRESS,IN_REVIEW,TESTING,DONE,CLOSED',
    'KANBAN',
    NOW() - INTERVAL '50 days',
    NOW()
FROM users u
WHERE u.username = 'admin'
  AND NOT EXISTS (SELECT 1 FROM boards b WHERE b.name = 'Portfolio Command Board');

INSERT INTO board_projects (board_id, project_id)
SELECT b.id, p.id
FROM boards b
JOIN projects p ON b.name = p.key_prefix || ' Delivery Board'
WHERE p.key_prefix IN ('TKT', 'ABC', 'ATL', 'NMB', 'HAW', 'OSD', 'PCR', 'QIC', 'SDR', 'ZKB')
  AND NOT EXISTS (
      SELECT 1 FROM board_projects bp WHERE bp.board_id = b.id AND bp.project_id = p.id
  );

INSERT INTO board_projects (board_id, project_id)
SELECT b.id, p.id
FROM boards b
JOIN projects p ON p.key_prefix IN ('TKT', 'ABC', 'ATL', 'NMB', 'HAW', 'OSD', 'PCR', 'QIC', 'SDR', 'ZKB')
WHERE b.name = 'Portfolio Command Board'
  AND NOT EXISTS (
      SELECT 1 FROM board_projects bp WHERE bp.board_id = b.id AND bp.project_id = p.id
  );

-- Four sprints for every demo project.
INSERT INTO sprints (name, goal, project_id, status, start_date, end_date, sprint_number, created_at, completed_at)
SELECT
    'Sprint ' || gs.n || ' - ' || p.key_prefix || ' Release Train',
    CASE gs.n
        WHEN 1 THEN 'Stabilize foundations, close priority defects, and prepare release flow.'
        WHEN 2 THEN 'Deliver major workflow enhancements and improve team visibility.'
        WHEN 3 THEN 'Harden integrations, performance, security, and reporting quality.'
        ELSE 'Complete UAT, release readiness, documentation, and production closure.'
    END,
    p.id,
    CASE
        WHEN gs.n = 1 THEN 'COMPLETED'
        WHEN gs.n = 2 THEN 'ACTIVE'
        ELSE 'PLANNING'
    END,
    DATE '2026-05-04' + ((gs.n - 1) * 14),
    DATE '2026-05-17' + ((gs.n - 1) * 14),
    gs.n,
    NOW() - INTERVAL '50 days',
    CASE WHEN gs.n = 1 THEN (DATE '2026-05-17')::timestamp ELSE NULL::timestamp END
FROM projects p
CROSS JOIN generate_series(1, 4) AS gs(n)
WHERE p.key_prefix IN ('TKT', 'ABC', 'ATL', 'NMB', 'HAW', 'OSD', 'PCR', 'QIC', 'SDR', 'ZKB')
  AND NOT EXISTS (
      SELECT 1 FROM sprints s WHERE s.project_id = p.id AND s.sprint_number = gs.n
  );

-- Main ticket volume.
WITH generated_tickets AS (
    SELECT
        p.id AS project_id,
        p.key_prefix,
        gs.n,
        p.key_prefix || '-' || gs.n AS ticket_number,
        CASE (gs.n % 12)
            WHEN 0 THEN 'Fix intermittent production error in release workflow'
            WHEN 1 THEN 'Add manager dashboard metric for weekly review'
            WHEN 2 THEN 'Improve advanced filter behavior for support agents'
            WHEN 3 THEN 'Validate regression coverage for release candidate'
            WHEN 4 THEN 'Document handoff and UAT sign-off process'
            WHEN 5 THEN 'Optimize API response time for high-volume records'
            WHEN 6 THEN 'Add audit trail for sensitive status changes'
            WHEN 7 THEN 'Repair mobile layout issue in compact view'
            WHEN 8 THEN 'Create bulk update action for operations team'
            WHEN 9 THEN 'Integrate external webhook retry handling'
            WHEN 10 THEN 'Refine role-based access for project settings'
            ELSE 'Prepare release readiness report for stakeholders'
        END AS title_base,
        CASE (gs.n % 7)
            WHEN 0 THEN 'TODO'
            WHEN 1 THEN 'DEV_IN_PROGRESS'
            WHEN 2 THEN 'IN_REVIEW'
            WHEN 3 THEN 'TESTING'
            WHEN 4 THEN 'DONE'
            WHEN 5 THEN 'CLOSED'
            ELSE 'IN_PROGRESS'
        END AS status,
        CASE (gs.n % 4)
            WHEN 0 THEN 'CRITICAL'
            WHEN 1 THEN 'HIGH'
            WHEN 2 THEN 'MEDIUM'
            ELSE 'LOW'
        END AS priority,
        CASE (gs.n % 6)
            WHEN 0 THEN 'BUG'
            WHEN 1 THEN 'FEATURE'
            WHEN 2 THEN 'TASK'
            WHEN 3 THEN 'IMPROVEMENT'
            WHEN 4 THEN 'TEST'
            ELSE 'DOCUMENTATION'
        END AS ticket_type,
        CASE (gs.n % 4)
            WHEN 0 THEN 'admin'
            WHEN 1 THEN 'jane.smith'
            WHEN 2 THEN 'john.doe'
            ELSE 'bob.tester'
        END AS reporter_username,
        CASE (gs.n % 4)
            WHEN 0 THEN 'john.doe'
            WHEN 1 THEN 'jane.smith'
            WHEN 2 THEN 'bob.tester'
            ELSE 'admin'
        END AS assignee_username,
        ((gs.n - 1) / 9) + 1 AS sprint_number
    FROM projects p
    CROSS JOIN generate_series(1, 35) AS gs(n)
    WHERE p.key_prefix IN ('TKT', 'ABC', 'ATL', 'NMB', 'HAW', 'OSD', 'PCR', 'QIC', 'SDR', 'ZKB')
)
INSERT INTO tickets
    (ticket_number, title, description, status, priority, type, project_id, reporter_id, assignee_id,
     due_date, estimated_hours, actual_hours, sprint_id, resolution_note, deleted, created_at, updated_at, resolved_at)
SELECT
    gt.ticket_number,
    gt.title_base || ' - ' || gt.key_prefix || ' #' || gt.n,
    'Heavy demo ticket for ' || gt.key_prefix || '. Covers planning, implementation, QA, support communication, release tracking, and management reporting. Sequence item ' || gt.n || '.',
    gt.status,
    gt.priority,
    gt.ticket_type,
    gt.project_id,
    reporter.id,
    assignee.id,
    DATE '2026-06-01' + (gt.n % 45),
    4 + (gt.n % 18),
    CASE WHEN gt.status IN ('DONE', 'CLOSED') THEN 3 + (gt.n % 16) ELSE NULL::integer END,
    s.id,
    CASE WHEN gt.status IN ('DONE', 'CLOSED') THEN 'Completed in heavy demo data and verified through project workflow.' ELSE NULL::text END,
    FALSE,
    NOW() - ((40 - (gt.n % 35)) || ' days')::interval,
    NOW() - ((gt.n % 10) || ' hours')::interval,
    CASE WHEN gt.status IN ('DONE', 'CLOSED') THEN NOW() - ((gt.n % 5) || ' days')::interval ELSE NULL::timestamp END
FROM generated_tickets gt
JOIN users reporter ON reporter.username = gt.reporter_username
JOIN users assignee ON assignee.username = gt.assignee_username
LEFT JOIN sprints s ON s.project_id = gt.project_id AND s.sprint_number = LEAST(gt.sprint_number, 4)
ON CONFLICT (ticket_number) DO NOTHING;

-- Ticket labels: two labels per ticket.
WITH label_pick AS (
    SELECT
        t.id AS ticket_id,
        t.project_id,
        CASE (split_part(t.ticket_number, '-', 2)::integer % 7)
            WHEN 0 THEN 'Production Issue'
            WHEN 1 THEN 'Feature'
            WHEN 2 THEN 'Backend'
            WHEN 3 THEN 'Testing'
            WHEN 4 THEN 'Documentation'
            WHEN 5 THEN 'Performance'
            ELSE 'Enhancement'
        END AS first_label,
        CASE (split_part(t.ticket_number, '-', 2)::integer % 6)
            WHEN 0 THEN 'Integration'
            WHEN 1 THEN 'Frontend'
            WHEN 2 THEN 'Client Request'
            WHEN 3 THEN 'Security'
            WHEN 4 THEN 'Data Quality'
            ELSE 'Bug'
        END AS second_label
    FROM tickets t
    JOIN projects p ON p.id = t.project_id
    WHERE p.key_prefix IN ('TKT', 'ABC', 'ATL', 'NMB', 'HAW', 'OSD', 'PCR', 'QIC', 'SDR', 'ZKB')
)
INSERT INTO ticket_labels (ticket_id, label_id)
SELECT lp.ticket_id, l.id
FROM label_pick lp
JOIN LATERAL (VALUES (lp.first_label), (lp.second_label)) AS picked(label_name) ON TRUE
JOIN labels l ON l.project_id = lp.project_id AND l.name = picked.label_name
WHERE NOT EXISTS (
    SELECT 1 FROM ticket_labels tl WHERE tl.ticket_id = lp.ticket_id AND tl.label_id = l.id
);

-- Comments: two operational comments per ticket.
INSERT INTO comments (content, created_at, edited, deleted, updated_at, author_id, parent_id, ticket_id)
SELECT
    CASE c.comment_no
        WHEN 1 THEN 'Initial triage completed. Scope, owner, and next action are recorded for this heavy demo ticket.'
        ELSE 'Status update: implementation, QA evidence, or release note has been refreshed for stakeholder visibility.'
    END,
    t.created_at + (c.comment_no || ' days')::interval,
    FALSE,
    FALSE,
    t.created_at + (c.comment_no || ' days')::interval,
    u.id,
    NULL,
    t.id
FROM tickets t
JOIN projects p ON p.id = t.project_id
CROSS JOIN generate_series(1, 2) AS c(comment_no)
JOIN users u ON u.username = CASE WHEN c.comment_no = 1 THEN 'jane.smith' ELSE 'bob.tester' END
WHERE p.key_prefix IN ('TKT', 'ABC', 'ATL', 'NMB', 'HAW', 'OSD', 'PCR', 'QIC', 'SDR', 'ZKB')
  AND NOT EXISTS (
      SELECT 1
      FROM comments existing
      WHERE existing.ticket_id = t.id
        AND existing.content = CASE c.comment_no
            WHEN 1 THEN 'Initial triage completed. Scope, owner, and next action are recorded for this heavy demo ticket.'
            ELSE 'Status update: implementation, QA evidence, or release note has been refreshed for stakeholder visibility.'
        END
  );

-- Ticket history: created, assignment, and status change.
INSERT INTO ticket_history (ticket_id, changed_by, field_name, old_value, new_value, change_type, created_at)
SELECT t.id, u.id, h.field_name, h.old_value, h.new_value, h.change_type, t.created_at + h.offset_interval
FROM tickets t
JOIN projects p ON p.id = t.project_id
JOIN users u ON u.username = 'jane.smith'
JOIN LATERAL (
    VALUES
        ('CREATED', NULL::text, NULL::text, 'CREATED', INTERVAL '0 hours'),
        ('assignee', NULL::text, COALESCE((SELECT username FROM users WHERE id = t.assignee_id), 'unassigned'), 'ASSIGNED', INTERVAL '2 hours'),
        ('status', 'TODO', t.status, 'STATUS_CHANGED', INTERVAL '1 day')
) AS h(field_name, old_value, new_value, change_type, offset_interval) ON TRUE
WHERE p.key_prefix IN ('TKT', 'ABC', 'ATL', 'NMB', 'HAW', 'OSD', 'PCR', 'QIC', 'SDR', 'ZKB')
  AND NOT EXISTS (
      SELECT 1
      FROM ticket_history existing
      WHERE existing.ticket_id = t.id
        AND existing.change_type = h.change_type
        AND existing.field_name = h.field_name
        AND COALESCE(existing.new_value, '') = COALESCE(h.new_value, '')
  );

-- Notifications for assigned and status-sensitive work.
INSERT INTO notifications
    (user_id, title, message, type, reference_id, reference_type, is_read, created_at, deleted)
SELECT
    t.assignee_id,
    'Ticket Assigned',
    'You have been assigned to ' || t.ticket_number || ' - ' || t.title,
    'TICKET_ASSIGNED',
    t.id,
    'TICKET',
    (split_part(t.ticket_number, '-', 2)::integer % 3 = 0),
    t.created_at + INTERVAL '3 hours',
    FALSE
FROM tickets t
JOIN projects p ON p.id = t.project_id
WHERE p.key_prefix IN ('TKT', 'ABC', 'ATL', 'NMB', 'HAW', 'OSD', 'PCR', 'QIC', 'SDR', 'ZKB')
  AND t.assignee_id IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM notifications n
      WHERE n.user_id = t.assignee_id
        AND n.reference_id = t.id
        AND n.title = 'Ticket Assigned'
  );

INSERT INTO notifications
    (user_id, title, message, type, reference_id, reference_type, is_read, created_at, deleted)
SELECT
    p.owner_id,
    'Ticket Status Updated',
    t.ticket_number || ' status changed to ' || t.status,
    'TICKET_STATUS_CHANGED',
    t.id,
    'TICKET',
    (t.status IN ('DONE', 'CLOSED')),
    t.updated_at,
    FALSE
FROM tickets t
JOIN projects p ON p.id = t.project_id
WHERE p.key_prefix IN ('TKT', 'ABC', 'ATL', 'NMB', 'HAW', 'OSD', 'PCR', 'QIC', 'SDR', 'ZKB')
  AND t.status IN ('IN_REVIEW', 'TESTING', 'DONE', 'CLOSED')
  AND NOT EXISTS (
      SELECT 1 FROM notifications n
      WHERE n.user_id = p.owner_id
        AND n.reference_id = t.id
        AND n.title = 'Ticket Status Updated'
  );

-- Time logs for active and completed work.
INSERT INTO time_logs (ticket_id, user_id, hours_spent, description, log_date, created_at)
SELECT
    t.id,
    COALESCE(t.assignee_id, p.owner_id),
    (1.5 + (split_part(t.ticket_number, '-', 2)::integer % 6))::double precision,
    CASE tl.log_no
        WHEN 1 THEN 'Analysis, implementation planning, and code changes for heavy demo ticket.'
        ELSE 'Validation, review updates, and release readiness work for heavy demo ticket.'
    END,
    (t.created_at::date + tl.log_no),
    t.created_at + (tl.log_no || ' days')::interval
FROM tickets t
JOIN projects p ON p.id = t.project_id
CROSS JOIN generate_series(1, 2) AS tl(log_no)
WHERE p.key_prefix IN ('TKT', 'ABC', 'ATL', 'NMB', 'HAW', 'OSD', 'PCR', 'QIC', 'SDR', 'ZKB')
  AND t.status <> 'TODO'
  AND NOT EXISTS (
      SELECT 1
      FROM time_logs existing
      WHERE existing.ticket_id = t.id
        AND existing.description = CASE tl.log_no
            WHEN 1 THEN 'Analysis, implementation planning, and code changes for heavy demo ticket.'
            ELSE 'Validation, review updates, and release readiness work for heavy demo ticket.'
        END
  );

-- Commits for implementation tickets.
INSERT INTO ticket_commits (ticket_id, commit_hash, commit_message, branch, added_by, created_at)
SELECT
    t.id,
    md5(t.ticket_number || ':heavy-demo:commit') || md5(t.title),
    'Implement heavy demo work for ' || t.ticket_number,
    lower('feature/' || replace(t.ticket_number, '-', '-') || '-delivery'),
    COALESCE(t.assignee_id, p.owner_id),
    t.updated_at
FROM tickets t
JOIN projects p ON p.id = t.project_id
WHERE p.key_prefix IN ('TKT', 'ABC', 'ATL', 'NMB', 'HAW', 'OSD', 'PCR', 'QIC', 'SDR', 'ZKB')
  AND t.type IN ('FEATURE', 'BUG', 'IMPROVEMENT')
  AND NOT EXISTS (
      SELECT 1
      FROM ticket_commits tc
      WHERE tc.commit_hash = md5(t.ticket_number || ':heavy-demo:commit') || md5(t.title)
  );

-- Attachments for QA/release evidence.
INSERT INTO attachments (file_name, original_name, file_size, content_type, file_path, ticket_id, uploaded_by, created_at)
SELECT
    lower(t.ticket_number) || '-evidence-' || a.attachment_no || '.txt',
    t.ticket_number || ' Evidence ' || a.attachment_no || '.txt',
    2048 + (split_part(t.ticket_number, '-', 2)::integer * 37),
    'text/plain',
    '/uploads/demo/' || lower(t.ticket_number) || '-evidence-' || a.attachment_no || '.txt',
    t.id,
    COALESCE(t.assignee_id, p.owner_id),
    t.updated_at
FROM tickets t
JOIN projects p ON p.id = t.project_id
CROSS JOIN generate_series(1, 1) AS a(attachment_no)
WHERE p.key_prefix IN ('TKT', 'ABC', 'ATL', 'NMB', 'HAW', 'OSD', 'PCR', 'QIC', 'SDR', 'ZKB')
  AND t.status IN ('IN_REVIEW', 'TESTING', 'DONE', 'CLOSED')
  AND NOT EXISTS (
      SELECT 1
      FROM attachments existing
      WHERE existing.ticket_id = t.id
        AND existing.file_name = lower(t.ticket_number) || '-evidence-' || a.attachment_no || '.txt'
  );

-- SQL/procedure snippets linked to selected tickets.
INSERT INTO ticket_scripts (ticket_id, title, description, script_type, sql_content, added_by, created_at)
SELECT
    t.id,
    'Demo verification script for ' || t.ticket_number,
    'Generated script used to show ticket-linked database or migration artifacts in the heavy demo dataset.',
    CASE WHEN t.type = 'BUG' THEN 'SQL' ELSE 'MIGRATION' END,
    'SELECT ''' || t.ticket_number || ''' AS ticket_number, ''' || replace(t.status, '''', '''''') || ''' AS status;',
    COALESCE(t.assignee_id, p.owner_id),
    t.updated_at
FROM tickets t
JOIN projects p ON p.id = t.project_id
WHERE p.key_prefix IN ('TKT', 'ABC', 'ATL', 'NMB', 'HAW', 'OSD', 'PCR', 'QIC', 'SDR', 'ZKB')
  AND split_part(t.ticket_number, '-', 2)::integer % 5 = 0
  AND NOT EXISTS (
      SELECT 1
      FROM ticket_scripts existing
      WHERE existing.ticket_id = t.id
        AND existing.title = 'Demo verification script for ' || t.ticket_number
  );

-- Ticket relations within each project.
INSERT INTO ticket_relations (source_id, target_id, relation_type, created_by, created_at)
SELECT source_ticket.id, target_ticket.id, 'RELATES_TO', u.id, NOW() - INTERVAL '3 days'
FROM projects p
JOIN tickets source_ticket ON source_ticket.project_id = p.id
JOIN tickets target_ticket ON target_ticket.project_id = p.id
    AND target_ticket.ticket_number = p.key_prefix || '-' || (split_part(source_ticket.ticket_number, '-', 2)::integer + 1)
JOIN users u ON u.username = 'jane.smith'
WHERE p.key_prefix IN ('TKT', 'ABC', 'ATL', 'NMB', 'HAW', 'OSD', 'PCR', 'QIC', 'SDR', 'ZKB')
  AND split_part(source_ticket.ticket_number, '-', 2)::integer IN (4, 9, 14, 19, 24, 29, 34)
  AND NOT EXISTS (
      SELECT 1
      FROM ticket_relations tr
      WHERE tr.source_id = source_ticket.id
        AND tr.target_id = target_ticket.id
        AND tr.relation_type = 'RELATES_TO'
  );

INSERT INTO ticket_relations (source_id, target_id, relation_type, created_by, created_at)
SELECT blocker.id, blocked.id, 'BLOCKS', u.id, NOW() - INTERVAL '2 days'
FROM projects p
JOIN tickets blocker ON blocker.project_id = p.id AND blocker.ticket_number = p.key_prefix || '-2'
JOIN tickets blocked ON blocked.project_id = p.id AND blocked.ticket_number = p.key_prefix || '-10'
JOIN users u ON u.username = 'admin'
WHERE p.key_prefix IN ('TKT', 'ABC', 'ATL', 'NMB', 'HAW', 'OSD', 'PCR', 'QIC', 'SDR', 'ZKB')
  AND NOT EXISTS (
      SELECT 1
      FROM ticket_relations tr
      WHERE tr.source_id = blocker.id
        AND tr.target_id = blocked.id
        AND tr.relation_type = 'BLOCKS'
  );

-- Saved filters for explorer/report views.
INSERT INTO saved_ticket_filters
    (name, description, filter_config, column_config, shared, default_filter, owner_id, created_at, updated_at)
SELECT
    v.name,
    v.description,
    v.filter_config,
    v.column_config,
    v.shared,
    v.default_filter,
    u.id,
    NOW() - INTERVAL '15 days',
    NOW()
FROM (VALUES
    (
        'Heavy Demo Critical Open Work',
        'Critical and high priority tickets that are not finished.',
        '{"priorities":["CRITICAL","HIGH"],"statuses":["TODO","DEV_IN_PROGRESS","IN_PROGRESS","IN_REVIEW","TESTING"],"deleted":false}',
        'ticket_number,title,project,priority,status,assignee,due_date',
        TRUE,
        FALSE,
        'jane.smith'
    ),
    (
        'Heavy Demo QA Queue',
        'Tickets waiting for QA validation or UAT evidence.',
        '{"statuses":["TESTING","IN_REVIEW"],"types":["BUG","TEST","IMPROVEMENT"],"deleted":false}',
        'ticket_number,title,project,type,status,assignee,updated_at',
        TRUE,
        FALSE,
        'bob.tester'
    ),
    (
        'Heavy Demo Release Done',
        'Done and closed tickets for release summaries.',
        '{"statuses":["DONE","CLOSED"],"deleted":false}',
        'ticket_number,title,project,priority,resolved_at,resolution_note',
        FALSE,
        FALSE,
        'admin'
    )
) AS v(name, description, filter_config, column_config, shared, default_filter, owner_username)
JOIN users u ON u.username = v.owner_username
WHERE NOT EXISTS (
    SELECT 1
    FROM saved_ticket_filters f
    WHERE f.owner_id = u.id
      AND f.name = v.name
);

-- Align identity sequences after any explicit or pre-existing rows.
DO $$
DECLARE
    item record;
    seq_name text;
BEGIN
    FOR item IN SELECT * FROM (VALUES
        ('attachments', 'id'),
        ('boards', 'id'),
        ('comments', 'id'),
        ('labels', 'id'),
        ('notifications', 'id'),
        ('project_categories', 'id'),
        ('projects', 'id'),
        ('roles', 'id'),
        ('saved_ticket_filters', 'id'),
        ('sprints', 'id'),
        ('teams', 'id'),
        ('ticket_commits', 'id'),
        ('ticket_history', 'id'),
        ('ticket_priority_configs', 'id'),
        ('ticket_relations', 'id'),
        ('ticket_scripts', 'id'),
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
