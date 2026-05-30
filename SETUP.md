# Ticket Portal - Complete Setup Guide

## Prerequisites Installation

### 1. Install Java 17 (JDK)
Download from: https://adoptium.net/temurin/releases/?version=17
- Choose Windows x64 JDK `.msi` installer
- Run the installer (it sets JAVA_HOME automatically)
- Verify: open CMD → `java -version`

### 2. Install MySQL 8.x
Download from: https://dev.mysql.com/downloads/installer/
- Choose "MySQL Installer for Windows"
- Install: MySQL Server + MySQL Workbench
- Set root password to: `Admin@123`
- Verify: open MySQL Workbench or CMD → `mysql -u root -p`

### 3. Install Node.js (LTS)
Download from: https://nodejs.org/en/download
- Choose Windows x64 `.msi` LTS version (v20.x or higher)
- Run installer (npm is included)
- Verify: open CMD → `node -v` and `npm -v`

### 4. Install Gradle (for Gradle Wrapper bootstrap)
Download from: https://gradle.org/releases/
- Download gradle-8.5-bin.zip
- Extract to `C:\Gradle\gradle-8.5`
- Add `C:\Gradle\gradle-8.5\bin` to System PATH
- Verify: `gradle -v`

---

## Database Setup

1. Open MySQL Workbench or MySQL CMD client
2. Create the database (Spring will auto-create if it doesn't exist):
```sql
CREATE DATABASE IF NOT EXISTS ticket_portal_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
```

---

## Backend Setup

### Step 1: Generate Gradle Wrapper (one-time only)
```cmd
cd "c:\Users\Pushpak.Fasate2008\Desktop\New folder\Ticket Portal\backend"
gradle wrapper --gradle-version 8.5
```
This creates `gradle-wrapper.jar` inside `gradle/wrapper/`.

### Step 2: Build the project
```cmd
.\gradlew.bat build -x test
```

### Step 3: Run the application
```cmd
.\gradlew.bat bootRun
```

The backend will start at: **http://localhost:8080**

### Swagger API Documentation
Open browser: **http://localhost:8080/swagger-ui.html**

### Default Login Credentials
| Role      | Email                          | Password  |
|-----------|-------------------------------|-----------|
| Admin     | admin@ticketportal.com        | Admin@123 |
| Developer | john.doe@ticketportal.com     | Admin@123 |
| Manager   | jane.smith@ticketportal.com   | Admin@123 |
| Tester    | bob.tester@ticketportal.com   | Admin@123 |

---

## Frontend Setup

### Step 1: Navigate to frontend
```cmd
cd "c:\Users\Pushpak.Fasate2008\Desktop\New folder\Ticket Portal\frontend"
```

### Step 2: Create environment file
```cmd
copy .env.example .env
```
Content of `.env`:
```
VITE_API_BASE_URL=http://localhost:8080/api
```

### Step 3: Install dependencies
```cmd
npm install
```

### Step 4: Start development server
```cmd
npm run dev
```

The frontend will start at: **http://localhost:5173**

### Step 5: Build for production
```cmd
npm run build
```

---

## Project Structure

```
Ticket Portal/
├── backend/                          # Spring Boot backend
│   ├── build.gradle                  # Gradle build config
│   ├── gradlew.bat                   # Gradle wrapper (Windows)
│   ├── gradlew                       # Gradle wrapper (Unix)
│   └── src/main/java/com/ticketportal/
│       ├── TicketPortalApplication.java
│       ├── config/                   # Security, Swagger, ModelMapper configs
│       ├── security/                 # JWT provider, filter, auth entry point
│       ├── entity/                   # JPA entities (User, Project, Ticket...)
│       │   └── enums/               # Status, Priority, Type enums
│       ├── repository/               # Spring Data JPA repositories
│       ├── service/                  # Business logic services
│       ├── controller/               # REST controllers
│       ├── dto/
│       │   ├── request/             # Request DTOs
│       │   └── response/            # Response DTOs
│       └── exception/               # Global exception handler
│
└── frontend/                         # React + Vite frontend
    ├── package.json
    ├── vite.config.js
    ├── tailwind.config.js
    └── src/
        ├── App.jsx                   # Router setup
        ├── main.jsx                  # Entry point
        ├── store/                    # Redux Toolkit store + slices
        ├── services/                 # Axios API services
        ├── components/
        │   ├── layout/              # Sidebar, Topbar, Layout
        │   └── tickets/             # KanbanBoard, TicketList, TicketForm
        ├── pages/                    # Route-level pages
        └── utils/                    # Constants, helpers
```

---

## API Endpoints Summary

### Authentication
| Method | Endpoint             | Description          |
|--------|---------------------|----------------------|
| POST   | /api/auth/login     | Login                |
| POST   | /api/auth/register  | Register             |
| POST   | /api/auth/refresh   | Refresh token        |
| POST   | /api/auth/logout    | Logout               |

### Projects
| Method | Endpoint                          | Description         |
|--------|----------------------------------|---------------------|
| GET    | /api/projects                    | List all projects   |
| POST   | /api/projects                    | Create project      |
| GET    | /api/projects/{id}               | Get project         |
| PUT    | /api/projects/{id}               | Update project      |
| GET    | /api/projects/my                 | My projects         |

### Tickets
| Method | Endpoint                          | Description          |
|--------|----------------------------------|----------------------|
| GET    | /api/tickets/project/{projectId} | Project tickets      |
| POST   | /api/tickets                     | Create ticket        |
| GET    | /api/tickets/{id}                | Get ticket           |
| PUT    | /api/tickets/{id}                | Update ticket        |
| DELETE | /api/tickets/{id}                | Delete ticket        |
| GET    | /api/tickets/{id}/history        | Ticket audit trail   |

### Comments
| Method | Endpoint                               | Description     |
|--------|---------------------------------------|-----------------|
| GET    | /api/tickets/{id}/comments            | List comments   |
| POST   | /api/tickets/{id}/comments            | Add comment     |
| PUT    | /api/tickets/{id}/comments/{cid}      | Edit comment    |
| DELETE | /api/tickets/{id}/comments/{cid}      | Delete comment  |

---

## Recommended VS Code Extensions

1. **Extension Pack for Java** — Java development support
2. **Spring Boot Extension Pack** — Spring Boot tools
3. **Gradle for Java** — Gradle build support
4. **ES7+ React/Redux/React-Native snippets** — React snippets
5. **Tailwind CSS IntelliSense** — Tailwind class autocomplete
6. **Prettier** — Code formatter
7. **GitLens** — Git history visualization
8. **Thunder Client** — REST API client (like Postman)
9. **MySQL** (by cweijan) — Database explorer

---

## Troubleshooting

### Backend won't start
- Ensure MySQL is running: `net start MySQL80`
- Check DB credentials in `application.properties`
- Verify Java 17: `java -version`

### gradle-wrapper.jar missing
```cmd
cd backend
gradle wrapper --gradle-version 8.5
```

### Frontend npm install fails
```cmd
npm cache clean --force
npm install
```

### CORS errors
- Ensure backend is running on port 8080
- Frontend must be on port 5173 (configured in SecurityConfig)

### JWT Secret error
- The secret in `application.properties` must be a Base64-encoded string of at least 256 bits
- Default is already set correctly
