#!/bin/bash
# Test runner script for CI and local development

set -e  # Exit immediately if a command exits with a non-zero status

echo "Running Django tests..."
cd "$(dirname "$0")"  # Navigate to the directory containing this script

# Run migration checks
python manage.py makemigrations --check --dry-run

# Run the tests
# Specifically include the attribute isolation test to ensure it's part of the CI process
pytest products/tests/test_attributes.py::AttributeTests::test_attribute_isolation

# Run all tests
pytest

echo "All tests passed!" 