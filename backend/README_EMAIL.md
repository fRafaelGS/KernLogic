# Email Testing with MailHog

This project uses MailHog for email testing in development. MailHog is a local SMTP server that captures all outgoing emails without actually sending them, allowing you to view and test emails in a web interface.

## Setup Instructions

### 1. Install MailHog

#### macOS (using Homebrew)
```bash
brew install mailhog
```

#### Linux
```bash
# Download the binary
wget https://github.com/mailhog/MailHog/releases/download/v1.0.1/MailHog_linux_amd64

# Make it executable
chmod +x MailHog_linux_amd64

# Move it to a directory in your PATH
sudo mv MailHog_linux_amd64 /usr/local/bin/mailhog
```

#### Windows
```bash
# Download the Windows binary from:
# https://github.com/mailhog/MailHog/releases/download/v1.0.1/MailHog_windows_amd64.exe
# And place it in a convenient location
```

### 2. Run MailHog

Once installed, start MailHog with:

```bash
mailhog
```

This starts the SMTP server on port 1025 and the web interface on port 8025.

### 3. View the Web Interface

Open your browser and go to:
```
http://localhost:8025
```

This web interface will show all emails sent by your Django application.

## Django Configuration

The project is already configured to use MailHog in development. Here are the relevant settings in `settings.py`:

```python
# Email configuration - MailHog for development
EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
EMAIL_HOST = "localhost"
EMAIL_PORT = 1025
EMAIL_USE_TLS = False
EMAIL_HOST_USER = ""
EMAIL_HOST_PASSWORD = ""
```

## Testing Email Functionality

You can test the email functionality using the provided script:

```bash
cd backend
python test_mailhog.py
```

This script sends both plain text and HTML emails to MailHog, which you can view in the web interface.

## Features

- **Capture All Emails**: MailHog captures all emails sent from your application
- **Web Interface**: View emails, HTML content, headers, and attachments
- **Search and Filter**: Find specific emails in the web interface
- **API Access**: MailHog provides an API for programmatic access
- **No Configuration**: Works with standard SMTP settings
- **Release Emails**: Optionally allow emails to be released to real recipients

## Production Environments

For production environments, you should use a real email service like:
- Amazon SES
- Mailgun
- SendGrid
- Mailjet

Simply update the email settings in your production configuration accordingly.

## Troubleshooting

1. **Connection refused**: Make sure MailHog is running
2. **Can't see emails**: Verify your Django settings are pointing to localhost:1025
3. **MailHog crashes**: Check for port conflicts, particularly on port 1025 or 8025 