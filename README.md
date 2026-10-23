# Hotel & Bus Booking System

A full-stack booking application that brings hotel accommodation and bus
transportation into one workflow. The project combines an Angular
frontend, a Spring Boot REST API, PostgreSQL persistence, Docker-based
development support, and a Gemini-powered AI booking assistant.

> **Project status:** Unified booking/checkout, supported AI-agent
> actions, double-booking prevention, and the payment lifecycle have
> been reported as implemented. Smart Trip Planner and integration
> testing/monitoring are partially implemented. Reviews & Ratings and
> email/booking notifications are not implemented yet.

## Table of Contents

-   [Overview](#overview)
-   [Features](#features)
-   [Technology Stack](#technology-stack)
-   [Architecture](#architecture)
-   [Getting Started](#getting-started)
-   [Configuration](#configuration)
-   [API Documentation](#api-documentation)
-   [AI Booking Assistant](#ai-booking-assistant)
-   [Testing](#testing)
-   [Current Status](#current-status)
-   [Security Notes](#security-notes)
-   [Future Improvements](#future-improvements)
-   [Contributing](#contributing)
-   [License](#license)

## Overview

Planning a trip often means searching for accommodation and
transportation separately. This project aims to bring hotel bookings and
bus bookings into one application, helping users explore options, manage
reservations, and complete the supported booking and payment flow.

The primary frontend is **Angular**, backed by a **Spring Boot REST
API** and **PostgreSQL**. Supabase can be used as the hosted PostgreSQL
option. A Gemini-powered AI assistant is integrated with backend
capabilities to help users find options and perform supported
booking-related actions.

A separate React/Vite frontend may be used for personal experimentation
or testing, but it is **not the primary frontend** of this project.

## Features

### Hotel Booking

-   Browse and search hotels.
-   Explore hotel rooms and availability.
-   View hotel details and accommodation options.
-   Create and manage hotel bookings through the implemented workflow.

### Bus Booking

-   Browse available bus trips.
-   Explore seat availability and select seats where supported.
-   Create and manage bus bookings.

### Unified Booking and Checkout

-   Unified hotel and bus booking/checkout flow.
-   Implemented payment lifecycle.
-   Double-booking prevention for protected booking operations.

### AI Booking Assistant

-   Conversational assistant powered by Google Gemini.
-   Uses backend-provided tools to access application data and perform
    supported actions.
-   AI actions must follow the application's authentication,
    authorization, validation, and booking rules.

### Administration

-   Administrative capabilities for supported system operations,
    protected by the existing authentication and authorization
    configuration.

The exact screens and available operations depend on the current branch.
Features that are partially implemented or planned are identified in the
status table below.

## Technology Stack

  Area                                 Technology
  ------------------------------------ -------------------------------
  Primary frontend                     Angular, TypeScript
  Backend                              Java, Spring Boot
  API                                  REST
  Database                             PostgreSQL
  Hosted database option               Supabase PostgreSQL
  AI integration                       Google Gemini API
  Local development / infrastructure   Docker
  API documentation                    Swagger / OpenAPI, if enabled

## Architecture

``` mermaid
flowchart TD
    U[Customer or Administrator] --> FE[Angular Frontend]
    FE --> API[Spring Boot REST API]
    API --> DB[(PostgreSQL / Supabase)]
    API --> AI[Gemini API]
    AI --> API
    API --> FE
```

This is a high-level logical diagram, not a claim that each component is
deployed as a separate service.

## Getting Started

### Prerequisites

Install the versions required by the repository configuration:

-   Git
-   A compatible JDK
-   Maven or the Maven Wrapper, if included
-   Node.js and npm compatible with the Angular workspace
-   PostgreSQL or access to a configured Supabase PostgreSQL database
-   Docker and Docker Compose, if using the repository's container setup
-   A Google Gemini API key for AI functionality

Check the backend build file and Angular `package.json` for exact
version requirements.

### 1. Clone the repository

``` bash
git clone https://github.com/john1909m/Hotel-Bus-Booking-System.git
cd Hotel-Bus-Booking-System
```

### 2. Configure the backend

Locate the backend application configuration and configure the
PostgreSQL connection and required application secrets. Configure the
Gemini API key if you intend to use the AI assistant.

Use the actual property names present in the project. Do not commit
database credentials, API keys, JWT secrets, or other private values.

### 3. Run the backend

Run the command from the directory containing the Maven Wrapper.

**Linux / macOS**

``` bash
./mvnw spring-boot:run
```

**Windows**

``` powershell
.\mvnw.cmd spring-boot:run
```

If the Maven Wrapper is not included, use the Maven command supported by
the project:

``` bash
mvn spring-boot:run
```

Spring Boot commonly uses port `8080` by default, but verify the
configured port in the application.

### 4. Run the Angular frontend

Open a second terminal in the directory containing the Angular
`package.json` and `angular.json` files:

``` bash
npm install
npx ng serve
```

Open the local URL printed by Angular CLI, commonly
`http://localhost:4200`. Configure the frontend API base URL using the
environment/configuration mechanism already present in the Angular
project.

### 5. Run with Docker

If the repository contains a `compose.yaml` or `docker-compose.yml`,
review its services and required environment variables, then use the
provided configuration:

``` bash
docker compose up --build
```

This command applies only when a Compose configuration exists and is
complete. Follow the repository's Docker configuration for service
names, ports, profiles, and environment variables. Do not assume
PostgreSQL is included in Compose; the project may use Supabase.

## Configuration

Identify the actual property names in the backend configuration, Angular
environment files, and Docker files. Common configuration categories
include:

  -----------------------------------------------------------------------
  Configuration                       Purpose
  ----------------------------------- -----------------------------------
  PostgreSQL JDBC URL                 Connect to PostgreSQL or Supabase

  Database username/password          Authenticate the database
                                      connection, if required

  Gemini API key                      Enable Gemini-powered AI features

  Frontend API base URL               Point Angular requests to the
                                      backend

  Authentication/JWT secrets          Configure authentication securely,
                                      if required
  -----------------------------------------------------------------------

Use an example environment file if the repository provides one. Keep
real secrets out of Git.

## API Documentation

The backend exposes REST endpoints for the features implemented in the
application. If Swagger/OpenAPI is enabled, check the backend
configuration or application logs for the exact URL.

Common Springdoc defaults include `/swagger-ui/index.html` and
`/v3/api-docs`, but these paths must be verified against the current
configuration.

## AI Booking Assistant

The application integrates Google's Gemini API with backend-provided
capabilities. The assistant should use application services and tools to
retrieve data and perform only actions supported by the backend. It must
not bypass normal validation, availability checks, authentication, or
authorization.

To test the AI locally:

1.  Configure a valid Gemini API key using the project's existing
    configuration.
2.  Start the backend and confirm the database connection works.
3.  Test the assistant against real application data.
4.  Verify that any action changing booking or payment state follows the
    same backend rules as regular API requests.

Verify the model identifier, tool list, and supported actions in the
source code and configuration.

## Testing

Integration testing and monitoring are still in progress. Use the test
commands supported by the repository.

For a Maven-based backend:

``` bash
./mvnw test
```

On Windows:

``` powershell
.\mvnw.cmd test
```

For Angular, inspect `package.json` for the configured test script. A
common command is:

``` bash
npm test
```

These commands may need adjustment based on the repository's build
configuration. Do not claim tests pass unless they have actually been
run successfully.

## Current Status

Based on the latest development progress reported by the project
maintainer:

  -----------------------------------------------------------------------
  Feature                             Status
  ----------------------------------- -----------------------------------
  Unified Booking / Checkout          Implemented and working

  AI agent executing supported        Implemented and working; continued
  operations                          testing is appropriate

  Double-booking prevention           Implemented and working

  Payment lifecycle                   Implemented and working

  Smart Trip Planner                  Partially implemented

  Integration tests and monitoring    Partially implemented

  Reviews & Ratings                   Not implemented

  Email / booking notifications       Not implemented
  -----------------------------------------------------------------------

Update this table as implementation changes.

## Security Notes

-   Never commit API keys, database passwords, JWT secrets, or other
    credentials.
-   Enforce authentication and authorization on the backend.
-   Validate user input and booking availability on the server.
-   Protect booking and payment operations against unauthorized access
    and duplicate processing.
-   Treat AI-generated requests as untrusted input and validate actions
    through normal backend rules.
-   Use HTTPS and secure deployment configuration outside local
    development.

These are security considerations, not a claim that the application has
undergone an independent security audit.

## Future Improvements

-   Complete and verify the Smart Trip Planner.
-   Expand integration tests for booking, availability, payments, and AI
    actions.
-   Implement Reviews & Ratings.
-   Implement reliable email and booking notifications.
-   Improve monitoring, error visibility, and operational diagnostics.

## Contributing

1.  Fork the repository.
2.  Create a branch for your change.
3.  Keep changes focused and follow the existing code style.
4.  Run relevant tests.
5.  Open a pull request describing the change and its verification.

## License

The repository's license has not been verified while preparing this
README. Check for an existing `LICENSE` file before distributing or
reusing the project. If no license exists, the maintainers should choose
and add one explicitly.
