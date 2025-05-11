#!/usr/bin/env python
"""
Script to fix migration issues with attribute types.
This script will:
1. Fake the problematic migrations
2. Apply the clean migration
"""
import os
import subprocess
import sys

def run_command(command):
    print(f"Running command: {command}")
    result = subprocess.run(command, shell=True, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"Error running command: {command}")
        print(f"STDOUT: {result.stdout}")
        print(f"STDERR: {result.stderr}")
        return False
    print(f"Success: {result.stdout}")
    return True

def fix_migrations():
    # Set Django settings module environment variable
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'kernlogic.settings')
    
    # 1. Fake the problematic migrations
    if not run_command("python manage.py migrate products 10013_merge_0018_10012"):
        return False
        
    # 2. Fake the problematic migrations
    if not run_command("python manage.py migrate products 10014_add_new_attribute_types --fake"):
        return False
    
    if not run_command("python manage.py migrate products 10015_add_new_attribute_types_clean --fake"):
        return False
    
    # 3. Apply the clean migration
    if not run_command("python manage.py migrate products 10016_add_attribute_types_fixed"):
        return False
    
    # 4. Apply any remaining migrations
    if not run_command("python manage.py migrate products"):
        return False
    
    return True

if __name__ == "__main__":
    if fix_migrations():
        print("Migration fixed successfully!")
    else:
        print("Failed to fix migration.")
        sys.exit(1) 