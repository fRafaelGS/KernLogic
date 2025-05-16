from django.shortcuts import get_object_or_404
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions, status

from .models import Organization
from .serializers import OrganizationSerializer
from kernlogic.utils import get_user_organization

class OrganizationDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request, org_id):
        org = get_object_or_404(Organization, id=org_id)
        serializer = OrganizationSerializer(org)
        return Response(serializer.data)
        
    def patch(self, request, org_id):
        """
        Update organization settings including default_locale and default_channel
        """
        org = get_object_or_404(Organization, id=org_id)
        
        # Only organization members with appropriate permissions should be able to update
        user_org = get_user_organization(request.user)
        if not user_org or user_org.id != org.id:
            return Response(
                {"detail": "You do not have permission to update this organization."}, 
                status=status.HTTP_403_FORBIDDEN
            )
            
        serializer = OrganizationSerializer(org, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        else:
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
