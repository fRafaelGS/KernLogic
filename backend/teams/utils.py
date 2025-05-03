import uuid
from django.conf import settings
from django.core.mail import send_mail, EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from django.urls import reverse

# Import Anymail message class
try:
    from anymail.message import AnymailMessage
    HAS_ANYMAIL = True
except ImportError:
    HAS_ANYMAIL = False

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
    
    user = membership.user
    org_id = membership.organization.id  # Now a UUID
    organization_name = membership.organization.name
    invite_token = str(uuid.uuid4())  # For a real app, store this token in the database
    
    # Check if the user has ever logged in (new users won't have a last_login)
    is_new_user = user.last_login is None
    
    # Generate appropriate URL based on whether the user is new or existing
    if is_new_user:
        # For new users, direct them to set their password instead of registration
        action_url = f"{frontend_url}/set-password/{org_id}?token={invite_token}&email={user.email}"
        template_name = 'teams/new_user_invitation_email.html'
        email_subject = 'You have been invited to join KernLogic'
        print(f"DEBUG: New user email to {user.email} with password setting link: {action_url}")
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
    from_email = settings.DEFAULT_FROM_EMAIL if hasattr(settings, 'DEFAULT_FROM_EMAIL') else 'noreply@kernlogic.com'
    
    try:
        # Use Anymail if available for enhanced features
        if HAS_ANYMAIL:
            print(f"DEBUG: Using Anymail to send invitation email to {user.email}")
            # Create an AnymailMessage
            msg = AnymailMessage(
                subject=email_subject,
                body=plain_message,
                from_email=from_email,
                to=[user.email],
            )
            
            # Add HTML alternative
            msg.attach_alternative(html_message, "text/html")
            
            # Add Anymail-specific features
            msg.tags = ["invitation", "team_member"]
            msg.track_opens = True
            msg.track_clicks = True
            msg.metadata = {
                "organization_id": str(org_id),
                "membership_id": str(membership.id),
                "user_id": str(user.id),
                "invitation_type": "new_user" if is_new_user else "existing_user"
            }
            
            # Send the email
            result = msg.send()
            print(f"DEBUG: Anymail email sent successfully to {user.email}, ESP Message ID: {result.message_id if hasattr(result, 'message_id') else 'N/A'}")
            
        else:
            # Fallback to standard Django email
            print(f"DEBUG: Falling back to standard Django email for {user.email}")
            send_mail(
                subject=email_subject,
                message=plain_message,
                from_email=from_email,
                recipient_list=[user.email],
                html_message=html_message,
                fail_silently=False
            )
            print(f"DEBUG: Standard email sent successfully to {user.email}")
            
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
        # For new users, direct them to set their password instead of registration
        action_url = f"{frontend_url}/set-password/{org_id}?token={invite_token}&email={user.email}"
        email_type = "NEW USER PASSWORD SETUP"
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