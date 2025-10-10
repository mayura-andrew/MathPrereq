# Email Notifications for New Concept Detection

## Overview

The system now supports automatic email notifications to administrators when new mathematical concepts are identified and staged for review. This feature uses Go concurrency to ensure email sending doesn't block the main query processing pipeline.

## Features

### Asynchronous Email Sending
- **Non-blocking**: Emails are sent in background goroutines, ensuring query processing is not delayed
- **Timeout Protection**: Email sending has a 30-second timeout to prevent hanging operations
- **Retry Logic**: Automatic retry with exponential backoff (3 attempts)
- **Graceful Degradation**: If mailer is disabled or unavailable, the system continues to function normally

### Concurrency Implementation

The email notification system uses several Go concurrency patterns:

1. **Goroutine for Detection**: New concept detection runs in a background goroutine
   ```go
   go s.detectAndStageNewConcepts(context.Background(), conceptNames, query)
   ```

2. **Nested Goroutine for Email**: Email sending runs in a nested goroutine within the detection process
   ```go
   go s.sendNewConceptNotification(staged, query)
   ```

3. **Channel-based Timeout**: Uses channels to implement timeout mechanism
   ```go
   done := make(chan error, 1)
   go func() {
       err := s.mailer.Send(...)
       done <- err
   }()
   
   select {
   case err := <-done:
       // Handle success/error
   case <-ctx.Done():
       // Handle timeout
   }
   ```

## Configuration

### Environment Variables

Add the following environment variables to configure email notifications:

```bash
# Mailer Configuration
MAILER_HOST=smtp.gmail.com          # SMTP server host
MAILER_PORT=587                      # SMTP server port (587 for TLS)
MAILER_USERNAME=your_email@gmail.com # SMTP username
MAILER_PASSWORD=your_app_password    # SMTP password (use app-specific password)
MAILER_SENDER=noreply@mathprereq.com # Sender email address
MAILER_ADMIN_MAIL=admin@mathprereq.com # Admin email to receive notifications
MAILER_ENABLED=true                  # Enable/disable email notifications
```

### Gmail Configuration

For Gmail, you need to:

1. Enable 2-factor authentication on your Google account
2. Generate an App Password:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Create a new app password for "Mail"
   - Use this password in `MAILER_PASSWORD`

### Other SMTP Providers

The system supports any SMTP server. Common configurations:

**Outlook/Office365:**
```bash
MAILER_HOST=smtp.office365.com
MAILER_PORT=587
```

**SendGrid:**
```bash
MAILER_HOST=smtp.sendgrid.net
MAILER_PORT=587
MAILER_USERNAME=apikey
MAILER_PASSWORD=your_sendgrid_api_key
```

**Mailgun:**
```bash
MAILER_HOST=smtp.mailgun.org
MAILER_PORT=587
```

## Email Template

The email uses a template located at:
```
internal/mailer/templates/new_concept_identified.tmpl
```

### Template Data

The template receives the following data:

```go
{
    "ConceptName":         "Linear Algebra",
    "Description":         "Study of linear equations...",
    "SuggestedDifficulty": 7,
    "SuggestedCategory":   "Algebra",
    "SuggestedPrereqs":    ["Calculus", "Set Theory"],
    "Reasoning":           "This is a foundational topic...",
    "QueryID":             "query-uuid-123",
    "QueryContext":        "What is linear algebra?",
    "UserID":              "user-uuid-456",
    "DetectedAt":          "2025-10-10 14:30:00 UTC"
}
```

### Customizing Templates

You can modify the template to customize:
- Subject line (in `{{define "subject"}}` block)
- Plain text body (in `{{define "plainBody"}}` block)
- HTML body (in `{{define "htmlBody"}}` block)

## Architecture

### Component Integration

```
QueryService
    ├── detectAndStageNewConcepts (goroutine)
    │   └── sendNewConceptNotification (goroutine)
    │       └── Mailer.Send (with timeout)
    │
    └── Other processing (continues independently)
```

### Flow Diagram

```
User Query
    │
    ├─→ Identify Concepts (LLM)
    │
    ├─→ Find Prerequisites (Neo4j)
    │
    ├─→ Vector Search (Weaviate)
    │
    ├─→ Generate Explanation (LLM)
    │
    └─→ Background: Detect New Concepts (goroutine)
            │
            ├─→ Check if concept exists
            │
            ├─→ Analyze with LLM
            │
            ├─→ Save to staging collection
            │
            └─→ Send Email Notification (goroutine)
                    │
                    ├─→ Prepare template data
                    │
                    ├─→ Send email (with retry)
                    │
                    └─→ Log result
```

