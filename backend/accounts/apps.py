from django.apps import AppConfig


class AccountsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "accounts"
    
    def ready(self):
        print("Initializing accounts app with custom authentication backend")
        import accounts.backends
