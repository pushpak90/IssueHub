# IssueHub

IssueHub is a full-stack ticket and project management portal for software teams. It includes JWT-based authentication, role-based access, project and team management, ticket workflows, kanban boards, sprints, comments, attachments, time logs, notifications, reporting, and admin settings.

## Tech Stack

### Backend

- Java 21
- Spring Boot 3.2.3
- Spring Security with JWT authentication
- Spring Data JPA / Hibernate
- PostgreSQL
- Gradle Wrapper
- Lombok
- ModelMapper
- Springdoc OpenAPI / Swagger UI

### Frontend

- React 18
- Vite 5
- Redux Toolkit
- React Router
- TanStack React Query
- Axios
- Tailwind CSS
- React Hook Form and Zod
- Recharts
- dnd-kit
- Radix UI
- Lucide React

## Features

- User login, registration, JWT refresh, and logout
- Role support for admin, manager, developer, and tester users
- Dashboard statistics
- Project creation, updates, archiving, categories, labels, and member management
- Ticket creation, filtering, bulk updates, exports, history, attachments, relations, commits, scripts, comments, and time logs
- Kanban board views with drag-and-drop ticket workflow
- Sprint planning, active sprint board, backlog, start, and complete flows
- Team management
- Notifications and unread count tracking
- Admin settings, custom roles, database patch management, and system overview
- Image/file uploads
- Swagger API documentation

## Prerequisites

Install these before running the project:

- Java JDK 21
- PostgreSQL 14 or newer
- Node.js 20 or newer
- npm

The backend includes the Gradle Wrapper, so a separate Gradle install is usually not required.

## Database Setup

Create the local PostgreSQL database:

```sql
CREATE DATABASE issuehub;
```

The backend reads production values from system environment variables. Render should keep these variables configured there:

```properties
DB_URL=jdbc:postgresql://...
DB_USERNAME=...
DB_PASSWORD=...
JWT_SECRET=...
```

For local development, if those variables are not set, the backend falls back to:

```properties
spring.datasource.url=jdbc:postgresql://localhost:5432/issuehub
spring.datasource.username=postgres
spring.datasource.password=Admin@123
```

If your local PostgreSQL database name or user is different, set `DB_URL`, `DB_USERNAME`, and `DB_PASSWORD` on your machine instead of editing `application.properties`.

## Backend Setup

From the project root:

```bash
cd backend
./gradlew bootRun
```

On Windows PowerShell or CMD:

```cmd
cd backend
gradlew.bat bootRun
```

The backend runs at:

```text
http://localhost:8080/api
```

Swagger UI is available at:

```text
http://localhost:8080/api/swagger-ui.html
```

Useful backend commands:

```bash
./gradlew build
./gradlew test
./gradlew bootRun
```

## Frontend Setup

From the project root:

```bash
cd frontend
npm install
npm run dev
```

The frontend runs at:

```text
http://localhost:5173
```

The frontend API base URL defaults to:

```text
http://localhost:8080/api
```

To override it, create `frontend/.env`:

```env
VITE_API_BASE_URL=http://localhost:8080/api
```

Useful frontend commands:

```bash
npm run dev
npm run build
npm run preview
npm run lint
```

## Default Accounts

The backend creates seed users on startup through `DataInitializer`.

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@ticketportal.com` | `Admin@123` |
| Developer | `john.doe@ticketportal.com` | `Admin@123` |
| Manager | `jane.smith@ticketportal.com` | `Admin@123` |
| Tester | `bob.tester@ticketportal.com` | `Admin@123` |

It also seeds a sample project named `Ticket Portal Development`, labels, and sample tickets.

## Application Routes

Public routes:

- `/login`
- `/register`
- `/forgot-password`

Protected routes:

- `/dashboard`
- `/projects`
- `/projects/:id`
- `/tickets`
- `/tickets/:id`
- `/boards`
- `/boards/:id`
- `/users`
- `/teams`
- `/reports`
- `/settings`
- `/admin-settings`

Authenticated users can also open the command palette with `Ctrl+K` or `Cmd+K`.

## Main API Areas

All backend endpoints are served under `/api`.

| Area | Base Endpoint |
| --- | --- |
| Authentication | `/auth` |
| Dashboard | `/dashboard` |
| Projects | `/projects` |
| Project categories | `/categories` |
| Tickets | `/tickets` |
| Comments | `/tickets/{ticketId}/comments` |
| Attachments and images | `/files` |
| Ticket commits | `/tickets/{ticketId}/commits` |
| Ticket relations | `/tickets/{ticketId}/relations` |
| Ticket scripts | `/tickets/{ticketId}/scripts` |
| Time logs | `/tickets/{ticketId}/timelogs` |
| Sprints | `/sprints` |
| Boards | `/boards` |
| Teams | `/teams` |
| Users | `/users` |
| Notifications | `/notifications` |
| Admin settings | `/admin` |
| Database patches | `/admin/db-patches` |

## Project Structure

```text
IssueHub/
+-- backend/
|   +-- build.gradle
|   +-- settings.gradle
|   +-- gradlew.bat
|   +-- gradle/wrapper/
|   +-- uploads/
|   +-- src/main/
|       +-- java/com/ticketportal/
|       |   +-- config/
|       |   +-- controller/
|       |   +-- dto/
|       |   +-- entity/
|       |   +-- exception/
|       |   +-- repository/
|       |   +-- security/
|       |   +-- service/
|       |   +-- TicketPortalApplication.java
|       +-- resources/
|           +-- application.properties
|           +-- data.sql
+-- frontend/
|   +-- package.json
|   +-- vite.config.js
|   +-- tailwind.config.js
|   +-- src/
|       +-- components/
|       +-- pages/
|       +-- services/
|       +-- store/
|       +-- utils/
|       +-- App.jsx
|       +-- main.jsx
+-- SETUP.md
+-- README.md
```

## Configuration Notes

- Backend server port: `8080`
- Backend context path: `/api`
- Frontend dev port: `5173`
- Allowed CORS origins include `http://localhost:5173`, `http://localhost:3000`, and `http://127.0.0.1:5173`
- Uploaded files are stored in `backend/uploads`
- Mail settings are present in `application.properties`, but must be configured with real SMTP credentials before email delivery works
- JWT secret and expiration settings are configured in `application.properties`

## Troubleshooting

### Backend cannot connect to PostgreSQL

- Make sure PostgreSQL is running.
- Confirm that the local `issuehub` database exists, or set `DB_URL` to your local database.
- Check `DB_USERNAME` and `DB_PASSWORD`, or use the default `postgres` / `Admin@123` local setup.

### Frontend cannot reach the API

- Make sure the backend is running on `http://localhost:8080/api`.
- Confirm `VITE_API_BASE_URL` in `frontend/.env`.
- Restart the Vite dev server after changing `.env`.

### Swagger URL returns 404

Use the backend context path:

```text
http://localhost:8080/api/swagger-ui.html
```

### Login fails for seeded users

- Make sure the backend started successfully and connected to PostgreSQL.
- Check whether existing database data already contains different users.
- For a fresh local seed, use an empty `issuehub` database and restart the backend.
