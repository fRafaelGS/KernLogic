from django.http import HttpResponse, JsonResponse
from django.template.loader import render_to_string
from django.conf import settings
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
import tempfile
import os
# Use xhtml2pdf instead of WeasyPrint
from xhtml2pdf import pisa
from products.models import Product, AttributeValue, AttributeGroup, AttributeGroupItem
from datetime import datetime

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def generate_product_pdf(request, product_id):
    """Generate a PDF for a product specification"""
    try:
        # Get the product
        product = Product.objects.filter(id=product_id).first()
        
        if not product:
            return JsonResponse({"message": "Product not found"}, status=404)
        
        # Get product attribute values with their groups
        attribute_groups = {}
        
        # Get all attribute groups for the organization
        groups = AttributeGroup.objects.filter(organization=product.organization).order_by('order')
        
        for group in groups:
            # Get attributes in this group with their values for this product
            group_attributes = []
            
            # Get the attributes in this group via the through table
            attribute_ids = AttributeGroupItem.objects.filter(
                group=group
            ).order_by('order').values_list('attribute_id', flat=True)
            
            # Get attribute values for this product matching those attribute IDs
            attr_values = AttributeValue.objects.filter(
                product=product,
                attribute_id__in=attribute_ids
            ).select_related('attribute')
            
            # Map attribute values by attribute ID for easy lookup
            value_map = {av.attribute_id: av for av in attr_values}
            
            # For each attribute in the group, add its value if it exists
            for attr_id in attribute_ids:
                av = value_map.get(attr_id)
                if av:
                    # Format the value based on data type
                    formatted_value = format_attribute_value(av.value, av.attribute.data_type)
                    group_attributes.append({
                        'name': av.attribute.label,
                        'value': formatted_value,
                        'unit': ''  # Add unit handling if needed
                    })
            
            # Only include groups with attributes that have values
            if group_attributes:
                attribute_groups[group.name] = group_attributes
        
        # Get tags
        tags = product.get_tags()
        
        # Calculate data completeness
        completeness_score = product.get_completeness()
        missing_fields = product.get_missing_fields()
        
        # Format dates
        created_at = product.created_at.strftime('%B %d, %Y')
        updated_at = product.updated_at.strftime('%B %d, %Y')
        
        # Determine if there's a primary image
        primary_image_url = None
        if product.primary_image:
            primary_image_url = request.build_absolute_uri(product.primary_image.url)
        else:
            # Try to find a primary image from ProductAsset
            primary_asset = product.assets.filter(is_primary=True, asset_type='image').first()
            if primary_asset:
                primary_image_url = request.build_absolute_uri(primary_asset.file.url)
        
        # Prepare context for HTML template
        context = {
            'product': product,
            'sku': product.sku,
            'name': product.name,
            'category': product.category or 'N/A',
            'brand': product.brand or 'N/A',
            'gtin': product.barcode or 'N/A',
            'price': product.price,
            'status': 'Active' if product.is_active else 'Inactive',
            'created_at': created_at,
            'updated_at': updated_at,
            'description': product.description,
            'primary_image_url': primary_image_url,
            'tags': tags,
            'attribute_groups': attribute_groups,
            'data_completeness': {
                'score': completeness_score,
                'missing_fields': [field['field'] for field in missing_fields[:5]]  # Limit to 5 missing fields
            },
            'generation_date': timezone.now().strftime('%B %d, %Y %H:%M'),
            'company_name': product.organization.name if product.organization else 'KernLogic'
        }
        
        # Generate HTML content from template
        html_content = render_to_string('products/product_pdf.html', context)
        
        # Create a PDF using xhtml2pdf
        response = HttpResponse(content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="product-{product.sku}.pdf"'
        
        # Convert HTML to PDF
        pisa_status = pisa.CreatePDF(
            html_content,
            dest=response,
            encoding='utf-8'
        )
        
        # Return the PDF response if successful
        if pisa_status.err:
            return JsonResponse({"message": "PDF generation failed"}, status=500)
        return response
        
    except Exception as e:
        # Log the error
        import traceback
        traceback.print_exc()
        return JsonResponse({"message": f"An error occurred: {str(e)}"}, status=500)

def format_attribute_value(value, data_type):
    """Format attribute value based on data type"""
    if value is None:
        return 'N/A'
    
    try:
        if data_type == 'text':
            return str(value)
        elif data_type == 'number':
            return str(float(value))
        elif data_type == 'boolean':
            return 'Yes' if value else 'No'
        elif data_type == 'date':
            return datetime.fromisoformat(value.replace('Z', '+00:00')).strftime('%Y-%m-%d')
        elif data_type == 'select':
            # Handle select data type
            if isinstance(value, list):
                return ', '.join(value)
            return str(value)
        else:
            return str(value)
    except Exception:
        return str(value) 