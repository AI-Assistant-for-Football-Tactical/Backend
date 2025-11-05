# AI Assistant for Football Tactical Backend

This repository contains the backend server for the **AI Assistant for Football Tactical** graduation project. This is a **NestJS** application that functions as an AI-powered insights tool for football clubs.

The core purpose of this application is to provide **pre-match, in-match, and post-match tactical analysis** to authenticated club staff (coaches, analysts, etc.) by leveraging the public match data from [SofaScore](https://www.sofascore.com/).

## Core Features

- **Club Onboarding & Security:** A multi-step, secure registration flow for clubs, including manual document verification and approval by an admin or a reviewer.
- **Role-Based Access (RBAC):** A 3-tier API structure (Public, Customer, Admin) to ensure secure separation of data.
  - **Customer API:** For club (owners, coaches, analysts, and other roles in the club) to run and view reports.
  - **Admin/Reviewer API:** For system admins to approve/reject clubs, manage users, and monitor the system.
- **AI-Driven Analysis:** The core feature. An authenticated user can select their team and an opponent from SofaScore's public data. The backend then generates a detailed tactical report on how to win the match.
- **Team Organization:** Allows club owners to invite members (e.g., `coach@my-club.com`), create internal teams (e.g., "First Team," "U-21s"), and manage access control.

## 🏛️ Technical Architecture

This backend is built as a single, modular NestJS application with a single **PostgreSQL** database.

- **Database:** Uses PostgreSQL with logical multi-tenancy (data is isolated by `club_id`).
- **Authentication:** Uses JSON Web Tokens (JWT) with standard access and refresh tokens.
- **Security Model:** Enforced by a series of guards:
  1.  `JwtAuthGuard`: Checks for a valid token.
  2.  `StatusGuard`: A "firewall" guard that checks the user's role (`ADMIN` vs. `CUSTOMER`) and the API they are trying to access. It also checks the club's status (e.g., `ACTIVE`, `PENDING_REVIEW`, `INCOMPELETE`) to block access to app features during onboarding.
  3.  `RolesGuard`: A standard RBAC guard to check for specific roles (e.g., `OWNER`, `SYS_ADMIN`, `REVIEWER`, `NORMARL_USER`).
