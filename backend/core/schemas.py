"""
Schema customizations for DRF Spectacular.
"""
from drf_spectacular.extensions import OpenApiViewExtension
from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiExample
from analytics.views import LocalizationQualityView
from rest_framework import status


class LocalizationQualitySchema(OpenApiViewExtension):
    target_class = 'analytics.views.LocalizationQualityView'

    def view_replacement(self):
        """
        Define the localization quality API schema with detailed descriptions and examples.
        """
        class Extended(self.target_class):
            @extend_schema(
                summary="Localization Quality Analytics",
                description=(
                    "Provides analytics on the localization quality across products. "
                    "Shows translation percentages by locale and attribute groups."
                ),
                parameters=[
                    OpenApiParameter(
                        name="from_date",
                        description="Filter by updates made on or after this date (ISO 8601 format)",
                        required=False,
                        type=str,
                        examples=[
                            OpenApiExample(
                                "Example",
                                value="2023-01-01"
                            )
                        ]
                    ),
                    OpenApiParameter(
                        name="to_date",
                        description="Filter by updates made on or before this date (ISO 8601 format)",
                        required=False,
                        type=str,
                        examples=[
                            OpenApiExample(
                                "Example",
                                value="2023-12-31"
                            )
                        ]
                    ),
                    OpenApiParameter(
                        name="locale",
                        description="Filter by locale code",
                        required=False,
                        type=str,
                        examples=[
                            OpenApiExample(
                                "Example",
                                value="fr_FR"
                            )
                        ]
                    ),
                    OpenApiParameter(
                        name="category",
                        description="Filter by category ID",
                        required=False,
                        type=str,
                        examples=[
                            OpenApiExample(
                                "Example",
                                value="123"
                            )
                        ]
                    ),
                    OpenApiParameter(
                        name="channel",
                        description="Filter by channel ID",
                        required=False,
                        type=str,
                        examples=[
                            OpenApiExample(
                                "Example",
                                value="456"
                            )
                        ]
                    ),
                    OpenApiParameter(
                        name="family",
                        description="Filter by product family ID",
                        required=False,
                        type=str,
                        examples=[
                            OpenApiExample(
                                "Example",
                                value="789"
                            )
                        ]
                    ),
                    OpenApiParameter(
                        name="page",
                        description="Page number for paginated results (if more than 100 locales)",
                        required=False,
                        type=int,
                        examples=[
                            OpenApiExample(
                                "Example",
                                value=1
                            )
                        ]
                    ),
                ],
                responses={
                    status.HTTP_200_OK: {
                        "type": "object",
                        "properties": {
                            "overall": {
                                "type": "object",
                                "properties": {
                                    "total_attributes": {"type": "integer"},
                                    "translated_attributes": {"type": "integer"},
                                    "translated_pct": {"type": "number", "format": "float"}
                                }
                            },
                            "locale_stats": {
                                "type": "array",
                                "items": {
                                    "type": "object",
                                    "properties": {
                                        "locale": {"type": "string"},
                                        "total_attributes": {"type": "integer"},
                                        "translated_attributes": {"type": "integer"},
                                        "translated_pct": {"type": "number", "format": "float"}
                                    }
                                }
                            },
                            "pagination": {
                                "type": "object",
                                "properties": {
                                    "total_pages": {"type": "integer"},
                                    "current_page": {"type": "integer"},
                                    "total_items": {"type": "integer"},
                                    "page_size": {"type": "integer"},
                                    "has_next": {"type": "boolean"},
                                    "has_previous": {"type": "boolean"}
                                }
                            }
                        }
                    },
                    status.HTTP_401_UNAUTHORIZED: {
                        "description": "Authentication credentials were not provided."
                    },
                    status.HTTP_403_FORBIDDEN: {
                        "description": "You do not have permission to perform this action."
                    }
                },
                examples=[
                    OpenApiExample(
                        "Example Response",
                        value={
                            "overall": {
                                "total_attributes": 1234,
                                "translated_attributes": 567,
                                "translated_pct": 46.0
                            },
                            "locale_stats": [
                                {
                                    "locale": "fr_FR",
                                    "total_attributes": 300,
                                    "translated_attributes": 150,
                                    "translated_pct": 50.0
                                },
                                {
                                    "locale": "de_DE", 
                                    "total_attributes": 300,
                                    "translated_attributes": 100,
                                    "translated_pct": 33.3
                                },
                                {
                                    "locale": "es_ES", 
                                    "total_attributes": 300,
                                    "translated_attributes": 200,
                                    "translated_pct": 66.7
                                }
                            ]
                        }
                    )
                ]
            )
            def get(self, request, *args, **kwargs):
                return super().get(request, *args, **kwargs)
                
        return Extended 