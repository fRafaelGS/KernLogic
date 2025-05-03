"""
Script to convert organization UUIDs to integers using direct SQL commands.
This avoids Django's migration system which is causing issues with our schema changes.
"""

import uuid
import sqlite3
import os

# Get the absolute path to the database file
DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'db.sqlite3')

# Connect to the database
conn = sqlite3.connect(DB_PATH)
conn.row_factory = sqlite3.Row  # This enables column access by name
cursor = conn.cursor()

# Define the tables and their foreign key columns that refer to organizations
tables_with_org_fk = [
    ('accounts_profile', 'organization_id'),
    ('products_product', 'organization_id'),
    ('products_productimage', 'organization_id'),
    ('products_productrelation', 'organization_id'),
    ('products_activity', 'organization_id'),
    ('products_productasset', 'organization_id'),
    ('products_productevent', 'organization_id'),
    ('products_attribute', 'organization_id'),
    ('products_attributevalue', 'organization_id'),
    ('products_attributegroup', 'organization_id')
]

def print_org_table_info():
    """Print information about the organization table"""
    print("\nOrganization table info:")
    cursor.execute("PRAGMA table_info(organizations_organization)")
    columns = cursor.fetchall()
    for col in columns:
        print(f"  {col['name']}: {col['type']} (PK: {col['pk']})")
    
    print("\nSample organizations:")
    cursor.execute("SELECT * FROM organizations_organization LIMIT 5")
    orgs = cursor.fetchall()
    for org in orgs:
        # Check if uuid column exists
        uuid_val = org['uuid'] if 'uuid' in org.keys() else 'N/A'
        print(f"  ID: {org['id']}, Name: {org['name']}, UUID: {uuid_val}")

def print_fk_tables_info():
    """Print information about the foreign key tables"""
    print("\nForeign key tables that reference organizations:")
    for table, fk_col in tables_with_org_fk:
        try:
            cursor.execute(f"SELECT COUNT(*) as count FROM {table}")
            count = cursor.fetchone()['count']
            
            cursor.execute(f"SELECT COUNT(*) as count FROM {table} WHERE {fk_col} IS NOT NULL")
            non_null_count = cursor.fetchone()['count']
            
            print(f"  {table}.{fk_col}: {non_null_count}/{count} entries have non-NULL values")
            
            if non_null_count > 0:
                cursor.execute(f"SELECT {fk_col} FROM {table} WHERE {fk_col} IS NOT NULL LIMIT 3")
                samples = cursor.fetchall()
                print(f"    Sample values: {', '.join(str(sample[fk_col]) for sample in samples)}")
        except sqlite3.OperationalError as e:
            print(f"  Error querying {table}: {e}")

def create_new_organization_table():
    """Create a new organization table with integer IDs"""
    print("\nCreating new organization table with integer IDs...")
    
    # Create a backup of the original table
    cursor.execute("""
        CREATE TABLE organizations_organization_backup AS 
        SELECT * FROM organizations_organization
    """)
    print("  Created backup table 'organizations_organization_backup'")
    
    # Drop the original table
    cursor.execute("DROP TABLE organizations_organization")
    print("  Dropped original table 'organizations_organization'")
    
    # Create new table with integer primary key
    cursor.execute("""
        CREATE TABLE organizations_organization (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name VARCHAR(120) UNIQUE NOT NULL,
            created_at DATETIME NOT NULL,
            uuid VARCHAR(36) UNIQUE NULL
        )
    """)
    print("  Created new table 'organizations_organization' with integer primary key")
    
    # Create a mapping of old UUIDs to new integer IDs
    uuid_to_int = {}
    cursor.execute("SELECT id, name, created_at FROM organizations_organization_backup")
    orgs = cursor.fetchall()
    
    # Insert organizations into the new table
    for org in orgs:
        old_id = org['id']
        name = org['name']
        created_at = org['created_at']
        
        # Insert into new table and get the new auto-incremented ID
        cursor.execute(
            "INSERT INTO organizations_organization (name, created_at, uuid) VALUES (?, ?, ?)",
            (name, created_at, str(uuid.uuid4()))
        )
        new_id = cursor.lastrowid
        
        # Store mapping
        uuid_to_int[old_id] = new_id
        print(f"  Created organization: {new_id} (was {old_id})")
    
    return uuid_to_int

def update_foreign_keys(uuid_to_int):
    """Update all foreign keys that reference organizations"""
    print("\nUpdating foreign keys...")
    
    for table, fk_col in tables_with_org_fk:
        try:
            updated_count = 0
            # Get all rows with non-NULL foreign keys
            cursor.execute(f"SELECT id, {fk_col} FROM {table} WHERE {fk_col} IS NOT NULL")
            rows = cursor.fetchall()
            
            for row in rows:
                row_id = row['id']
                old_fk = row[fk_col]
                
                if old_fk in uuid_to_int:
                    new_fk = uuid_to_int[old_fk]
                    cursor.execute(f"UPDATE {table} SET {fk_col} = ? WHERE id = ?", (new_fk, row_id))
                    updated_count += 1
            
            print(f"  Updated {updated_count}/{len(rows)} rows in {table}")
        except sqlite3.OperationalError as e:
            print(f"  Error updating {table}: {e}")

def drop_backup_table():
    """Drop the backup table"""
    cursor.execute("DROP TABLE organizations_organization_backup")
    print("\nDropped backup table")

def main():
    print("Starting conversion of organization UUIDs to integers...")
    
    # Analyze the current database state
    print_org_table_info()
    print_fk_tables_info()
    
    # Begin transaction
    conn.execute("BEGIN TRANSACTION")
    
    try:
        # Create new table and get mapping
        uuid_to_int = create_new_organization_table()
        
        # Update foreign keys
        update_foreign_keys(uuid_to_int)
        
        # Drop backup table
        drop_backup_table()
        
        # Commit the transaction
        conn.commit()
        print("\nTransaction committed. Conversion complete!")
    except Exception as e:
        # Rollback on error
        conn.rollback()
        print(f"\nError during conversion: {e}")
        print("Transaction rolled back. No changes were made.")
    finally:
        # Close the connection
        conn.close()

if __name__ == "__main__":
    main() 