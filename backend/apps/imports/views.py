from rest_framework import viewsets, mixins, permissions, parsers, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.conf import settings
from .models import ImportTask
from .serializers import ImportTaskSerializer
from .tasks import import_csv_task, import_attribute_groups_task, import_attributes_task, import_families_task
import pandas as pd
import io
from django.http import HttpResponse
from django.core.exceptions import PermissionDenied
import os
import logging
from kernlogic.org_queryset import OrganizationQuerySetMixin
from kernlogic.utils import get_user_organization
from rest_framework.views import APIView
from .constants import FIELD_SCHEMA, FIELD_SCHEMA_V2, ATTRIBUTE_GROUP_SCHEMA, ATTRIBUTE_SCHEMA, FAMILY_SCHEMA, ATTRIBUTE_HEADER_REGEX
from drf_spectacular.utils import extend_schema, OpenApiResponse, OpenApiParameter
from drf_spectacular.types import OpenApiTypes

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
        """Filter to current user's organization"""
        return super().get_queryset().order_by('-created_at')

    def perform_create(self, serializer):
        """Handle file upload and start the import task"""
        try:
            # Debug: log incoming files and data
            logger.debug(f"request.FILES: {self.request.FILES}")
            logger.debug(f"request.data: {self.request.data}")
            # Get the uploaded file
            if 'csv_file' in self.request.FILES:
                file = self.request.FILES['csv_file']
                _, file_ext = os.path.splitext(file.name)
                file_ext = file_ext.lower()
                
                # Validate file extension
                if file_ext not in ['.csv', '.xlsx', '.xls']:
                    raise ValueError(f"Unsupported file type: {file_ext}. Only CSV and Excel files are supported.")
                
                # Get organization using the utility function
                organization = get_user_organization(self.request.user)
                
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


class AttributeGroupImportViewSet(OrganizationQuerySetMixin, viewsets.ModelViewSet):
    """
    ViewSet for importing attribute groups from CSV or Excel files.
    
    This endpoint allows uploading a file containing attribute group definitions
    and initiates an async import process.
    """
    serializer_class = ImportTaskSerializer
    parser_classes = [parsers.MultiPartParser, parsers.JSONParser, parsers.FormParser]
    permission_classes = [permissions.IsAuthenticated]
    queryset = ImportTask.objects.all()
    
    def get_queryset(self):
        """Filter to current user's organization"""
        return super().get_queryset().order_by('-created_at')
    
    @extend_schema(
        description="Import attribute groups from a CSV or Excel file",
        responses={
            201: OpenApiResponse(description="Import task created successfully"),
            400: OpenApiResponse(description="Bad request - invalid file or parameters")
        },
        tags=["imports"]
    )
    def create(self, request, *args, **kwargs):
        """
        Upload a file containing attribute groups data and start the import process.
        
        Expected columns:
        - code: Unique identifier for the attribute group
        - label_en: English label for the group
        - sort_order: Optional ordering value
        """
        try:
            if 'csv_file' not in request.FILES:
                return Response(
                    {"detail": "No file was provided"},
                    status=status.HTTP_400_BAD_REQUEST
                )
                
            file = request.FILES['csv_file']
            _, file_ext = os.path.splitext(file.name)
            file_ext = file_ext.lower()
            
            if file_ext not in ['.csv', '.xlsx', '.xls']:
                return Response(
                    {"detail": f"Unsupported file type: {file_ext}. Only CSV and Excel files are supported."},
                    status=status.HTTP_400_BAD_REQUEST
                )
                
            # Get organization using the utility function
            organization = get_user_organization(request.user)
            
            # Create serializer with request data
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            
            # Save import task
            task = serializer.save(
                created_by=request.user,
                organization=organization
            )
            
            # Start async import process
            import_attribute_groups_task.delay(task_id=task.id)
            
            # Return success response
            headers = self.get_success_headers(serializer.data)
            return Response(
                serializer.data,
                status=status.HTTP_201_CREATED,
                headers=headers
            )
            
        except Exception as e:
            logger.error(f"Error creating attribute group import task: {str(e)}")
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


