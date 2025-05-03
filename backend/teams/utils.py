import uuid
from django.conf import settings
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from django.urls import reverse

def send_invitation_email(membership, inviter_name, frontend_url=None):
    """
    Send an invitation email to a user with a link to accept the invitation.
    
    Args:
        membership: The Membership instance
        inviter_name: Name of the person sending the invitation
        frontend_url: Base URL for the frontend application
    
    Returns:
        Boolean indicating success
    """
    if not frontend_url:
        frontend_url = settings.FRONTEND_URL if hasattr(settings, 'FRONTEND_URL') else 'http://localhost:3000'
    
    user = membership.user
    org_id = membership.org_id
    invite_token = str(uuid.uuid4())  # For a real app, store this token in the database
    
    # In production, this would be a secure token stored in the database
    # For now, we'll use a simple UUID that identifies this specific membership
    accept_url = f"{frontend_url}/accept-invite/{membership.id}/{invite_token}"
    
    context = {
        'user_email': user.email,
        'inviter_name': inviter_name,
        'organization_id': org_id,
        'role': membership.role.name,
        'accept_url': accept_url
    }
    
    # Render email templates
    html_message = render_to_string('teams/invitation_email.html', context)
    plain_message = strip_tags(html_message)
    
    try:
        # Send the email
        send_mail(
            subject='You have been invited to join a team',
            message=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL if hasattr(settings, 'DEFAULT_FROM_EMAIL') else 'noreply@example.com',
            recipient_list=[user.email],
            html_message=html_message,
            fail_silently=False
        )
        return True
    except Exception as e:
        # Log the error
        print(f"Error sending invitation email: {str(e)}")
        return False


def mock_send_invitation_email(membership, inviter_name):
    """
    For development environments without email setup.
    Mocks sending an email and logs the information instead.
    
    Args:
        membership: The Membership instance
        inviter_name: Name of the person sending the invitation
    
    Returns:
        Always returns True
    """
    user = membership.user
    org_id = membership.org_id
    invite_token = str(uuid.uuid4())
    
    # Log the invitation details
    print(f"=== MOCK INVITATION EMAIL ===")
    print(f"To: {user.email}")
    print(f"From: {inviter_name}")
    print(f"Organization: {org_id}")
    print(f"Role: {membership.role.name}")
    print(f"Accept Link: http://localhost:3000/accept-invite/{membership.id}/{invite_token}")
    print(f"============================")
    
    return True 