from django.db import migrations, connection
import logging

def backfill_memberships(apps, schema_editor):
    """
    Ensure every user who has a Profile.organization also has an equivalent
    active Membership record, to maintain access when Profile.organization is dropped.
    
    Uses raw SQL where needed to avoid Django ORM issues with schema changes.
    """
    Role = apps.get_model("teams", "Role")
    Membership = apps.get_model("teams", "Membership")
    
    # Get or create a default role for existing users
    try:
        default_role = Role.objects.get(name="Admin")
        print(f"Using existing '{default_role.name}' role for backfilled memberships")
    except Role.DoesNotExist:
        try:
            default_role = Role.objects.get(name="Member")
            print(f"Using existing '{default_role.name}' role for backfilled memberships")
        except Role.DoesNotExist:
            # Fallback to first role or create a basic Member role
            default_role = Role.objects.first()
            if not default_role:
                default_role = Role.objects.create(
                    name="Member", 
                    description="Basic member privileges",
                    permissions=["view_products", "view_team"]
                )
            print(f"Created/selected '{default_role.name}' role for backfilled memberships")
    
    created_count = 0
    existing_count = 0
    error_count = 0
    
    # Use raw SQL to get profiles with organization IDs to avoid ORM issues
    cursor = connection.cursor()
    cursor.execute("""
        SELECT p.id, p.user_id, p.organization_id 
        FROM accounts_profile p 
        WHERE p.organization_id IS NOT NULL
    """)
    profiles_with_org = cursor.fetchall()
    
    print(f"Found {len(profiles_with_org)} profiles with organizations")
    
    # Use raw SQL to get existing memberships to check against
    cursor.execute("""
        SELECT user_id, organization_id 
        FROM teams_membership
    """)
    existing_memberships = set((user_id, org_id) for user_id, org_id in cursor.fetchall())
    
    # For each profile with an organization
    for profile_id, user_id, org_id in profiles_with_org:
        try:
            # Check if membership already exists
            if (user_id, org_id) in existing_memberships:
                existing_count += 1
                print(f"Membership already exists for user {user_id} in organization {org_id}")
                continue
                
            # Create new membership with direct SQL to avoid ORM issues
            cursor.execute("""
                INSERT INTO teams_membership 
                (user_id, organization_id, role_id, status, invited_at, org_id) 
                VALUES (%s, %s, %s, %s, CURRENT_TIMESTAMP, NULL)
            """, [user_id, org_id, default_role.id, "active"])
            
            created_count += 1
            print(f"Created membership for user {user_id} in organization {org_id}")
                
        except Exception as e:
            error_count += 1
            print(f"Error creating membership for profile {profile_id}: {str(e)}")
    
    print(f"Backfill summary: {created_count} created, {existing_count} already existed, {error_count} errors")
    
    # Print extra debug info
    print("\nDirect SQL verification:")
    cursor.execute("SELECT COUNT(*) FROM accounts_profile WHERE organization_id IS NOT NULL")
    total_profiles_with_org = cursor.fetchone()[0]
    
    cursor.execute("""
        SELECT COUNT(DISTINCT user_id) 
        FROM teams_membership 
        WHERE status = 'active'
    """)
    total_users_with_membership = cursor.fetchone()[0]
    
    print(f"Verification: {total_profiles_with_org} profiles with organizations, {total_users_with_membership} users with active memberships")
    
    # Print org info for debugging
    cursor.execute("SELECT id, name FROM organizations_organization")
    print("\nOrganization IDs in the database:")
    for org_id, name in cursor.fetchall():
        print(f"Org ID: {org_id}, Name: {name}")


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0003_backfill_profiles"),
        ("teams", "0003_migrate_uuid_to_foreignkey"),
    ]
    operations = [
        migrations.RunPython(
            backfill_memberships,
            reverse_code=migrations.RunPython.noop
        ),
    ] 