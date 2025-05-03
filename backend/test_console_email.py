import os
import django

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.core.mail import send_mail, EmailMultiAlternatives
from django.conf import settings

def test_console_email():
    """
    Test sending an email through Django's console backend
    """
    print("Testing email with Django's console backend...")
    
    # Basic email
    subject = 'KernLogic Test Email'
    message = 'This is a test message to confirm email configuration is working correctly.'
    from_email = settings.DEFAULT_FROM_EMAIL
    recipient_list = ['test@example.com']
    
    print(f"Sending email from {from_email} to {recipient_list}")
    
    try:
        result = send_mail(
            subject=subject,
            message=message,
            from_email=from_email,
            recipient_list=recipient_list,
            fail_silently=False,
        )
        print(f"Email should appear in the console output below. Result code: {result}")
        return True
    except Exception as e:
        print(f"Failed to send email: {e}")
        return False

def test_html_email():
    """
    Test sending an HTML email through the console backend
    """
    print("\nTesting HTML email...")
    
    # Create a multipart message
    msg = EmailMultiAlternatives(
        subject="KernLogic HTML Test Email",
        body="This is the plain text content of the message.",
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=['team@example.com'],
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
        <p>This is a test HTML email sent using Django's console backend.</p>
        <a href="https://example.com/test-click" class="button">Test Button</a>
    </body>
    </html>
    """
    msg.attach_alternative(html_content, "text/html")
    
    try:
        # Send the message
        result = msg.send()
        print(f"HTML email should appear in the console output. Result code: {result}")
        return True
    except Exception as e:
        print(f"Failed to send HTML email: {e}")
        return False

if __name__ == "__main__":
    test_console_email()
    test_html_email()
    
    print("\n-----------------------------------------")
    print("All emails were directed to the console output.")
    print("In a production environment, you'd want to use a real email service.")
    print("For local development, this console backend works well for testing.")
    print("-----------------------------------------") 