# IssueHub - Complete Setup Guide

## Prerequisites

Install these before running the project:

- Java JDK 21
- PostgreSQL 14 or newer
- Node.js 20 or newer
- npm

The backend includes the Gradle Wrapper, so a separate Gradle install is usually not required.

## Database Setup

For local development, create a PostgreSQL database named `issuehub`.

```sql
CREATE DATABASE issuehub;
```

The backend reads production database settings from system environment variables. On Render, keep these configured in the service environment:

```env
DB_URL=jdbc:postgresql://...
DB_USERNAME=...
DB_PASSWORD=...
JWT_SECRET=...
```

When those variables are not set locally, the backend automatically uses:

```properties
spring.datasource.url=jdbc:postgresql://localhost:5432/issuehub
spring.datasource.username=postgres
spring.datasource.password=Admin@123
```

If your local database name, user, or password is different, set `DB_URL`, `DB_USERNAME`, and `DB_PASSWORD` on your machine instead of editing `application.properties`.

## Backend Setup

From the project root:

```cmd
cd backend
.\gradlew.bat bootRun
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

```cmd
.\gradlew.bat compileJava
.\gradlew.bat build -x test
.\gradlew.bat bootRun
```

## Frontend Setup

From the project root:

```cmd
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

## Default Login Credentials

The backend creates seed users on startup through `DataInitializer`.

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@ticketportal.com` | `Admin@123` |
| Developer | `john.doe@ticketportal.com` | `Admin@123` |
| Manager | `jane.smith@ticketportal.com` | `Admin@123` |
| Tester | `bob.tester@ticketportal.com` | `Admin@123` |

## Troubleshooting

### Backend will not start

- Ensure PostgreSQL is running.
- Confirm the `issuehub` database exists.
- Check `DB_URL`, `DB_USERNAME`, and `DB_PASSWORD` if you override the local defaults.
- Verify Java 21 with `java -version`.

### Frontend cannot reach the API

- Make sure the backend is running on `http://localhost:8080/api`.
- Confirm `VITE_API_BASE_URL` in `frontend/.env` if you created it.
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
