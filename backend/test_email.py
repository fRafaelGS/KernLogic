import os
import django

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.core.mail import EmailMultiAlternatives
from django.conf import settings
from anymail.message import AnymailMessage

def test_anymail_config():
    """
    Test email configuration with django-anymail
    """
    print(f"Testing django-anymail with backend: {settings.EMAIL_BACKEND}")
    
    # Create an email message with Anymail features
    msg = AnymailMessage(
        subject='KernLogic Email Test with Anymail',
        body='This is a test message to confirm Anymail configuration is working correctly.',
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[settings.DEFAULT_FROM_EMAIL],  # Sending to yourself for testing
    )
    
    # Add Anymail-specific features (supported by your ESP)
    msg.tags = ["test", "anymail"]
    msg.track_opens = True
    msg.track_clicks = True
    msg.metadata = {
        "test_id": "anymail_test_1",
        "application": "KernLogic PIM"
    }
    
    print(f"Attempting to send email from {msg.from_email} to {msg.to}")
    print(f"With tags: {msg.tags}")
    print(f"With metadata: {msg.metadata}")
    print(f"Tracking opens: {msg.track_opens}")
    print(f"Tracking clicks: {msg.track_clicks}")
    
    try:
        # Send the message
        result = msg.send()
        print(f"Email sent successfully!")
        print(f"ESP response: {result.status}")
        print(f"Message ID: {result.message_id}")
        print(f"All response data: {result.esp_response}")
        return True
    except Exception as e:
        print(f"Failed to send email: {e}")
        return False

def test_html_email():
    """
    Test sending HTML email with inline attachments via Anymail
    """
    # Create a multipart message
    msg = EmailMultiAlternatives(
        subject="KernLogic HTML Email Test",
        body="This is the plain text content of the message.",
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[settings.DEFAULT_FROM_EMAIL],
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
        </style>
    </head>
    <body>
        <h1>Hello from KernLogic!</h1>
        <p>This is a test email sent using <strong>django-anymail</strong>.</p>
        <p>Anymail supports ESP-specific features like tracking and tags.</p>
        <a href="https://example.com/test-click" class="button">Test Button</a>
    </body>
    </html>
    """
    msg.attach_alternative(html_content, "text/html")
    
    # Add Anymail features
    msg.tags = ["html-test"]
    msg.track_opens = True
    msg.track_clicks = True
    
    try:
        # Send the message
        result = msg.send()
        print(f"HTML email sent successfully!")
        print(f"Message ID: {result.message_id if hasattr(result, 'message_id') else 'N/A'}")
        return True
    except Exception as e:
        print(f"Failed to send HTML email: {e}")
        return False

if __name__ == "__main__":
    print("Testing Anymail configuration...")
    test_anymail_config()
    
    print("\nTesting HTML email...")
    test_html_email() 