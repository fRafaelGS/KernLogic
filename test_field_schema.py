import requests
import json

def test_field_schema():
    # First get a token
    login_url = "http://localhost:8000/api/token/"
    login_data = {
        "email": "rgarciasaraiva@gmail.com",
        "password": "Nadaaver93!"
    }
    
    # Get token
    print("Getting authentication token...")
    response = requests.post(login_url, data=login_data)
    print(f"Login response code: {response.status_code}")
    if response.status_code != 200:
        print(f"Login failed with status {response.status_code}: {response.text}")
        return
    
    token_data = response.json()
    access_token = token_data.get("access")
    print(f"Authentication successful! Token: {access_token[:20]}...")
    
    # Test the field schema endpoint
    headers = {
        "Authorization": f"Bearer {access_token}"
    }
    
    # Try both URL patterns to see which one works
    urls_to_try = [
        "http://localhost:8000/api/imports/field-schema/",
        "http://localhost:8000/api/field-schema/",
    ]
    
    for url in urls_to_try:
        print(f"\nTesting URL: {url}")
        response = requests.get(url, headers=headers)
        
        print(f"Response status: {response.status_code}")
        print(f"Response headers: {response.headers}")
        
        if response.status_code == 200:
            print("Endpoint working!")
            print(json.dumps(response.json(), indent=2))
        else:
            print(f"Error: {response.text}")

if __name__ == "__main__":
    test_field_schema() 