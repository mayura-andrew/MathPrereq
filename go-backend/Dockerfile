FROM golang:alpine AS builder

WORKDIR /app

# Install dependencies
RUN apk add --no-cache git ca-certificates

# Copy go mod files
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build the application - fix the build path
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o main ./cmd/server/main.go

# Final stage
FROM alpine:latest

RUN apk --no-cache add ca-certificates curl
WORKDIR /root/

# Create non-root user first (before switching to /app directory)
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Create app directory and set ownership
RUN mkdir -p /app/data && chown -R appuser:appgroup /app

# Copy the binary
COPY --from=builder /app/main /app/
# Remove this problematic line:
# COPY --from=builder /app/config ./config
# Copy data files (only if they exist and are needed at runtime)
COPY --from=builder /app/data /app/data

# Switch to app directory and user
WORKDIR /app
USER appuser

EXPOSE 8000

CMD ["./main"]