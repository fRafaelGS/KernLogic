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


class ImportTaskViewSet(mixins.CreateModelMixin,
                        mixins.RetrieveModelMixin,
                        mixins.ListModelMixin,
                        viewsets.GenericViewSet):
    """
    ViewSet for managing product import tasks.
    
    Supports creating new import tasks, retrieving status, listing all tasks, 
    canceling tasks, and generating reports of imported data.
    """
    serializer_class = ImportTaskSerializer
    parser_classes = [parsers.MultiPartParser, parsers.JSONParser]
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Return only tasks created by the current user."""
        return ImportTask.objects.filter(created_by=self.request.user)

    def perform_create(self, serializer):
        """Create a new import task and enqueue it for processing."""
        task = serializer.save(created_by=self.request.user)
        # Enqueue task for async processing
        import_csv_task.delay(task_id=task.id)
    
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
        Preview the first 10 rows of the CSV file.
        """
        task = self.get_object()
        
        try:
            if task.csv_file.name.endswith('.csv'):
                df = pd.read_csv(task.csv_file.path, nrows=10)
            elif task.csv_file.name.endswith(('.xls', '.xlsx')):
                df = pd.read_excel(task.csv_file.path, nrows=10)
            else:
                return Response(
                    {"detail": "Unsupported file format"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
                
            # Get column names and up to 10 rows
            columns = df.columns.tolist()
            rows = df.head(10).to_dict('records')
            
            return Response({
                'columns': columns,
                'rows': rows,
            })
        except Exception as e:
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
            return Response(
                {"detail": f"Error serving error report: {str(e)}"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )  