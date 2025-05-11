#!/usr/bin/env python
"""
Script to fix test database permissions issues.

This script will generate SQL commands to grant proper permissions
for the test database using the provided credentials.
"""
import sys

def generate_permission_commands(db_name, user, password):
    """Generate SQL commands to fix permissions"""
    test_db_name = f"test_{db_name}"
    
    commands = [
        f"-- Run these commands as a database superuser (postgres)",
        f"-- Connect to PostgreSQL: psql -U postgres",
        f"",
        f"-- Create test database if it doesn't exist",
        f"CREATE DATABASE {test_db_name} WITH TEMPLATE=template0 OWNER={user};",
        f"",
        f"-- Grant required permissions",
        f"ALTER USER {user} CREATEDB;",
        f"GRANT ALL PRIVILEGES ON DATABASE {test_db_name} TO {user};",
        f"",
        f"-- If the test database already exists:",
        f"ALTER DATABASE {test_db_name} OWNER TO {user};",
        f"\\c {test_db_name}",
        f"GRANT ALL PRIVILEGES ON SCHEMA public TO {user};",
        f"GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO {user};",
        f"GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO {user};",
        f"GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO {user};",
    ]
    
    return commands

def main():
    """Main function"""
    # Use the provided credentials
    db_name = "kernlogic_dev"
    user = "kiwon"
    password = "Nadaaver93!"  # Note: Including password in script is for demonstration only
    
    commands = generate_permission_commands(db_name, user, password)
    
    print("=== Run the following commands to fix test database permissions ===")
    for cmd in commands:
        print(cmd)
    print("================================================================")
    return 0

if __name__ == "__main__":
    sys.exit(main()) 