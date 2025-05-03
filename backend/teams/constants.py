# teams/constants.py

# Product Permissions
PRODUCT_PERMISSIONS = [
    "product.view",
    "product.add",
    "product.change",
    "product.delete",
]

# Team/User Permissions
TEAM_PERMISSIONS = [
    "team.view",
    "team.invite",
    "team.change_role",
    "team.remove",
]

# Dashboard Permissions
DASHBOARD_PERMISSIONS = [
    "dashboard.view",
]

# Default permissions for each role
DEFAULT_ROLE_PERMISSIONS = {
    "Admin": PRODUCT_PERMISSIONS + TEAM_PERMISSIONS + DASHBOARD_PERMISSIONS,
    "Editor": ["product.view", "product.add", "product.change"] + DASHBOARD_PERMISSIONS,
    "Viewer": ["product.view", "team.view", "dashboard.view"],
} 