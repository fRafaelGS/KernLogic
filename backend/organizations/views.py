from django.shortcuts import render, get_object_or_404
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import serializers, permissions

from .models import Organization

class OrganizationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Organization
        fields = ('id', 'name', 'created_at')

class OrganizationDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request, org_id):
        org = get_object_or_404(Organization, id=org_id)
        serializer = OrganizationSerializer(org)
        return Response(serializer.data)
