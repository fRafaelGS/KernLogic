<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Field Schema Test</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
        }
        pre {
            background-color: #f5f5f5;
            padding: 15px;
            border-radius: 5px;
            overflow-x: auto;
        }
        button {
            padding: 8px 16px;
            background-color: #4CAF50;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            margin-bottom: 20px;
        }
        button:hover {
            background-color: #45a049;
        }
        #result {
            margin-top: 20px;
        }
    </style>
</head>
<body>
    <h1>Field Schema API Test</h1>
    
    <div>
        <h2>Test Authentication</h2>
        <form id="loginForm">
            <div>
                <label for="email">Email:</label>
                <input type="email" id="email" value="rgarciasaraiva@gmail.com" required>
            </div>
            <div style="margin-top: 10px;">
                <label for="password">Password:</label>
                <input type="password" id="password" value="Nadaaver93!" required>
            </div>
            <button type="submit" style="margin-top: 10px;">Login</button>
        </form>
    </div>
    
    <div id="apiTest" style="display: none;">
        <h2>Test Field Schema API</h2>
        <button id="testApiBtn">Test Field Schema API</button>
    </div>
    
    <div id="result"></div>
    
    <script>
        document.getElementById('loginForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const resultDiv = document.getElementById('result');
            
            resultDiv.innerHTML = '<p>Logging in...</p>';
            
            try {
                const response = await fetch('http://localhost:8000/api/token/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ email, password })
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    localStorage.setItem('accessToken', data.access);
                    localStorage.setItem('refreshToken', data.refresh);
                    
                    resultDiv.innerHTML = '<p>Login successful! Access token stored in localStorage.</p>';
                    document.getElementById('apiTest').style.display = 'block';
                } else {
                    resultDiv.innerHTML = `<p>Login failed: ${data.detail || JSON.stringify(data)}</p>`;
                }
            } catch (error) {
                resultDiv.innerHTML = `<p>Error: ${error.message}</p>`;
            }
        });
        
        document.getElementById('testApiBtn').addEventListener('click', async function() {
            const resultDiv = document.getElementById('result');
            const accessToken = localStorage.getItem('accessToken');
            
            if (!accessToken) {
                resultDiv.innerHTML = '<p>No access token found. Please login first.</p>';
                return;
            }
            
            resultDiv.innerHTML = '<p>Fetching field schema...</p>';
            
            try {
                // Test both endpoints
                const endpoints = [
                    '/api/field-schema/',
                    '/api/imports/field-schema/'
                ];
                
                let results = '';
                
                for (const endpoint of endpoints) {
                    results += `<h3>Testing: ${endpoint}</h3>`;
                    
                    try {
                        const response = await fetch(`http://localhost:8000${endpoint}`, {
                            method: 'GET',
                            headers: {
                                'Authorization': `Bearer ${accessToken}`
                            }
                        });
                        
                        if (response.ok) {
                            const data = await response.json();
                            results += `<p>Status: ${response.status} (Success)</p>`;
                            results += `<pre>${JSON.stringify(data, null, 2)}</pre>`;
                        } else {
                            const error = await response.json();
                            results += `<p>Status: ${response.status} (Failed)</p>`;
                            results += `<pre>${JSON.stringify(error, null, 2)}</pre>`;
                        }
                    } catch (error) {
                        results += `<p>Error: ${error.message}</p>`;
                    }
                    
                    results += '<hr>';
                }
                
                resultDiv.innerHTML = results;
            } catch (error) {
                resultDiv.innerHTML = `<p>Error: ${error.message}</p>`;
            }
        });
    </script>
</body>
</html> 