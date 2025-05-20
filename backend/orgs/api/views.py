from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from teams.models import Membership
from organizations.models import Organization

@api_view(['POST', 'DELETE', 'GET'])
@permission_classes([IsAuthenticated])
def membership_avatar(request, org_id, membership_id):
    """
    Handle membership avatar uploads, viewing, and deletion.
    
    - GET: Return the avatar URL
    - POST: Upload a new avatar
    - DELETE: Remove the existing avatar
    """
    # Get the organization
    try:
        organization = Organization.objects.get(id=org_id)
    except Organization.DoesNotExist:
        return Response({"detail": "Organization not found"}, status=404)
    
    # Get the membership
    try:
        membership = Membership.objects.get(id=membership_id, organization_id=org_id)
    except Membership.DoesNotExist:
        return Response({"detail": "Membership not found"}, status=404)
    
    # Check permissions - users can only modify their own avatar
    if request.method in ['POST', 'DELETE'] and membership.user.id != request.user.id:
        return Response({"detail": "You can only update your own avatar"}, status=403)
    
    # GET request - return avatar URL
    if request.method == 'GET':
        avatar_url = None
        user = membership.user
        
        # Get avatar URL from user profile if available
        if hasattr(user, 'profile') and user.profile.avatar:
            avatar_url = request.build_absolute_uri(user.profile.avatar.url)
        
        return Response({"avatar_url": avatar_url})
    
    # Handle avatar deletion
    if request.method == 'DELETE':
        user = membership.user
        
        # Handle different profile models depending on your implementation
        if hasattr(user, 'profile'):
            if user.profile.avatar:
                # Delete the file
                user.profile.avatar.delete(save=False)
                user.profile.save()
                return Response({"detail": "Avatar removed successfully"}, status=200)
            return Response({"detail": "No avatar to remove"}, status=400)
        
        return Response({"detail": "User profile not found"}, status=404)
    
    # Handle avatar upload (POST)
    if 'avatar' not in request.FILES:
        return Response({"detail": "No avatar file provided"}, status=400)
    
    avatar_file = request.FILES['avatar']
    
    # Validate file type
    allowed_types = ['image/jpeg', 'image/png', 'image/gif']
    if avatar_file.content_type not in allowed_types:
        return Response({"detail": "Invalid file type. Only JPEG, PNG and GIF are allowed."}, status=400)
    
    # Validate file size (limit to 5MB)
    if avatar_file.size > 5 * 1024 * 1024:
        return Response({"detail": "File too large. Maximum size is 5MB."}, status=400)
    
    user = membership.user
    
    # Save avatar to user profile
    try:
        if hasattr(user, 'profile'):
            # Delete old avatar if exists
            if user.profile.avatar:
                user.profile.avatar.delete(save=False)
            
            # Save new avatar
            user.profile.avatar = avatar_file
            user.profile.save()
        else:
            # Create profile if it doesn't exist
            from accounts.models import Profile  # Import here to avoid circular imports
            Profile.objects.create(user=user, avatar=avatar_file)
        
        # Return success with avatar URL
        avatar_url = request.build_absolute_uri(user.profile.avatar.url)
        return Response({
            "detail": "Avatar uploaded successfully",
            "avatar_url": avatar_url
        }, status=200)
    
    except Exception as e:
        return Response({"detail": f"Error saving avatar: {str(e)}"}, status=500) 