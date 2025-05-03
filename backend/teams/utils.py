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
    
    # Print debug information
    print(f"DEBUG: Sending invitation email with frontend_url: {frontend_url}")
    print(f"DEBUG: Email settings: HOST={settings.EMAIL_HOST}, PORT={settings.EMAIL_PORT}, USER={settings.EMAIL_HOST_USER}")
    
    user = membership.user
    org_id = membership.organization.id  # Now a UUID
    organization_name = membership.organization.name
    invite_token = str(uuid.uuid4())  # For a real app, store this token in the database
    
    # Check if the user has ever logged in (new users won't have a last_login)
    is_new_user = user.last_login is None
    
    # Generate appropriate URL based on whether the user is new or existing
    if is_new_user:
        # For new users, generate a registration link with the organization ID
        action_url = f"{frontend_url}/register/{org_id}?token={invite_token}&email={user.email}"
        template_name = 'teams/new_user_invitation_email.html'
        email_subject = 'You have been invited to join KernLogic'
        print(f"DEBUG: New user email to {user.email} with registration link: {action_url}")
    else:
        # For existing users, generate an accept invite link
        action_url = f"{frontend_url}/accept-invite/{membership.id}/{invite_token}"
        template_name = 'teams/existing_user_invitation_email.html'
        email_subject = 'You have been invited to join a team on KernLogic'
        print(f"DEBUG: Existing user email to {user.email} with invite link: {action_url}")
    
    context = {
        'user_email': user.email,
        'user_name': user.get_full_name() or user.email,
        'inviter_name': inviter_name,
        'organization_id': org_id,
        'organization_name': organization_name,
        'role': membership.role.name,
        'action_url': action_url,
        'frontend_url': frontend_url
    }
    
    # Render email templates
    try:
        html_message = render_to_string(template_name, context)
        print(f"DEBUG: Successfully rendered template: {template_name}")
    except Exception as template_error:
        # Fallback to a simple template if the specific one doesn't exist
        print(f"DEBUG: Template error: {str(template_error)}")
        try:
            html_message = render_to_string('teams/invitation_email.html', context)
            print(f"DEBUG: Used fallback template")
        except Exception as fallback_error:
            print(f"DEBUG: Fallback template error: {str(fallback_error)}")
            html_message = f"<p>You've been invited to join {organization_name} by {inviter_name}.</p><p>Click here to accept: <a href='{action_url}'>{action_url}</a></p>"
    
    plain_message = strip_tags(html_message)
    
    try:
        # Send the email
        print(f"DEBUG: Attempting to send email to {user.email} from {settings.DEFAULT_FROM_EMAIL if hasattr(settings, 'DEFAULT_FROM_EMAIL') else 'noreply@kernlogic.com'}")
        send_mail(
            subject=email_subject,
            message=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL if hasattr(settings, 'DEFAULT_FROM_EMAIL') else 'noreply@kernlogic.com',
            recipient_list=[user.email],
            html_message=html_message,
            fail_silently=False
        )
        print(f"DEBUG: Email sent successfully to {user.email}")
        return True
    except Exception as e:
        # Log the error
        print(f"DEBUG: Error sending invitation email: {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()
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
    org_id = membership.organization.id  # Now a UUID
    organization_name = membership.organization.name
    invite_token = str(uuid.uuid4())
    
    # Get the frontend URL from settings
    frontend_url = settings.FRONTEND_URL if hasattr(settings, 'FRONTEND_URL') else 'http://localhost:3004'
    
    # Check if the user has ever logged in (new users won't have a last_login)
    is_new_user = user.last_login is None
    
    # Generate appropriate URL based on whether the user is new or existing
    if is_new_user:
        # For new users, generate a registration link with the organization ID
        action_url = f"{frontend_url}/register/{org_id}?token={invite_token}&email={user.email}"
        email_type = "NEW USER REGISTRATION"
    else:
        # For existing users, generate an accept invite link
        action_url = f"{frontend_url}/accept-invite/{membership.id}/{invite_token}"
        email_type = "EXISTING USER INVITATION"
    
    # Log the invitation details
    print(f"=== MOCK {email_type} EMAIL ===")
    print(f"To: {user.email}")
    print(f"From: {inviter_name}")
    print(f"Organization: {organization_name} (ID: {org_id})")
    print(f"Role: {membership.role.name}")
    print(f"Action Link: {action_url}")
    print(f"============================")
    
    return True 