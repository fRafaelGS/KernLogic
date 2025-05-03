import requests
import json
import uuid

# Base API URL
BASE_URL = "http://localhost:8000"

def convert_to_uuid(simple_id):
    """Convert a simple ID (like '1') to a UUID format"""
    try:
        return str(uuid.UUID(simple_id))
    except ValueError:
        # It's not a valid UUID, convert numeric ID to UUID format by padding with zeros
        return f"00000000-0000-0000-0000-{int(simple_id):012d}"

def debug_organization_issue():
    """Analyze the organization ID issue by checking various endpoints and data formats"""
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
    
    # Get user info to extract organization details
    print("\n=== Getting User Information ===")
    user_response = requests.get(f"{BASE_URL}/api/users/me/", headers=headers)
    
    if user_response.status_code == 200:
        user_data = user_response.json()
        print(f"User data: {json.dumps(user_data, indent=2)}")
        
        # Extract organization ID from user profile
        org_id = None
        if 'profile' in user_data and 'organization' in user_data['profile']:
            org_id = user_data['profile']['organization'].get('id')
            print(f"Organization ID from profile: {org_id}")
        
        if org_id:
            # Try different formats of the org ID
            print("\n=== Testing Organization Endpoints ===")
            
            formats_to_test = [
                {"name": "Original format", "id": org_id},
                {"name": "UUID format", "id": convert_to_uuid(org_id)},
            ]
            
            for format_info in formats_to_test:
                format_name = format_info["name"]
                format_id = format_info["id"]
                print(f"\n--- Testing with {format_name}: {format_id} ---")
                
                # Check if the organization exists
                org_url = f"{BASE_URL}/api/organizations/{format_id}/"
                print(f"Testing organization endpoint: {org_url}")
                org_response = requests.get(org_url, headers=headers)
                print(f"Organization response: {org_response.status_code}")
                
                if org_response.status_code == 200:
                    print(f"Organization data: {json.dumps(org_response.json(), indent=2)}")
                elif org_response.status_code == 404:
                    print("Organization endpoint doesn't exist")
                else:
                    print(f"Error accessing organization: {org_response.text}")
                
                # Test roles endpoint
                roles_url = f"{BASE_URL}/api/orgs/{format_id}/roles/"
                print(f"Testing roles endpoint: {roles_url}")
                roles_response = requests.get(roles_url, headers=headers)
                print(f"Roles response: {roles_response.status_code}")
                
                if roles_response.status_code == 200:
                    print(f"Roles data: {json.dumps(roles_response.json(), indent=2)}")
                else:
                    print(f"Error accessing roles: {roles_response.text}")
                
                # Test memberships endpoint
                memberships_url = f"{BASE_URL}/api/orgs/{format_id}/memberships/"
                print(f"Testing memberships endpoint: {memberships_url}")
                memberships_response = requests.get(memberships_url, headers=headers)
                print(f"Memberships response: {memberships_response.status_code}")
                
                if memberships_response.status_code == 200:
                    print(f"Memberships data: {json.dumps(memberships_response.json(), indent=2)}")
                else:
                    print(f"Error accessing memberships: {memberships_response.text}")
    else:
        print(f"Failed to get user info: {user_response.text}")

if __name__ == "__main__":
    debug_organization_issue() 