from django.urls import reverse
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from products.models import (
    Attribute, AttributeValue, Product, AttributeGroup, AttributeGroupItem
)
from organizations.models import Organization
from django.contrib.auth import get_user_model
from teams.models import Membership, Role

User = get_user_model()


class ProductAttributeGroupViewSetTests(TestCase):
    """Tests for the `/api/products/<id>/attribute-groups/` endpoint."""

    def setUp(self):
        # Organisations
        self.org = Organization.objects.create(name='Org')
        self.other_org = Organization.objects.create(name='Other Org')

        # Role (required for membership helper)
        self.role = Role.objects.create(name='Admin')

        # Users
        self.user = User.objects.create_user(email='user@example.com', password='pass')
        self.other_user = User.objects.create_user(email='other@example.com', password='pass')

        # Memberships
        Membership.objects.create(user=self.user, organization=self.org, role=self.role, status='active')
        Membership.objects.create(user=self.other_user, organization=self.other_org, role=self.role, status='active')

        # Product belonging to `self.org`
        self.product = Product.objects.create(
            name='Test Product', sku='SKU1', price=10, organization=self.org, created_by=self.user
        )

        # One attribute
        self.attr = Attribute.objects.create(
            code='color', label='Color', data_type='text', organization=self.org, created_by=self.user
        )

        # Attribute group w/ one item pointing to attr
        self.group = AttributeGroup.objects.create(name='Specs', organization=self.org, created_by=self.user)
        AttributeGroupItem.objects.create(group=self.group, attribute=self.attr, order=0)

        # API client
        self.client = APIClient()

    def _get_url(self):
        return reverse('product-attribute-groups-list', kwargs={'product_pk': self.product.pk})

    def test_returns_empty_when_no_attribute_values(self):
        """If the product has no AttributeValue rows, endpoint should return an empty list."""
        self.client.force_authenticate(user=self.user)
        response = self.client.get(self._get_url())
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, [])

    def test_returns_groups_with_values(self):
        """Endpoint returns only groups that have at least one AttributeValue for the product."""
        # Create one AttributeValue for the product / attr in the group
        AttributeValue.objects.create(
            product=self.product,
            attribute=self.attr,
            value='Red',
            organization=self.org,
            created_by=self.user,
        )

        self.client.force_authenticate(user=self.user)
        response = self.client.get(self._get_url())
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # exactly the one group we created
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['id'], self.group.id)

        # Sanity-check: other user (different organisation) should receive 404 on list
        # self.client.force_authenticate(user=self.other_user)
        # other_url = reverse('product-attribute-groups-list', kwargs={'product_pk': self.product.pk})
        # response_other = self.client.get(other_url)
        # self.assertEqual(response_other.status_code, status.HTTP_404_NOT_FOUND) 