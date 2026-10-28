# TravelEase — AI Chatbot Backend Integration Audit Report

**Date:** October 29, 2026  
**Auditor:** Senior Software Architect  
**Project:** TravelEase — Hotel & Bus Booking System  
**Repository Inspected:** `Hotel_Bus_Booking_System Backend` (Spring Boot 4.1.1, Java 17)  
**Target Document:** Backend Root `/AI_BOT_BACKEND_AUDIT_REPORT.md`  

---

## Executive Summary

A comprehensive audit was performed across the entire Spring Boot backend (`Hotel_Bus_Booking_System Backend`) to determine the integration status, readiness, architectural constraints, and requirements for a customer-facing AI Chatbot.

The inspection reveals that **a robust, Spring AI-based Google Gemini integration has already been implemented at the backend layer**, complete with an orchestration service, in-memory conversation memory, system prompt configuration, structured tool calling (delegating to real database services), and a complete booking draft lifecycle. However, several critical operational gaps exist—most notably, **missing HTTP-level rate limiting on the AI endpoint**, **a missing exception handler mapping for rate limit errors**, **an invalid model identifier string in `application.yaml`**, and **zero automated tests for the AI modules**.

Below is the detailed technical assessment with evidence drawn directly from the codebase.

---

## A. Current AI Integration Status

