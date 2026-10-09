# Summary of Changes Made to Support Costumer Entity

## Overview
This document summarizes the changes made to implement the Costumer model that extends User and establish proper relationships with HotelBooking and BusBooking entities.

## Changes Made

### 1. New Files Created
- `src/main/java/com/spring/boot/dto/CostumerDto.java` - DTO for Costumer entity
- `src/main/java/com/spring/boot/mapper/CostumerMapper.java` - MapStruct mapper for Costumer entity/DTO

### 2. Existing Files Modified

#### DTOs
- `src/main/java/com/spring/boot/dto/HotelBookingDto.java` - Updated comment to clarify userId refers to costumer
- `src/main/java/com/spring/boot/dto/BusBookingDto.java` - Updated comment to clarify userId refers to costumer
- `src/main/java/com/spring/boot/dto/HotelBookingRequestDto.java` - Updated comment to clarify userId refers to costumer
- `src/main/java/com/spring/boot/dto/BusBookingRequestDto.java` - Updated comment to clarify userId refers to costumer

#### Repositories
- `src/main/java/com/spring/boot/repository/HotelBookingRepository.java` - Changed `findByUserId` to `findByCostumer_Id`
- `src/main/java/com/spring/boot/repository/BusBookingRepository.java` - Changed `findByUserId` to `findByCostumer_Id`

#### Mappers
- `src/main/java/com/spring/boot/mapper/HotelBookingMapper.java` - Added proper mappings:
  - `@Mapping(target = "userId", source = "costumer.id")` for entity→DTO
  - `@Mapping(target = "costumer.id", source = "userId")` for DTO→entity
- `src/main/java/com/spring/boot/mapper/BusBookingMapper.java` - Added proper mappings:
  - `@Mapping(target = "userId", source = "costumer.id")` for entity→DTO
  - `@Mapping(target = "costumer.id", source = "userId")` for DTO→entity

#### Services
- `src/main/java/com/spring/boot/service/impl/HotelBookingServiceImpl.java` - Updated service method to call `findByCostumer_Id`
- `src/main/java/com/spring/boot/service/impl/BusBookingServiceImpl.java` - Updated service method to call `findByCostumer_Id`

#### Entities
- `src/main/java/com/spring/boot/model/User.java` - Added `@Inheritance(strategy = InheritanceType.JOINED)` to enable proper inheritance
- `src/main/java/com/spring/boot/model/Costumer.java` - 
  - Kept `@Table(name = "costumer")` for the Costumer table
  - Added `mappedBy = "costumer"` to OneToMany relationships for proper bidirectional mapping

### 3. Architecture Decisions

#### Inheritance Strategy
- Used JOINED inheritance strategy where:
  - User table contains common user fields (id, name, email, phoneNumber, password, role, createdAt, updatedAt)
  - Costumer table contains only Costumer-specific fields (the hotelBookings and busBookings relationships) plus a foreign key to User
  - This allows Costumer to inherit all User fields while maintaining proper normalization

#### API Consistency
- Preserved `userId` field in all DTOs and request parameters for backward compatibility with existing API consumers
- Internal mapping properly converts between `userId` in DTOs and `costumer.id` in entities
- Controller endpoints remain unchanged (e.g., `/user/{userId}`) to avoid breaking existing clients

#### Relationship Mapping
- HotelBooking and BusBooking entities maintain `@ManyToOne private Costumer costumer` relationships
- Costumer entity maintains `@OneToMany(mappedBy = "costumer") private List<HotelBooking> hotelBookings` and similar for busBookings
- This establishes proper bidirectional relationships with Costumer as the inverse side

### 4. Benefits of This Approach
1. **Clean Inheritance** - Costumer properly inherits all User attributes and behavior
2. **Normalized Database Schema** - Avoids data duplication through JOINED inheritance
3. **API Backward Compatibility** - Existing clients continue to work without modification
4. **Clear Separation of Concerns** - User handles authentication/common fields, Costumer handles booking-specific relationships
5. **Extensible Design** - Easy to add other user types (e.g., Admin) that extend User in the future