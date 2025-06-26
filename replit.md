# Access Control System

## Overview

This is a full-stack web application built with React and Express.js for managing access control systems. The application provides QR code scanning capabilities, user authentication, and role-based access control for security, authorization, and access control functions.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for development and building
- **Styling**: Tailwind CSS with custom CSS variables
- **UI Components**: Radix UI primitives with shadcn/ui component library
- **State Management**: TanStack Query (React Query) for server state
- **Routing**: Wouter for client-side routing
- **Forms**: React Hook Form with Zod for validation
- **QR Code Scanning**: html5-qrcode library for camera integration

### Backend Architecture
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Authentication**: Passport.js with local strategy and session-based auth
- **Session Storage**: In-memory store with connect-pg-simple for PostgreSQL sessions
- **File Uploads**: Multer for handling Excel file uploads
- **Excel Processing**: xlsx library for reading spreadsheet data

### Database Architecture
- **Database**: PostgreSQL (configured for Neon serverless)
- **ORM**: Drizzle ORM with Neon serverless client
- **Schema Management**: Drizzle Kit for migrations
- **Connection**: WebSocket-based connection pool for serverless environments

## Key Components

### Authentication System
- Session-based authentication with secure password hashing using scrypt
- Role-based access control with three user types:
  - **Security**: QR code scanning and verification
  - **Authorizer**: Upload and manage access codes
  - **Controller**: Download scan logs and reports
- Default users are automatically created on system initialization

### QR Code Scanning
- Camera integration with automatic rear camera detection
- Real-time QR code scanning with visual feedback
- Access validation against stored codes database
- Scan logging with authorization status tracking

### File Management
- Excel file upload for bulk access code import
- Automatic data parsing and validation
- Export functionality for scan logs in Excel format

### Data Models
- **Users**: Authentication and role management
- **Access Codes**: QR codes with associated person names
- **Scan Logs**: Audit trail of all scan attempts with authorization status

## Data Flow

1. **Authentication Flow**: Users log in with credentials → Session created → Role-based routing
2. **Code Upload Flow**: Authorizer uploads Excel → Data parsed → Codes stored in database
3. **Scanning Flow**: Security scans QR code → Code validated → Result logged → Visual feedback provided
4. **Reporting Flow**: Controller downloads logs → Excel file generated → Audit data exported

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL serverless client
- **drizzle-orm**: Type-safe database ORM
- **passport**: Authentication middleware
- **html5-qrcode**: QR code scanning functionality
- **xlsx**: Excel file processing
- **multer**: File upload handling

### UI Dependencies
- **@radix-ui/***: Accessible UI primitives
- **@tanstack/react-query**: Server state management
- **react-hook-form**: Form handling
- **tailwindcss**: Utility-first CSS framework

## Deployment Strategy

### Development Environment
- Uses Replit with Node.js 20, PostgreSQL 16 modules
- Hot reload with Vite development server
- Database URL from environment variables

### Production Build
- Frontend: Vite builds static assets to `dist/public`
- Backend: esbuild bundles server code to `dist/`
- Deployment target: Google Cloud Engine (GCE)
- Port configuration: Internal 5000, External 80

### Environment Configuration
- Database connection via `DATABASE_URL` environment variable
- Session secret from `REPL_ID` for development
- Trust proxy settings for production HTTPS

## Changelog
- June 19, 2025. Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.