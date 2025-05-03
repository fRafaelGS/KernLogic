#!/usr/bin/env python
import requests
import json
import uuid

# Configuration
BASE_URL = "http://localhost:8000"
API_URL = f"{BASE_URL}/api"

# Helper function to convert numeric ID to UUID format
def convert_to_uuid(simple_id):
    """Convert a simple ID (like '1') to a UUID format"""
    # Check if it's already a valid UUID
    try:
        return str(uuid.UUID(simple_id))
    except ValueError:
        # It's not a valid UUID, convert numeric ID to UUID format by padding with zeros
        return f"00000000-0000-0000-0000-{int(simple_id):012d}"

# Step 1: Get a token
def get_token(email="rgarciasaraiva@gmail.com", password="Nadaaver93!"):
    print(f"Attempting to get token for {email}")
    
    url = f"{API_URL}/token/"
    data = {
        "email": email,
        "password": password
    }
    
    response = requests.post(url, json=data)
    
    print(f"Token response status: {response.status_code}")
    if response.status_code == 200:
        token_data = response.json()
        print(f"Token obtained successfully: {token_data['access'][:20]}...")
        return token_data["access"]
    else:
        print(f"Error getting token: {response.text}")
        return None

# Step 2: Get the current user information
def get_current_user(token):
    print(f"\nAttempting to get current user information")
    
    url = f"{API_URL}/users/me/"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    response = requests.get(url, headers=headers)
    
    print(f"Current user response status: {response.status_code}")
    if response.status_code == 200:
        user_data = response.json()
        print(f"Current user data: {json.dumps(user_data, indent=2)}")
        return user_data
    else:
        print(f"Error getting current user: {response.text}")
        return None

# Step 3: Test the TeamPage endpoints using the same approach as the frontend
def test_team_endpoints():
    """Test direct access to TeamPage endpoints using numeric ID"""
    # Login to get access token
    login_data = {
        "email": "rgarciasaraiva@gmail.com",
        "password": "Nadaaver93!"
    }
    
    print("Logging in to get token...")
    login_response = requests.post(f"{BASE_URL}/api/token/", json=login_data)
    
    if login_response.status_code != 200:
        print(f"Login failed: {login_response.text}")
        return
        
    token = login_response.json().get("access")
    if not token:
        print("No access token returned")
        return
        
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    print("Getting user info...")
    user_response = requests.get(f"{BASE_URL}/api/users/me/", headers=headers)
    if user_response.status_code == 200:
        user_data = user_response.json()
        print(f"User data: {json.dumps(user_data, indent=2)}")
    else:
        print(f"Failed to get user info: {user_response.text}")
    
    # Use the numeric organization ID
    org_id = "1"
    print(f"\nUsing organization ID: {org_id}")
    
    # Test roles endpoint with numeric ID
    roles_url = f"{BASE_URL}/api/orgs/{org_id}/roles/"
    print(f"Testing roles endpoint: {roles_url}")
    roles_response = requests.get(roles_url, headers=headers)
    print(f"Roles response status: {roles_response.status_code}")
    
    if roles_response.status_code == 200:
        print(f"Roles data: {json.dumps(roles_response.json(), indent=2)}")
    else:
        print(f"Error getting roles: {roles_response.text}")
    
    # Test memberships endpoint with numeric ID
    memberships_url = f"{BASE_URL}/api/orgs/{org_id}/memberships/"
    print(f"Testing memberships endpoint: {memberships_url}")
    memberships_response = requests.get(memberships_url, headers=headers)
    print(f"Memberships response status: {memberships_response.status_code}")
    
    if memberships_response.status_code == 200:
        print(f"Memberships data: {json.dumps(memberships_response.json(), indent=2)}")
    else:
        print(f"Error getting memberships: {memberships_response.text}")

# Run the test
if __name__ == "__main__":
    test_team_endpoints() 