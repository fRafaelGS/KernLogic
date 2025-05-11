#!/usr/bin/env python
"""
Script to show PostgreSQL commands to fix test database permissions
"""

# Database credentials
DB_NAME = "kernlogic_dev"
USER = "kiwon"
PASSWORD = "Nadaaver93!"  # Note: Including password in script is for demonstration only
TEST_DB_NAME = f"test_{DB_NAME}"

# SQL commands to run as postgres superuser
commands = [
    f"-- Connect to PostgreSQL as superuser",
    f"psql -U postgres",
    f"",
    f"-- Create test database if it doesn't exist",
    f"CREATE DATABASE {TEST_DB_NAME} WITH TEMPLATE=template0 OWNER={USER};",
    f"",
    f"-- Grant required permissions",
    f"ALTER USER {USER} CREATEDB;",
    f"GRANT ALL PRIVILEGES ON DATABASE {TEST_DB_NAME} TO {USER};",
    f"",
    f"-- If the test database already exists:",
    f"ALTER DATABASE {TEST_DB_NAME} OWNER TO {USER};",
    f"\\c {TEST_DB_NAME}",
    f"GRANT ALL PRIVILEGES ON SCHEMA public TO {USER};",
    f"GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO {USER};",
    f"GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO {USER};",
    f"GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO {USER};",
]

print("=== Run these commands to fix test database permissions ===")
for cmd in commands:
    print(cmd)
print("================================================================") 