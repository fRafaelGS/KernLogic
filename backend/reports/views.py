from django.shortcuts import render
from rest_framework import viewsets
from rest_framework.permissions import AllowAny
from .models import ReportTheme
from .serializers import ReportThemeSerializer

# Create your views here.

class ReportThemeViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Public list of available report themes.
    """
    queryset = ReportTheme.objects.all()
    serializer_class = ReportThemeSerializer
    permission_classes = [AllowAny]