## Code Examples

### Service Initialization

```go
mailer := mailer.New(
    config.Mailer.Host,
    config.Mailer.Port,
    config.Mailer.Username,
    config.Mailer.Password,
    config.Mailer.Sender,
    config.Mailer.Enabled,
)

queryService := services.NewQueryService(
    conceptRepo,
    queryRepo,
    vectorRepo,
    stagedConceptRepo,
    llmClient,
    resourceScraper,
    mailer,              // Email service
    config.Mailer.AdminMail, // Admin email
    logger,
)
```

### Email Sending with Concurrency

```go
// Called when new concept is detected
func (s *queryService) sendNewConceptNotification(staged *entities.StagedConcept, query *entities.Query) {
    // Check if mailer is enabled
    if s.mailer == nil || !s.mailer.IsEnabled() {
        return
    }

    // Prepare email data
    emailData := map[string]interface{}{
        "ConceptName": staged.ConceptName,
        // ... other fields
    }

    // Create timeout context
    ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
    defer cancel()

    // Send in goroutine with channel
    done := make(chan error, 1)
    go func() {
        err := s.mailer.Send(s.adminEmail, templatePath, emailData)
        done <- err
    }()

    // Wait for completion or timeout
    select {
    case err := <-done:
        if err != nil {
            s.logger.Error("Email failed", zap.Error(err))
        } else {
            s.logger.Info("Email sent successfully")
        }
    case <-ctx.Done():
        s.logger.Error("Email timed out")
    }
}
```

## Benefits of Concurrent Implementation

1. **Non-blocking**: Query responses are returned immediately, email is sent in background
2. **Resilient**: Email failures don't affect query processing
3. **Scalable**: Can handle multiple concurrent email notifications
4. **Timeout Protection**: Prevents hanging operations
5. **Resource Efficient**: Uses goroutines (lightweight threads)

## Testing

### Enable Email Notifications

```bash
export MAILER_ENABLED=true
export MAILER_HOST=smtp.gmail.com
export MAILER_PORT=587
export MAILER_USERNAME=your_email@gmail.com
export MAILER_PASSWORD=your_app_password
export MAILER_ADMIN_MAIL=admin@example.com
```

### Trigger a Notification

Submit a query with a new concept:

```bash
curl -X POST http://localhost:8080/api/query \
  -H "Content-Type: application/json" \
  -d '{
    "question": "Explain quantum entanglement in mathematics",
    "user_id": "test-user"
  }'
```

Check logs for email notification:
```
INFO: Sending email notification for new concept
INFO: New concept notification email sent successfully
```

### Disable Email Notifications

```bash
export MAILER_ENABLED=false
```

System will continue to detect and stage concepts, but won't send emails.

## Monitoring

### Log Messages

**Success:**
```
INFO: New concept staged for review
INFO: Sending email notification for new concept
INFO: New concept notification email sent successfully
```

**Warnings:**
```
WARN: Admin email not configured, cannot send notification
DEBUG: Mailer not configured or disabled, skipping email notification
```

**Errors:**
```
ERROR: Failed to send new concept notification email
ERROR: Email notification timed out
```

## Security Considerations

1. **Environment Variables**: Never commit credentials to version control
2. **App Passwords**: Use app-specific passwords, not account passwords
3. **TLS**: Use port 587 or 465 for encrypted connections
4. **Rate Limiting**: Email sending has built-in retry limits to prevent abuse
5. **Timeouts**: 30-second timeout prevents resource exhaustion

## Performance Impact

- **Query Latency**: Zero impact (emails sent asynchronously)
- **Memory**: Minimal (goroutines are lightweight ~2KB each)
- **CPU**: Negligible (email sending is I/O bound)
- **Network**: One SMTP connection per new concept detected

## Troubleshooting

### Emails Not Sending

1. Check `MAILER_ENABLED=true`
2. Verify SMTP credentials
3. Check firewall/network allows outbound SMTP
4. Review application logs for errors
5. Test SMTP settings with a simple mail client

### Gmail "Less Secure App" Error

- Enable 2-factor authentication
- Generate and use App Password
- Don't use regular account password

### Timeout Errors

- Check network connectivity
- Verify SMTP server is responding
- Consider increasing timeout in code (default 30s)

## Future Enhancements

- [ ] Batch notifications (daily digest)
- [ ] Email templates for different events
- [ ] Support for multiple admin recipients
- [ ] Email delivery status tracking
- [ ] HTML email styling improvements
- [ ] Email queuing system for high volume
