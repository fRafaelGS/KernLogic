import os
import django

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.core.mail import send_mail, EmailMultiAlternatives
from django.conf import settings

def test_mailhog_email():
    """
    Test sending an email through MailHog
    """
    print("Testing email with MailHog...")
    print(f"Email settings: HOST={settings.EMAIL_HOST}, PORT={settings.EMAIL_PORT}")
    
    # Basic email
    subject = 'KernLogic MailHog Test'
    message = 'This is a test message sent via MailHog SMTP server.'
    from_email = settings.DEFAULT_FROM_EMAIL
    recipient_list = ['test@example.com', 'admin@example.com']
    
    print(f"Sending email from {from_email} to {recipient_list}")
    
    try:
        result = send_mail(
            subject=subject,
            message=message,
            from_email=from_email,
            recipient_list=recipient_list,
            fail_silently=False,
        )
        print(f"Email sent successfully to MailHog! Result code: {result}")
        print(f"Check MailHog web interface at: http://localhost:8025")
        return True
    except Exception as e:
        print(f"Failed to send email: {e}")
        return False

def test_html_email():
    """
    Test sending an HTML email through MailHog
    """
    print("\nTesting HTML email with MailHog...")
    
    # Create a multipart message
    msg = EmailMultiAlternatives(
        subject="KernLogic HTML MailHog Test",
        body="This is the plain text content of the message.",
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=['team@example.com'],
        cc=['manager@example.com'],
    )
    
    # Add HTML content
    html_content = """
    <html>
    <head>
        <style>
            body { font-family: Arial, sans-serif; color: #333; }
            .button { background-color: #4CAF50; border: none; color: white; 
                     padding: 15px 32px; text-align: center; text-decoration: none; 
                     display: inline-block; font-size: 16px; margin: 4px 2px; cursor: pointer; }
            .container { padding: 20px; border: 1px solid #ddd; border-radius: 5px; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>Hello from KernLogic!</h1>
            <p>This is a test HTML email sent through <strong>MailHog</strong>.</p>
            <p>MailHog provides a nice web interface to view all captured emails during development.</p>
            <p>
                <a href="http://localhost:8025" class="button">View MailHog Dashboard</a>
                <a href="https://example.com/test-click" class="button">Test Button</a>
            </p>
        </div>
    </body>
    </html>
    """
    msg.attach_alternative(html_content, "text/html")
    
    # Add an attachment
    # msg.attach("test.txt", "This is a test attachment content", "text/plain")
    
    try:
        # Send the message
        result = msg.send()
        print(f"HTML email sent successfully to MailHog! Result code: {result}")
        print(f"Check MailHog web interface at: http://localhost:8025")
        return True
    except Exception as e:
        print(f"Failed to send HTML email: {e}")
        return False

if __name__ == "__main__":
    print("="*50)
    print("MAILHOG EMAIL TEST")
    print("="*50)
    print("\nMake sure MailHog is running before running this test!")
    print("If not installed, run: brew install mailhog")
    print("Then start it with: mailhog\n")
    
    test_mailhog_email()
    test_html_email()
    
    print("\n" + "="*50)
    print("NEXT STEPS")
    print("="*50)
    print("1. Open MailHog web interface: http://localhost:8025")
    print("2. Check that your test emails appear in the interface")
    print("3. You can view HTML content, headers, and other details")
    print("4. MailHog captures ALL emails from your application")
    print("   without actually sending them to recipients")
    print("="*50) 