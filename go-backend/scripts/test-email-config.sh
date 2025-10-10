#!/bin/bash

# Test Email Configuration
# This script tests the email notification feature

echo "==================================================="
echo "Email Notification Configuration Test"
echo "==================================================="
echo ""

# Check if mailer is enabled
if [ -z "$MAILER_ENABLED" ]; then
    echo "❌ MAILER_ENABLED is not set"
    echo "   Set it with: export MAILER_ENABLED=true"
else
    echo "✓ MAILER_ENABLED: $MAILER_ENABLED"
fi

# Check mailer host
if [ -z "$MAILER_HOST" ]; then
    echo "❌ MAILER_HOST is not set"
    echo "   Example: export MAILER_HOST=smtp.gmail.com"
else
    echo "✓ MAILER_HOST: $MAILER_HOST"
fi

# Check mailer port
if [ -z "$MAILER_PORT" ]; then
    echo "❌ MAILER_PORT is not set"
    echo "   Example: export MAILER_PORT=587"
else
    echo "✓ MAILER_PORT: $MAILER_PORT"
fi

# Check mailer username
if [ -z "$MAILER_USERNAME" ]; then
    echo "❌ MAILER_USERNAME is not set"
    echo "   Example: export MAILER_USERNAME=your_email@gmail.com"
else
    echo "✓ MAILER_USERNAME: $MAILER_USERNAME"
fi

# Check mailer password (don't display it)
if [ -z "$MAILER_PASSWORD" ]; then
    echo "❌ MAILER_PASSWORD is not set"
    echo "   Example: export MAILER_PASSWORD=your_app_password"
else
    echo "✓ MAILER_PASSWORD: [HIDDEN]"
fi

# Check mailer sender
if [ -z "$MAILER_SENDER" ]; then
    echo "❌ MAILER_SENDER is not set"
    echo "   Example: export MAILER_SENDER=noreply@mathprereq.com"
else
    echo "✓ MAILER_SENDER: $MAILER_SENDER"
fi

# Check admin email
if [ -z "$MAILER_ADMIN_MAIL" ]; then
    echo "❌ MAILER_ADMIN_MAIL is not set"
    echo "   Example: export MAILER_ADMIN_MAIL=admin@mathprereq.com"
else
    echo "✓ MAILER_ADMIN_MAIL: $MAILER_ADMIN_MAIL"
fi

echo ""
echo "==================================================="

# Check if template file exists
TEMPLATE_FILE="./internal/mailer/templates/new_concept_identified.tmpl"
if [ -f "$TEMPLATE_FILE" ]; then
    echo "✓ Email template found: $TEMPLATE_FILE"
else
    echo "❌ Email template not found: $TEMPLATE_FILE"
fi

echo ""
echo "==================================================="
echo "Configuration Summary"
echo "==================================================="

# Count configured items
CONFIGURED=0
TOTAL=7

[ ! -z "$MAILER_ENABLED" ] && ((CONFIGURED++))
[ ! -z "$MAILER_HOST" ] && ((CONFIGURED++))
[ ! -z "$MAILER_PORT" ] && ((CONFIGURED++))
[ ! -z "$MAILER_USERNAME" ] && ((CONFIGURED++))
[ ! -z "$MAILER_PASSWORD" ] && ((CONFIGURED++))
[ ! -z "$MAILER_SENDER" ] && ((CONFIGURED++))
[ ! -z "$MAILER_ADMIN_MAIL" ] && ((CONFIGURED++))

echo "Configured: $CONFIGURED/$TOTAL"

if [ $CONFIGURED -eq $TOTAL ]; then
    echo ""
    echo "✅ All email configuration variables are set!"
    echo ""
    if [ "$MAILER_ENABLED" = "true" ]; then
        echo "📧 Email notifications are ENABLED"
        echo ""
        echo "Test by submitting a query with a new concept:"
        echo ""
        echo "curl -X POST http://localhost:8080/api/query \\"
        echo "  -H 'Content-Type: application/json' \\"
        echo "  -d '{"
        echo "    \"question\": \"What is topological data analysis?\","
        echo "    \"user_id\": \"test-user\""
        echo "  }'"
        echo ""
    else
        echo "📭 Email notifications are DISABLED"
        echo "   Set MAILER_ENABLED=true to enable"
    fi
else
    echo ""
    echo "⚠️  Email configuration is incomplete"
    echo "   Set missing variables to enable email notifications"
    echo ""
    echo "Quick setup (Gmail example):"
    echo ""
    echo "export MAILER_ENABLED=true"
    echo "export MAILER_HOST=smtp.gmail.com"
    echo "export MAILER_PORT=587"
    echo "export MAILER_USERNAME=your_email@gmail.com"
    echo "export MAILER_PASSWORD=your_app_password"
    echo "export MAILER_SENDER=noreply@mathprereq.com"
    echo "export MAILER_ADMIN_MAIL=admin@mathprereq.com"
    echo ""
fi

echo "==================================================="
