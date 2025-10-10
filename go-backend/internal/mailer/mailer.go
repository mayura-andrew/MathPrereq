package mailer

import (
	"bytes"
	"fmt"
	"text/template"
	"time"

	"github.com/go-mail/mail/v2"
)

type Mailer struct {
	dialer  *mail.Dialer
	sender  string
	enabled bool
}

func New(host string, port int, username, password, sender string, enabled bool) *Mailer {
	dialer := mail.NewDialer(host, port, username, password)
	dialer.Timeout = 5 * time.Second

	return &Mailer{
		dialer:  dialer,
		sender:  sender,
		enabled: enabled,
	}
}

func (m *Mailer) Send(recipient, templateFile string, data any) error {
	if !m.enabled {
		// Mailer is disabled, skip sending
		return nil
	}

	if recipient == "" {
		return fmt.Errorf("recipient email is required")
	}

	tmpl, err := template.ParseFiles(templateFile)
	if err != nil {
		return fmt.Errorf("failed to parse template: %w", err)
	}

	subject := new(bytes.Buffer)
	err = tmpl.ExecuteTemplate(subject, "subject", data)
	if err != nil {
		return fmt.Errorf("failed to execute subject template: %w", err)
	}

	plainBody := new(bytes.Buffer)
	err = tmpl.ExecuteTemplate(plainBody, "plainBody", data)
	if err != nil {
		return fmt.Errorf("failed to execute plainBody template: %w", err)
	}

	htmlBody := new(bytes.Buffer)
	err = tmpl.ExecuteTemplate(htmlBody, "htmlBody", data)
	if err != nil {
		return fmt.Errorf("failed to execute htmlBody template: %w", err)
	}

	msg := mail.NewMessage()
	msg.SetHeader("To", recipient)
	msg.SetHeader("From", m.sender)
	msg.SetHeader("Subject", subject.String())
	msg.SetBody("text/plain", plainBody.String())
	msg.AddAlternative("text/html", htmlBody.String())

	// Retry logic with exponential backoff
	for i := 1; i <= 3; i++ {
		err = m.dialer.DialAndSend(msg)
		if err == nil {
			return nil
		}
		if i < 3 {
			time.Sleep(time.Duration(i) * 500 * time.Millisecond)
		}
	}

	return fmt.Errorf("failed to send email after 3 attempts: %w", err)
}

// IsEnabled returns whether the mailer is enabled
func (m *Mailer) IsEnabled() bool {
	return m.enabled
}
