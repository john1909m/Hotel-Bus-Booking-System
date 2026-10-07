# Summary of Changes for Docker Setup

## Files Created
1. `Dockerfile` - Multi-stage Docker build for Spring Boot application
2. `.dockerignore` - Docker ignore file to exclude unnecessary files
3. `docker-compose.yml` - Docker Compose configuration for the backend service
4. `.env.example` - Example environment variables file

## Files Modified
1. `.gitignore` - Added `.env` to ignore list
2. `src/main/resources/application.yaml` - Replaced hardcoded database credentials with environment variable placeholders
3. `HELP.md` - Added "Run with Docker" section

## Configuration Details

### Build Tool & Java Version
- Build tool: Maven (with Maven Wrapper)
- Java version: 17

### Docker Configuration
- Multi-stage build:
  - Build stage: `maven:3.9-eclipse-temurin-17`
  - Runtime stage: `eclipse-temurin:17-jre-alpine`
- Runs as non-root user (spring user with UID 1001)
- Exposes port 8080

### Environment Variables
The following environment variables are expected in `.env`:
- `SPRING_DATASOURCE_URL` - JDBC URL for Supabase PostgreSQL
- `SPRING_DATASOURCE_USERNAME` - Username for Supabase PostgreSQL
- `SPRING_DATASOURCE_PASSWORD` - Password for Supabase PostgreSQL

### CORS Configuration
CORS is already configured in `SecurityConfig.java` to allow:
- http://localhost:5173
- http://localhost:8080
- https://www.storely-eg.com
- https://storely-eg.com
- http://localhost:5173/*

Note: http://localhost:3000 is not currently in the allowed origins list.

## How to Run
1. Install Docker Desktop
2. Copy `.env.example` to `.env` and fill in your Supabase credentials
3. Run `docker compose up --build`
4. Access the API at http://localhost:8080

## Verification
Run `docker compose build` to verify the Docker image builds successfully.