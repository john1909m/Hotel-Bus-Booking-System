# Multi-stage Dockerfile for Spring Boot application
# Build stage
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app

# Copy the Maven wrapper and pom.xml first for dependency caching
COPY mvnw .
COPY .mvn .mvn
COPY pom.xml .

# Download dependencies (this layer will be cached if pom.xml doesn't change)
RUN chmod +x mvnw
RUN ./mvnw dependency:go-offline -B

# Copy source code
COPY src src

# Package the application (skip tests for faster build)
RUN ./mvnw clean package -DskipTests

# Runtime stage
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app

# Create a non-root user
RUN addgroup -g 1001 -S spring && adduser -S spring -u 1001 -G spring

# Copy the built jar from the build stage
COPY --from=build /app/target/*.jar app.jar

# Change ownership to non-root user
RUN chown spring:spring app.jar

# Expose the application port (default Spring Boot port)
EXPOSE 8080

# Switch to non-root user
USER spring

# Run the application
ENTRYPOINT ["java","-jar","/app/app.jar"]