class AttributeImportViewSet(OrganizationQuerySetMixin, viewsets.ModelViewSet):
    """
    ViewSet for importing attributes from CSV or Excel files.
    
    This endpoint allows uploading a file containing attribute definitions
    and initiates an async import process.
    """
    serializer_class = ImportTaskSerializer
    parser_classes = [parsers.MultiPartParser, parsers.JSONParser, parsers.FormParser]
    permission_classes = [permissions.IsAuthenticated]
    queryset = ImportTask.objects.all()
    
    def get_queryset(self):
        """Filter to current user's organization"""
        return super().get_queryset().order_by('-created_at')
    
    @extend_schema(
        description="Import attributes from a CSV or Excel file",
        responses={
            201: OpenApiResponse(description="Import task created successfully"),
            400: OpenApiResponse(description="Bad request - invalid file or parameters")
        },
        tags=["imports"]
    )
    def create(self, request, *args, **kwargs):
        """
        Upload a file containing attributes data and start the import process.
        
        Expected columns:
        - code: Unique identifier for the attribute
        - type: Data type (text, number, etc.)
        - group_code: Code of the attribute group this attribute belongs to
        - is_localizable: Whether the attribute can have different values per locale
        - is_scopable: Whether the attribute can have different values per channel
        - validation_rule: Optional validation rule to apply
        """
        try:
            if 'csv_file' not in request.FILES:
                return Response(
                    {"detail": "No file was provided"},
                    status=status.HTTP_400_BAD_REQUEST
                )
                
            file = request.FILES['csv_file']
            _, file_ext = os.path.splitext(file.name)
            file_ext = file_ext.lower()
            
            if file_ext not in ['.csv', '.xlsx', '.xls']:
                return Response(
                    {"detail": f"Unsupported file type: {file_ext}. Only CSV and Excel files are supported."},
                    status=status.HTTP_400_BAD_REQUEST
                )
                
            # Get organization using the utility function
            organization = get_user_organization(request.user)
            
            # Create serializer with request data
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            
            # Save import task
            task = serializer.save(
                created_by=request.user,
                organization=organization
            )
            
            # Start async import process
            import_attributes_task.delay(task_id=task.id)
            
            # Return success response
            headers = self.get_success_headers(serializer.data)
            return Response(
                serializer.data,
                status=status.HTTP_201_CREATED,
                headers=headers
            )
            
        except Exception as e:
            logger.error(f"Error creating attribute import task: {str(e)}")
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


class FamilyImportViewSet(OrganizationQuerySetMixin, viewsets.ModelViewSet):
    """
    ViewSet for importing product families from CSV or Excel files.
    
    This endpoint allows uploading a file containing family definitions
    and initiates an async import process.
    """
    serializer_class = ImportTaskSerializer
    parser_classes = [parsers.MultiPartParser, parsers.JSONParser, parsers.FormParser]
    permission_classes = [permissions.IsAuthenticated]
    queryset = ImportTask.objects.all()
    
    def get_queryset(self):
        """Filter to current user's organization"""
        return super().get_queryset().order_by('-created_at')
    
    @extend_schema(
        description="Import product families from a CSV or Excel file",
        responses={
            201: OpenApiResponse(description="Import task created successfully"),
            400: OpenApiResponse(description="Bad request - invalid file or parameters")
        },
        tags=["imports"]
    )
    def create(self, request, *args, **kwargs):
        """
        Upload a file containing family data and start the import process.
        
        Expected columns:
        - code: Unique identifier for the family
        - label_en: English label for the family
        - attribute_codes: Pipe-separated list of attribute codes to include in this family
        """
        try:
            if 'csv_file' not in request.FILES:
                return Response(
                    {"detail": "No file was provided"},
                    status=status.HTTP_400_BAD_REQUEST
                )
                
            file = request.FILES['csv_file']
            _, file_ext = os.path.splitext(file.name)
            file_ext = file_ext.lower()
            
            if file_ext not in ['.csv', '.xlsx', '.xls']:
                return Response(
                    {"detail": f"Unsupported file type: {file_ext}. Only CSV and Excel files are supported."},
                    status=status.HTTP_400_BAD_REQUEST
                )
                
            # Get organization using the utility function
            organization = get_user_organization(request.user)
            
            # Create serializer with request data
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            
            # Save import task
            task = serializer.save(
                created_by=request.user,
                organization=organization
            )
            
            # Start async import process
            import_families_task.delay(task_id=task.id)
            
            # Return success response
            headers = self.get_success_headers(serializer.data)
            return Response(
                serializer.data,
                status=status.HTTP_201_CREATED,
                headers=headers
            )
            
        except Exception as e:
            logger.error(f"Error creating family import task: {str(e)}")
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


