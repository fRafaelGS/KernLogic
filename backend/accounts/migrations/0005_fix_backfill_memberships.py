from django.db import migrations, connection

def fix_backfill_memberships(apps, schema_editor):
    """
    Ensure every user who has a Profile.organization gets an equivalent
    active Membership record, to maintain access when Profile.organization is dropped.
    
    This is a fix for the previous backfill attempt.
    """
    print("Starting fix_backfill_memberships operation")
    
    # Use direct SQL to avoid any ORM issues
    cursor = connection.cursor()
    
    # First, get information about available roles
    cursor.execute("SELECT id, name FROM teams_role")
    roles = cursor.fetchall()
    print(f"Available roles: {[r[1] for r in roles]}")
    
    # Try to find Admin role, then Member role, or use the first available
    admin_role_id = None
    member_role_id = None
    first_role_id = None
    
    for role_id, role_name in roles:
        if first_role_id is None:
            first_role_id = role_id
        if role_name == 'Admin':
            admin_role_id = role_id
        elif role_name == 'Member':
            member_role_id = role_id
    
    # Use Admin role if available, otherwise Member, otherwise first role
    default_role_id = admin_role_id or member_role_id or first_role_id
    if default_role_id is None:
        # If no roles exist, create a basic Member role
        print("No roles found. Creating basic Member role.")
        cursor.execute("""
            INSERT INTO teams_role (name, description, permissions)
            VALUES (%s, %s, %s)
            RETURNING id
        """, ["Member", "Basic member privileges", "[]"])
        default_role_id = cursor.fetchone()[0]
    
    print(f"Using role ID {default_role_id} for new memberships")
    
    # Get all profiles that have an organization
    cursor.execute("""
        SELECT p.id, p.user_id, p.organization_id 
        FROM accounts_profile p 
        WHERE p.organization_id IS NOT NULL
    """)
    profiles_with_org = cursor.fetchall()
    print(f"Found {len(profiles_with_org)} profiles with organizations")
    
    # Get existing memberships to avoid duplicates
    cursor.execute("""
        SELECT user_id, organization_id 
        FROM teams_membership
    """)
    existing_memberships = set((user_id, org_id) for user_id, org_id in cursor.fetchall())
    print(f"Found {len(existing_memberships)} existing memberships")
    
    created_count = 0
    skipped_count = 0
    
    # For each profile with an organization
    for profile_id, user_id, org_id in profiles_with_org:
        if (user_id, org_id) in existing_memberships:
            print(f"Skipping: User {user_id} already has membership in organization {org_id}")
            skipped_count += 1
            continue
        
        try:
            # Create new membership with direct SQL
            cursor.execute("""
                INSERT INTO teams_membership 
                (user_id, organization_id, role_id, status, invited_at) 
                VALUES (%s, %s, %s, %s, CURRENT_TIMESTAMP)
            """, [user_id, org_id, default_role_id, "active"])
            
            created_count += 1
            print(f"Created membership for User {user_id} in Organization {org_id}")
        except Exception as e:
            print(f"Error creating membership for Profile {profile_id}: {str(e)}")
    
    print(f"Summary: {created_count} memberships created, {skipped_count} already existed")
    
    # Verify results
    cursor.execute("SELECT COUNT(*) FROM accounts_profile WHERE organization_id IS NOT NULL")
    total_profiles_with_org = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(DISTINCT user_id) FROM teams_membership WHERE status = 'active'")
    total_users_with_membership = cursor.fetchone()[0]
    
    print(f"Verification: {total_profiles_with_org} profiles with organizations, {total_users_with_membership} users with active memberships")
    
    # List all profiles with org for debugging
    cursor.execute("""
        SELECT p.id, p.user_id, p.organization_id, u.email
        FROM accounts_profile p
        JOIN accounts_user u ON p.user_id = u.id
        WHERE p.organization_id IS NOT NULL
    """)
    print("\nDetailed profile information:")
    for p_id, u_id, o_id, email in cursor.fetchall():
        cursor.execute("""
            SELECT COUNT(*) FROM teams_membership 
            WHERE user_id = %s AND organization_id = %s
        """, [u_id, o_id])
        membership_count = cursor.fetchone()[0]
        print(f"Profile {p_id}: User {u_id} ({email}) -> Org {o_id} (Memberships: {membership_count})")


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0004_backfill_memberships"),
    ]
    operations = [
        migrations.RunPython(
            fix_backfill_memberships,
            reverse_code=migrations.RunPython.noop
        ),
    ] 