"""
Custom schema extensions for OpenAPI documentation.
"""

# This will be merged with the main schema by drf-spectacular
components = {
    "headers": {
        "Idempotency-Key": {
            "description": "Unique key to make a write request idempotent for 5 minutes",
            "schema": {
                "type": "string"
            }
        }
    }
} 