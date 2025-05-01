from rest_framework import viewsets, mixins, permissions, parsers, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.conf import settings
from .models import ImportTask
from .serializers import ImportTaskSerializer
from .tasks import import_csv_task
import pandas as pd
import io
from django.http import HttpResponse
from django.core.exceptions import PermissionDenied
import os
import logging
from kernlogic.org_queryset import OrganizationQuerySetMixin

logger = logging.getLogger(__name__)

class ImportTaskViewSet(OrganizationQuerySetMixin,
                        mixins.CreateModelMixin,
                        mixins.RetrieveModelMixin,
                        mixins.ListModelMixin,
                        viewsets.GenericViewSet):
    """
    ViewSet for managing product import tasks.
    
    Supports creating new import tasks, retrieving status, listing all tasks, 
    canceling tasks, and generating reports of imported data.
    """
    serializer_class = ImportTaskSerializer
    parser_classes = [parsers.MultiPartParser, parsers.JSONParser, parsers.FormParser]
    permission_classes = [permissions.IsAuthenticated]
    queryset = ImportTask.objects.all()
    
    def get_queryset(self):
        """Return only tasks created by the current user and in the same organization."""
        qs = super().get_queryset()
        return qs.filter(created_by=self.request.user)

    def perform_create(self, serializer):
        """Create a new import task and enqueue it for processing."""
        try:
            # Get the file extension to validate file type
            file = serializer.validated_data.get('csv_file')
            if file:
                _, file_ext = os.path.splitext(file.name)
                file_ext = file_ext.lower()
                
                # Validate file extension
                if file_ext not in ['.csv', '.xlsx', '.xls']:
                    raise ValueError(f"Unsupported file type: {file_ext}. Only CSV and Excel files are supported.")
                
                # Get organization from user profile
                organization = self.request.user.profile.organization
                
                # Save task and enqueue for processing
                task = serializer.save(
                    created_by=self.request.user,
                    organization=organization
                )
                logger.info(f"Created import task {task.id} for file {file.name} ({file_ext})")
                
                # Enqueue task for async processing
                import_csv_task.delay(task_id=task.id)
                return task
            else:
                raise ValueError("No file was provided")
        except Exception as e:
            logger.error(f"Error creating import task: {str(e)}")
            raise
    
    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """
        Cancel an in-progress import task.
        Only tasks in 'queued' or 'running' state can be canceled.
        """
        task = self.get_object()
        
        # Check if task can be canceled
        if task.status not in ['queued', 'running']:
            return Response(
                {"detail": f"Cannot cancel task in '{task.status}' state."}, 
                status=status.HTTP_400_BAD_REQUEST
            )
            
        # Mark as error with explanation
        task.status = 'error'
        task.save(update_fields=['status'])
        
        return Response({"status": "canceled"})
    
    @action(detail=True, methods=['get'])
    def preview(self, request, pk=None):
        """
        Preview the first 10 rows of the CSV or Excel file.
        """
        task = self.get_object()
        
        try:
            file_path = task.csv_file.path
            file_ext = os.path.splitext(file_path)[1].lower()
            
            if file_ext == '.csv':
                df = pd.read_csv(file_path, nrows=10)
            elif file_ext in ['.xls', '.xlsx']:
                df = pd.read_excel(file_path, nrows=10)
            else:
                return Response(
                    {"detail": f"Unsupported file format: {file_ext}"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
                
            # Get column names and up to 10 rows
            columns = df.columns.tolist()
            rows = df.head(10).to_dict('records')
            
            return Response({
                'columns': columns,
                'rows': rows,
                'file_type': file_ext[1:]  # Remove the dot from the extension
            })
        except Exception as e:
            logger.error(f"Error generating preview for task {pk}: {str(e)}")
            return Response(
                {"detail": f"Error previewing file: {str(e)}"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['get'])
    def get_report(self, request, pk=None):
        """
        Download the error report for an import task.
        """
        task = self.get_object()
        
        if not task.error_file:
            return Response(
                {"detail": "No error report available for this task."}, 
                status=status.HTTP_404_NOT_FOUND
            )
            
        try:
            # Read the file and serve it
            with open(task.error_file.path, 'r') as f:
                response = HttpResponse(f.read(), content_type='text/plain')
                response['Content-Disposition'] = f'attachment; filename="import_errors_{task.id}.txt"'
                return response
        except Exception as e:
            logger.error(f"Error serving error report for task {pk}: {str(e)}")
            return Response(
                {"detail": f"Error serving error report: {str(e)}"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )  