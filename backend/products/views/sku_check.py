from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import serializers
from rest_framework.permissions import IsAuthenticated
from products.models import Product

class SkuCheckAPIView(APIView):
    permission_classes = [IsAuthenticated]

    class _Input(serializers.Serializer):
        skus = serializers.ListField(
            child=serializers.CharField(max_length=50), allow_empty=False
        )

    def post(self, request, *args, **kwargs):
        data = self._Input(data=request.data)
        data.is_valid(raise_exception=True)
        # Use created_by (user) as a substitute for tenant
        user = request.user
        uploaded_skus = list(set(data.validated_data["skus"]))
        existing = (
            Product.objects
            .filter(created_by=user, sku__in=uploaded_skus)
            .values_list("sku", flat=True)
        )
        return Response({"duplicates": list(existing)}) 