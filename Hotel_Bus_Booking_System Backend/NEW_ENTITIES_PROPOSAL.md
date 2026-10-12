# Proposed New Entities for AI Booking Assistant

## 1. BookingDraft
Represents a draft booking that stores user selections without actually reserving resources.

```java
package com.spring.boot.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.SQLDelete;
import org.hibernate.annotations.Where;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "booking_drafts")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@SQLDelete(sql = "UPDATE booking_drafts SET deleted = true WHERE id = ?")
@Where(clause = "deleted = false")
public class BookingDraft extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // User reference (from JWT, not stored in draft for security)
    private Long userId;

    // Hotel selection
    private Long hotelId;
    private String hotelName;

    // Room selection
    private Long roomId;
    private String roomNumber;
    private Integer roomCapacity;
    private BigDecimal roomPricePerNight;

    // Dates and guests
    private LocalDate checkIn;
    private LocalDate checkOut;
    private Integer guests;

    // Optional bus selections
    private Long outgoingTripId;
    private Long returnTripId;
    private Long outgoingSeatId;
    private Long returnSeatId;

    // Pricing
    private BigDecimal totalPrice;

    // Draft status
    @Enumerated(EnumType.STRING)
    private DraftStatus status;

    // Expiry time (drafts expire after 24 hours)
    private LocalDateTime expiresAt;

    // Soft delete flag
    private boolean deleted = false;
}

enum DraftStatus {
    CREATED,
    EXPIRED,
    CONFIRMED,
    CANCELLED
}
```

## 2. AiConversation (Optional - for conversation history)
Stores conversation history between user and AI assistant.

```java
package com.spring.boot.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.SQLDelete;
import org.hibernate.annotations.Where;

import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "ai_conversations")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@SQLDelete(sql = "UPDATE ai_conversations SET deleted = true WHERE id = ?")
@Where(clause = "deleted = false")
public class AiConversation extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // User reference (from JWT)
    private Long userId;

    // Conversation title (first user message summarized)
    private String title;

    // Soft delete flag
    private boolean deleted = false;
    
    // One-to-many relationship with AiMessage
    // @OneToMany(mappedBy = "conversation", cascade = CascadeType.ALL, orphanRemoval = true)
    // private List<AiMessage> messages;
}
```

## 3. AiMessage (Optional - for conversation history)
Individual messages in a conversation.

```java
package com.spring.boot.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.SQLDelete;
import org.hibernate.annotations.Where;

import java.time.LocalDateTime;

@Entity
@Table(name = "ai_messages")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@SQLDelete(sql = "UPDATE ai_messages SET deleted = true WHERE id = ?")
@Where(clause = "deleted = false")
public class AiMessage extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Foreign key to conversation
    private Long conversationId;

    // Message content
    private String content;

    // Message type: USER or ASSISTANT
    @Enumerated(EnumType.STRING)
    private MessageType type;

    // Timestamp
    private LocalDateTime timestamp;

    // Soft delete flag
    private boolean deleted = false;
}

enum MessageType {
    USER,
    ASSISTANT
}
```

## BaseEntity (if not already present)
If the project doesn't have a BaseEntity class, it should be created:

```java
package com.spring.boot.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.MappedSuperclass;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;

import java.time.LocalDateTime;

@MappedSuperclass
@Getter
public abstract class BaseEntity {

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
```

**Note:** The AiConversation and AiMessage entities are optional. If implemented, they should include proper relationships and pagination limits to prevent excessive storage growth.