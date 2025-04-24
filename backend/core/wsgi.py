"""
WSGI config for core project.

It exposes the WSGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/4.2/howto/deployment/wsgi/
"""

import os
from django.core.wsgi import get_wsgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
application = get_wsgi_application()

# Initialize New Relic
try:
    import newrelic.agent
    newrelic.agent.initialize('backend/newrelic.ini')
    application = newrelic.agent.WSGIApplicationWrapper(application)
except Exception as e:
    print(f"Warning: Could not initialize New Relic: {e}")