class FieldSchemaView(APIView):
    """
    Provides the canonical schema of importable product fields.
    
    This endpoint returns a versioned list of all fields that can be imported
    via the bulk import process, including metadata like field type and whether
    the field is required.
    """
    permission_classes = [permissions.IsAuthenticated]
    
    @extend_schema(
        description="Get the canonical schema of importable fields",
        parameters=[
            OpenApiParameter(
                name="v",
                description="Schema version (1 or 2)",
                required=False,
                type=OpenApiTypes.INT
            )
        ],
        responses={
            200: OpenApiResponse(
                description="List of importable fields with metadata",
                response=list,  # Using raw list as response type
            )
        },
        tags=["imports"]
    )
    def get(self, request, *args, **kwargs):
        """
        Return the canonical list of importable product fields.
        
        This is the single source of truth for field definitions used in import mapping.
        The schema includes field IDs, display labels, required status, and field types.
        
        Query Parameters:
        - v: Schema version (1 or 2). Default is 1 for backwards compatibility.
        """
        # Get requested version from query parameter
        version = request.query_params.get('v', '1')
        
        # Return appropriate schema based on version
        if version == '2':
            response_data = {
                'fields': FIELD_SCHEMA_V2,
                'attribute_header_pattern': ATTRIBUTE_HEADER_REGEX.pattern
            }
            return Response(response_data)
        else:
            return Response(FIELD_SCHEMA)


class AttributeGroupSchemaView(APIView):
    """
    Provides the schema for attribute group import fields.
    """
    permission_classes = [permissions.IsAuthenticated]
    
    @extend_schema(
        description="Get the schema for attribute group import fields",
        responses={
            200: OpenApiResponse(
                description="List of importable attribute group fields with metadata",
                response=list,
            )
        },
        tags=["imports"]
    )
    def get(self, request, *args, **kwargs):
        """
        Return the list of fields for attribute group imports.
        """
        return Response(ATTRIBUTE_GROUP_SCHEMA)


class AttributeSchemaView(APIView):
    """
    Provides the schema for attribute import fields.
    """
    permission_classes = [permissions.IsAuthenticated]
    
    @extend_schema(
        description="Get the schema for attribute import fields",
        responses={
            200: OpenApiResponse(
                description="List of importable attribute fields with metadata",
                response=list,
            )
        },
        tags=["imports"]
    )
    def get(self, request, *args, **kwargs):
        """
        Return the list of fields for attribute imports.
        """
        return Response(ATTRIBUTE_SCHEMA)


class FamilySchemaView(APIView):
    """
    Provides the schema for family import fields.
    """
    permission_classes = [permissions.IsAuthenticated]
    
    @extend_schema(
        description="Get the schema for family import fields",
        responses={
            200: OpenApiResponse(
                description="List of importable family fields with metadata",
                response=list,
            )
        },
        tags=["imports"]
    )
    def get(self, request, *args, **kwargs):
        """
        Return the list of fields for family imports.
        """
        return Response(FAMILY_SCHEMA)  