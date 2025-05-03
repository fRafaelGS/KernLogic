import os
import django
import smtplib
import ssl

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.core.mail import send_mail
from django.conf import settings

def verify_smtp_connection():
    """Test SMTP connection directly without Django's send_mail"""
    host = settings.EMAIL_HOST
    port = settings.EMAIL_PORT
    username = settings.EMAIL_HOST_USER
    password = settings.EMAIL_HOST_PASSWORD
    use_tls = settings.EMAIL_USE_TLS
    
    print(f"Verifying SMTP connection to {host}:{port}")
    print(f"Username: {username}")
    print(f"Password: {'*' * len(password)} (length: {len(password)})")
    print(f"TLS Enabled: {use_tls}")
    
    try:
        if use_tls:
            context = ssl.create_default_context()
            server = smtplib.SMTP(host, port)
            server.starttls(context=context)
        else:
            server = smtplib.SMTP(host, port)
        
        server.connect(host, port)
        server.ehlo()
        if use_tls:
            server.starttls()
            server.ehlo()
        
        # Try to login
        server.login(username, password)
        print("SMTP login successful!")
        
        # Close the connection
        server.quit()
        return True
    except Exception as e:
        print(f"SMTP Connection Error: {e}")
        return False

def test_email_config():
    """
    Test email configuration by sending a test email
    """
    # First verify the SMTP connection
    if not verify_smtp_connection():
        print("SMTP connection test failed, aborting email send test.")
        return False
    
    subject = 'KernLogic Email Test'
    message = 'This is a test message to confirm email configuration is working correctly.'
    from_email = settings.DEFAULT_FROM_EMAIL
    recipient_list = [settings.EMAIL_HOST_USER]  # Sending to yourself for testing
    
    print(f"Attempting to send email from {from_email} to {recipient_list}")
    
    try:
        result = send_mail(
            subject=subject,
            message=message,
            from_email=from_email,
            recipient_list=recipient_list,
            fail_silently=False,
        )
        print(f"Email sent successfully! Result: {result}")
        return True
    except Exception as e:
        print(f"Failed to send email: {e}")
        return False

if __name__ == "__main__":
    test_email_config() 