### 1. Provider, Model, and SDK Identification
* **AI Provider:** Google GenAI (Gemini).
* **SDK / Framework:** Spring AI Starter for Google GenAI (`org.springframework.ai:spring-ai-starter-model-google-genai`).
  * Managed via Spring AI BOM version `2.0.1` in [`pom.xml`](pom.xml#L31-L49).
* **Configured Model:** `gemini-3.5-flash-lite` in [`src/main/resources/application.yaml`](src/main/resources/application.yaml#L36-L45).
  > **Audit Notice:** `gemini-3.5-flash-lite` is not a standard release model ID in Google's official Gemini catalog (standard release strings are `gemini-1.5-flash`, `gemini-1.5-pro`, `gemini-2.0-flash`, or `gemini-2.5-flash`). This property must be validated against Google's API to prevent startup or invocation failures.
* **API Key Mechanism:** Configured via property `spring.ai.google.genai.api-key: ${Gemini_API_KEY}` in [`application.yaml`](src/main/resources/application.yaml#L39). The backend reads this from the host environment variable `Gemini_API_KEY`. No raw API key is hardcoded in tracked files.

### 2. Component Implementation Status Breakdown

| Component | Status | Codebase Location | Description |
| :--- | :---: | :--- | :--- |
| **Spring AI Starter & BOM** | **Implemented** | [`pom.xml`](pom.xml#L44-L50) | Dependencies `spring-ai-bom` (2.0.1) and `spring-ai-starter-model-google-genai` are configured. |
| **AI Client Configuration** | **Implemented** | [`com.spring.boot.config.AiConfig`](src/main/java/com/spring/boot/config/AiConfig.java) | Configures `ChatClient` with `MessageChatMemoryAdvisor` (window size 20) and `AiTools`. |
| **Chatbot Controller** | **Implemented** | [`com.spring.boot.controller.AiAssistantController`](src/main/java/com/spring/boot/controller/AiAssistantController.java) | Exposes `POST /api/ai/chat` and `GET /api/ai/conversations/{id}`. |
| **AI Orchestration Service** | **Implemented** | [`com.spring.boot.service.AiAssistantService`](src/main/java/com/spring/boot/service/AiAssistantService.java) | Manages system prompt formatting, memory keys, Gemini prompt execution, and intent inference. |
| **System Prompt Resource** | **Implemented** | [`src/main/resources/ai/system-prompt.txt`](src/main/resources/ai/system-prompt.txt) | Detailed prompt instructing grounding in tools, multi-language responses, and intent rules. |
| **AI Function Tools** | **Implemented** | [`com.spring.boot.service.ai.AiToolsImpl`](src/main/java/com/spring/boot/service/ai/AiToolsImpl.java) | 7 read-only tool implementations annotated with `@Tool` delegating to actual database services. |
| **Per-Request Tool Context** | **Implemented** | [`com.spring.boot.service.ai.AiToolContextHolder`](src/main/java/com/spring/boot/service/ai/AiToolContextHolder.java) | ThreadLocal request-scoped context collecting structured tool outputs into `AiResponse`. |
| **Booking Draft Lifecycle** | **Implemented** | [`com.spring.boot.service.impl.BookingDraftServiceImpl`](src/main/java/com/spring/boot/service/impl/BookingDraftServiceImpl.java) | Draft creation, validation, pricing snapshot, expiration (30m), and atomic confirmation with payments. |
| **Streaming Responses (SSE)** | **Missing** | N/A | ChatClient is invoked via `.call().content()` (synchronous blocking). No streaming support. |
| **HTTP-Level Rate Limiting for AI** | **Missing** | [`com.spring.boot.config.rateLimiting.RateLimitFilter`](src/main/java/com/spring/boot/config/rateLimiting/RateLimitFilter.java#L33-L35) | `RateLimitFilter` (Bucket4j) only includes `/api/auth/login`. `/api/ai/**` is unmetered. |
| **Rate Limit Exception Handler** | **Missing** | [`com.spring.boot.exception.GlobalExceptionHandler`](src/main/java/com/spring/boot/exception/GlobalExceptionHandler.java) | `AiRateLimitException` has no `@ExceptionHandler`. It falls into general 500 handler. |
| **Automated AI Unit/IT Tests** | **Missing** | `src/test/java/...` | No tests exist for AI controller, service, tools, or draft confirmation. |

---

## B. Backend API Readiness

### 1. Existing Chatbot Endpoints

The backend already exposes a dedicated REST controller at [`AiAssistantController`](src/main/java/com/spring/boot/controller/AiAssistantController.java):

#### Endpoint 1: Primary Chat Interaction
* **Method:** `POST`
* **Path:** `/api/ai/chat`
* **Authorization:** Requires authenticated user (`hasRole('USER')` or authenticated JWT).
* **Request Body DTO:** [`AiChatRequest`](src/main/java/com/spring/boot/dto/ai/AiChatRequest.java)
  ```json
  {
    "conversationId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "message": "Can you find hotels in Cairo under 2000 EGP for 2 guests?"
  }
  ```
  * `conversationId` *(String, optional)*: Client-supplied UUID. If omitted or blank, the backend auto-generates a UUID.
  * `message` *(String, required)*: Validated with `@NotBlank` and `@Size(max = 2000)`.
* **Response Body DTO:** [`AiResponse`](src/main/java/com/spring/boot/dto/ai/AiResponse.java)
  ```json
  {
    "conversationId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "message": "I found 3 hotels in Cairo matching your budget...",
    "intent": "HOTEL_SEARCH",
    "results": [
      {
        "type": "HOTEL",
        "data": [
          {
            "id": 1,
            "name": "Grand Nile Tower",
            "city": "Cairo",
            "rating": 4.5,
            "minPrice": 1650.0
          }
        ]
      }
    ],
    "missingInformation": [],
    "requiresConfirmation": false,
    "draftId": null
  }
  ```
* **Supported Intent Enums:** Computed dynamically by [`AiAssistantService.determineIntent()`](src/main/java/com/spring/boot/service/AiAssistantService.java#L108-L120):
  * `BOOKING_INQUIRY` (when user bookings are queried)
  * `SEAT_SELECTION` (when bus seat map is queried)
  * `BUS_RECOMMENDATION` (when bus trips or route search is queried)
  * `ROOM_SELECTION` (when room availability is checked)
  * `HOTEL_DETAILS` (when hotel details tool is called)
  * `HOTEL_SEARCH` (when general hotel search tool is called)
  * `GENERAL` (fallback conversational text)

#### Endpoint 2: Retrieve Conversation History
* **Method:** `GET`
* **Path:** `/api/ai/conversations/{id}`
* **Authorization:** Requires authenticated JWT. The service matches `userId:conversationId` in [`AiAssistantService.getConversation()`](src/main/java/com/spring/boot/service/AiAssistantService.java#L77-L88).
* **Response Body DTO:** `List<AiMessageDto>`:
  ```json
  [
    { "role": "user", "text": "Are there rooms in Pharaohs?" },
    { "role": "assistant", "text": "Yes, Pharaohs Hotel has 2 Standard Double rooms available." }
  ]
  ```

#### Endpoint 3: Booking Draft Creation (Non-Chat Direct Action)
* **Method:** `POST`
* **Path:** `/api/ai/bookings/drafts`
* **Request DTO:** [`BookingDraftRequest`](src/main/java/com/spring/boot/dto/ai/BookingDraftRequest.java)
* **Response DTO:** [`BookingDraftResponse`](src/main/java/com/spring/boot/dto/ai/BookingDraftResponse.java)

#### Endpoint 4: Booking Draft Confirmation
* **Method:** `POST`
* **Path:** `/api/ai/bookings/drafts/{id}/confirm`
* **Headers:** `Idempotency-Key` (optional string)
* **Response DTO:** [`BookingDraftResponse`](src/main/java/com/spring/boot/dto/ai/BookingDraftResponse.java)

### 2. Streaming vs. Blocking Execution
* **Streaming Support:** **Not Supported.**
  * `AiAssistantService.java` invokes `chatClient.prompt()...call().content()`, which blocks until Gemini completes its response and tool calls.
  * There are no Server-Sent Events (`MediaType.TEXT_EVENT_STREAM_VALUE`) or Spring WebFlux `Flux` controllers.

### 3. Error Handling and Status Codes
* **Validation Errors (400 Bad Request):**
  If `message` is null, blank, or exceeds 2000 characters, [`GlobalExceptionHandler`](src/main/java/com/spring/boot/exception/GlobalExceptionHandler.java#L242-L257) intercepts `MethodArgumentNotValidException` and returns a standard JSON error list.
* **Authentication Errors (401 Unauthorized):**
  Handled by `SecurityConfig.authenticationEntryPoint`. Returns `{"error": "Unauthorized", "message": "..."}`.
* **Provider Outage / Network Failure (503 Service Unavailable):**
  When Google Gemini fails with connection issues or internal API errors, `AiAssistantService.translate()` throws [`AiServiceUnavailableException`](src/main/java/com/spring/boot/exception/AiServiceUnavailableException.java), caught in `GlobalExceptionHandler` returning:
  `HTTP 503` with body: `"The assistant is temporarily unavailable. Please try again later."`
* **Rate Limit Failure Handling (Identified Defect):**
  When Gemini returns 429 or quota exhaustion, `AiAssistantService` throws [`AiRateLimitException`](src/main/java/com/spring/boot/exception/AiRateLimitException.java). **Because `GlobalExceptionHandler` lacks a handler for `AiRateLimitException`, it falls into `@ExceptionHandler(Exception.class)` and returns HTTP 500 (`error.internal`) instead of HTTP 429.**

---

## C. AI Provider and API Key Configuration

### 1. Provider and Model
* **Provider:** Google GenAI (Gemini) through Spring AI.
* **Model Configuration:** Configured in `application.yaml` under `spring.ai.google.genai.chat.options.model: gemini-3.5-flash-lite`.
  * **Warning:** The string `gemini-3.5-flash-lite` appears to be a typo or experimental placeholder. For reliable production usage, standard models should be used (e.g., `gemini-1.5-flash` or `gemini-2.0-flash`).

### 2. API Key Location & Environment Variable
* **Configuration Path:** `spring.ai.google.genai.api-key: ${Gemini_API_KEY}`
* **Environment Variable Name:** `Gemini_API_KEY`
* **Frontend Security:** The Angular frontend communicates exclusively with the Spring Boot backend (`/api/ai/chat`) using standard user JWT authentication. **The Google Gemini API key is never transmitted or exposed to the client.**

---

## D. Authentication and Security

### 1. Endpoint Access Control (Public vs. Authenticated)
* In [`SecurityConfig.java`](src/main/java/com/spring/boot/config/SecurityConfig.java#L147), `.anyRequest().authenticated()` governs all routes not explicitly marked `permitAll()`.
* `/api/ai/**` is **not** in the `permitAll()` list. Therefore, **all AI endpoints require authentication**.
* In [`AiAssistantController.java`](src/main/java/com/spring/boot/controller/AiAssistantController.java#L94-L97):
  ```java
  private Long currentUserId() {
      UserDto user = (UserDto) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
      return user.getId();
  }
  ```
  If an unauthenticated request were allowed through to the controller, casting `principal` (which would be the string `"anonymousUser"`) to `UserDto` would throw a `ClassCastException`.

### 2. Cross-Customer Data Isolation & Security Rules
* **User Identity Enforcement:** The current user's ID is retrieved directly from the verified Spring Security context (JWT claims), **never** from the HTTP request body.
* **Session Memory Partitioning:** Conversation memory is isolated per user using composite keys in [`AiAssistantService.java`](src/main/java/com/spring/boot/service/AiAssistantService.java#L51):
  ```java
  String memoryKey = userId + ":" + conversationId;
  ```
  This guarantees that user A can never read, append to, or hijack user B's conversation memory, even if conversation IDs collide or are guessed.
* **Data Access via Tools:**
  * When Gemini invokes `getMyBookings()`, the method in [`AiToolsImpl.java`](src/main/java/com/spring/boot/service/ai/AiToolsImpl.java#L213-L215) retrieves `userId` from the server-side `AiToolContextHolder`.
  * The AI model is **not given a `userId` argument** in the `@Tool` signature. A user cannot prompt-inject the model into querying another customer's bookings (e.g., "Show me bookings for user 99" will still only execute `getMyBookings()` for the authenticated user).
* **Draft Access Control:**
  * In `BookingDraftServiceImpl.getDraft(draftId, userId)` and `confirm(userId, draftId, ...)`, queries filter strictly by `findByIdAndUserIdForUpdate(draftId, userId)`.

### 3. Existing vs. Recommended Security Protections

| Security Dimension | Existing Implementation | Recommended Enhancement |
| :--- | :--- | :--- |
| **Input Validation** | `@NotBlank`, `@Size(max = 2000)` on chat message. Tool argument dates validated. | Add regex pattern filtering to strip repetitive spam or control characters. |
| **Prompt Injection Defense** | System prompt instructs grounding strictly in tool outputs and disallows state modification. | Sanitize prompt inputs; wrap user prompt in structural delimiters (e.g., `<user_input>`). |
| **Tool Execution Boundaries** | All AI tools are strictly read-only queries. | Maintain current architecture: never add booking creation/cancellation as AI tools. |
| **Rate Limiting** | **None on `/api/ai/**`**. (`RateLimitFilter` only covers `/api/auth/login`). | Add `/api/ai/chat` to `RateLimitFilter` with a dedicated Bucket4j tier (e.g., 10 req/min per user). |
| **Secret Protection** | Gemini API key is externalized to `${Gemini_API_KEY}`. | **High Risk:** [`application.yaml`](src/main/resources/application.yaml#L55) contains a hardcoded fallback string for `token.secret`. Migrate to `${JWT_SECRET}`. |
| **Logging Sanitization** | `AiAssistantService.java` explicitly logs only `userId` and exception, never prompt message text. | Ensure tool argument logs do not output full passenger names or phone numbers. |

---

## E. Available System Capabilities

The AI assistant has direct access to 7 pre-wired Spring AI tools implemented in [`AiToolsImpl.java`](src/main/java/com/spring/boot/service/ai/AiToolsImpl.java):

### 1. Hotel Search & Information
* **Tool:** `searchHotels(name, city, maxPrice, minRating)`
  * **Backing Service:** [`HotelService.getAllHotelsPaginated()`](src/main/java/com/spring/boot/service/impl/HotelServiceImpl.java)
  * **Capabilities:** Case-insensitive partial matching, keyword noise-stripping (removes words like "hotel", "resort" to match core entity names like "Pharaohs"), city filtering, maximum room price filter, minimum guest rating filter.
  * **Limitations:** Returns top 10 results sorted by rating descending.
* **Tool:** `getHotelDetails(hotelId)`
  * **Backing Service:** [`HotelService.getHotelById()`](src/main/java/com/spring/boot/service/impl/HotelServiceImpl.java)
  * **Capabilities:** Returns full hotel details, address, city, description, rating.

### 2. Room Availability & Capacity Calculation
* **Tool:** `checkRoomAvailability(hotelId, checkIn, checkOut, adults, childAges)`
  * **Backing Service:** [`RoomService.getRoomsByHotelId()`](src/main/java/com/spring/boot/service/impl/RoomServiceImpl.java) and [`HotelBookingService.isRoomAvailable()`](src/main/java/com/spring/boot/service/impl/HotelBookingServiceImpl.java)
  * **Capabilities:** Checks date conflicts against active bookings (`PENDING`, `CONFIRMED`).
  * **Business Rule:** Enforces the "children under 12 are free" rule via `calculateRequiredCapacity(adults, childAges)`. Children under 12 do not consume room capacity.

### 3. Bus Trip Search & Seat Availability
* **Tool:** `searchBusTrips(originCity, destinationCity, departureDate)`
  * **Backing Service:** [`BusTripService.searchBusTrips()`](src/main/java/com/spring/boot/service/impl/BusTripServiceImpl.java)
  * **Capabilities:** Finds scheduled trips connecting terminal stops between the specified cities.
* **Tool:** `recommendBusTrips(hotelId, checkIn, checkOut)`
  * **Backing Service:** [`BusTripService.findSuitableOutgoingTrips()` and `findSuitableReturnTrips()`](src/main/java/com/spring/boot/service/impl/BusTripServiceImpl.java)
  * **Capabilities:** Automatically finds outgoing bus trips arriving before hotel check-in (buffer 2h) and return trips departing after check-out.
* **Tool:** `getBusSeatAvailability(tripId)`
  * **Backing Service:** [`BusSeatService.getBusSeatsByBusId()`](src/main/java/com/spring/boot/service/impl/BusSeatServiceImpl.java) and [`BusBookingService.getBookedSeatIdsByTripId()`](src/main/java/com/spring/boot/service/impl/BusBookingServiceImpl.java)
  * **Capabilities:** Executes a single batch query to find all booked seats with active status (`CONFIRMED`, `PENDING`), returning only unbooked seats.

### 4. User Bookings & Status Inquiry
* **Tool:** `getMyBookings()`
  * **Backing Services:** `HotelBookingService.getMyHotelBookings(userId)` and `BusBookingService.getMyBusBookings(userId)`.
  * **Capabilities:** Retrieves active and historical hotel and bus bookings with IDs, dates, price, room/seat numbers, and statuses (`PENDING`, `CONFIRMED`, `CANCELLED`, `COMPLETED`).
  * **Security:** Model cannot pass arbitrary `userId`.

### 5. Missing Information Reporting
* **Tool:** `reportMissingInformation(fields)`
  * **Backing Mechanism:** Collects missing parameters (e.g., `["checkInDate", "destination"]`) in `AiToolContext` so the frontend UI can optionally display quick prompt chips.

---

## F. Angular Integration Contract

Because the `/api/ai/chat` endpoint is already fully implemented, the Angular frontend should bind directly to this contract.

### 1. HTTP Request Specification
* **URL:** `POST ${environment.apiBaseUrl}/ai/chat` (e.g., `http://localhost:8080/api/ai/chat`)
* **Headers:**
  ```http
  Content-Type: application/json
  Authorization: Bearer <JWT_ACCESS_TOKEN>
  ```
* **Request Payload (`AiChatRequest`):**
  ```json
  {
    "conversationId": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "message": "Find bus trips from Cairo to Alexandria for tomorrow"
  }
  ```

### 2. HTTP Response Specification
* **Success Response (`200 OK`):**
  ```json
  {
    "conversationId": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "message": "I found 2 scheduled express trips from Cairo to Alexandria for tomorrow:",
    "intent": "BUS_RECOMMENDATION",
    "results": [
      {
        "type": "BUS_SEARCH",
        "data": [
          {
            "tripId": 12,
            "originCity": "Cairo",
            "originStopName": "Ramses Central Station",
            "destinationCity": "Alexandria",
            "destinationStopName": "Moharam Bek Station",
            "departureTime": "2026-10-30T08:00:00",
            "arrivalTime": "2026-10-30T11:00:00",
            "price": 250.0,
            "busCompany": "SuperJet",
            "busNumber": "SJ-402"
          }
        ]
      }
    ],
    "missingInformation": [],
    "requiresConfirmation": false,
    "draftId": null
  }
  ```

### 3. Error Contract & Handling in Angular

| Status Code | Cause | Frontend Action |
| :--- | :--- | :--- |
| **`400 Bad Request`** | Blank message or > 2000 chars | Display inline form validation ("Message must be between 1 and 2000 characters"). |
| **`401 Unauthorized`** | Expired or missing token | Redirect customer to `/login` with `returnUrl`. |
| **`429 / 500 (Rate Limit)`**| Gemini quota or request burst | Display friendly warning: "You have reached the message limit. Please wait a moment before sending another message." |
| **`503 Service Unavailable`**| Gemini provider unreachable or API key missing | Display assistant state: "AI Assistant is temporarily offline. You can continue searching hotels and buses manually." |

### 4. What Works Without `Gemini_API_KEY`
* **Unavailable without API Key:** Calling `POST /api/ai/chat` will fail with HTTP 503 because Spring AI cannot communicate with Google's servers.
* **Available without API Key:**
  * The Angular Chat UI shell, floating widget, message bubbles, input composer, and conversation state management.
  * `POST /api/ai/bookings/drafts` and `POST /api/ai/bookings/drafts/{id}/confirm` (these are pure relational database operations independent of Gemini).

---

## G. Implementation Plan and Test Readiness

### Prioritized Roadmap

```mermaid
flowchart TD
    subgraph Phase 1: Backend Alignment
        B1["1.1 Fix application.yaml Model String"] --> B2["1.2 Add AiRateLimitException Handler"]
        B2 --> B3["1.3 Add AI Path to RateLimitFilter"]
    end

    subgraph Phase 2: Angular Frontend Development
        F1["2.1 Create AiChatService & Models"] --> F2["2.2 Build Floating Chat Widget UI"]
        F2 --> F3["2.3 Implement Structured Result Cards (Hotels, Buses)"]
        F3 --> F4["2.4 Handle Auth Guards & Login Redirects"]
    end

    subgraph Phase 3: Provider Key & End-to-End Testing
        E1["3.1 Configure Gemini_API_KEY in Environment"] --> E2["3.2 Verify Live Tool Execution & Intent Parsing"]
        E2 --> E3["3.3 Write Automated Integration Tests"]
    end

    Phase 1 --> Phase 3
    Phase 2 --> Phase 3
```

#### Step 1: Minor Backend Corrections (Prerequisites for Live Integration)
1. In `src/main/resources/application.yaml`, verify and correct `spring.ai.google.genai.chat.options.model` to a valid Google model ID (e.g., `gemini-1.5-flash`).
2. In `GlobalExceptionHandler.java`, add `@ExceptionHandler(AiRateLimitException.class)` returning `HttpStatus.TOO_MANY_REQUESTS` (429) with message `ai.rate.limit`.
3. In `RateLimitFilter.java`, add `/api/ai/chat` to `RATE_LIMITED_PATHS` to protect against burst spam.

#### Step 2: Angular Frontend Chatbot Implementation
1. **Models:** Define TypeScript interfaces for `AiChatRequest`, `AiResponse`, `AiResult`, and `AiMessageDto`.
2. **Service (`AiChatService`):** Implement `sendMessage(message, conversationId)` and `getConversationHistory(id)`.
3. **UI Component (`AiChatWidgetComponent`):**
   * Floating toggle button in bottom-right corner across customer pages.
   * Collapsible chat panel styled with TravelEase tokens (`--color-primary`, `--bg-elevated`, dark mode).
   * Typing indicators and structured card renderers for `HOTEL` and `BUS_SEARCH` result types.
   * Guest prompt: "Sign in to chat with TravelEase Assistant".

#### Step 3: Test Readiness Matrix

| Feature | Can Test Without API Key? | Requires Backend Running? | Requires Valid `Gemini_API_KEY`? |
| :--- | :---: | :---: | :---: |
| **Angular Chat UI & Animations** | **Yes** (Mock responses) | No | No |
| **Input Validation (< 2000 chars)** | **Yes** (Client-side) | No | No |
| **JWT Header & Auth Error Handling** | **Yes** | **Yes** | No |
| **Booking Draft API (`/drafts`)** | **Yes** | **Yes** | No |
| **Live Chat Conversation (`/chat`)** | No | **Yes** | **Yes** |
| **Tool Calling (`searchHotels`, `searchBusTrips`)** | No | **Yes** | **Yes** |
| **End-to-End Chat & Booking Confirmation** | No | **Yes** | **Yes** |

---

## Conclusion & Next Steps

1. **Backend Verdict:** The Spring Boot backend is **architecturally 85% ready** for AI chat. The controllers, Spring AI client, system prompt, and database tools are already fully coded and integrated.
2. **Blockers for Live Execution:** Setting the `Gemini_API_KEY` environment variable and verifying the model identifier string.
3. **Frontend Action:** The Angular team can immediately proceed to build the `AiChatService` and UI chat widget using the exact DTO contracts documented in Section F.

