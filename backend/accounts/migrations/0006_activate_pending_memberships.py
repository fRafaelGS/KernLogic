from django.db import migrations, connection

def activate_pending_memberships(apps, schema_editor):
    """
    Ensure all users with a Profile.organization have an active (not pending) membership
    """
    print("Starting activate_pending_memberships operation")
    
    # Use direct SQL to avoid any ORM issues
    cursor = connection.cursor()
    
    # Find all pending memberships for users who have a profile with an organization
    cursor.execute("""
        SELECT m.id, m.user_id, m.organization_id, u.email
        FROM teams_membership m
        JOIN accounts_user u ON m.user_id = u.id
        JOIN accounts_profile p ON p.user_id = m.user_id
        WHERE m.status = 'pending'
        AND p.organization_id = m.organization_id
    """)
    pending_memberships = cursor.fetchall()
    print(f"Found {len(pending_memberships)} pending memberships from users with profile.organization set")
    
    updated_count = 0
    error_count = 0
    
    # Update each pending membership to active
    for membership_id, user_id, org_id, email in pending_memberships:
        try:
            cursor.execute("""
                UPDATE teams_membership
                SET status = 'active'
                WHERE id = %s
            """, [membership_id])
            
            updated_count += 1
            print(f"Activated membership #{membership_id} for user {user_id} ({email}) in org {org_id}")
        except Exception as e:
            error_count += 1
            print(f"Error activating membership #{membership_id}: {str(e)}")
    
    print(f"Summary: {updated_count} memberships activated, {error_count} errors")
    
    # Verify final state
    cursor.execute("SELECT COUNT(*) FROM accounts_profile WHERE organization_id IS NOT NULL")
    profiles_with_org = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM teams_membership WHERE status = 'active'")
    active_memberships = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(DISTINCT user_id) FROM teams_membership WHERE status = 'active'")
    users_with_active = cursor.fetchone()[0]
    
    print(f"Verification: {profiles_with_org} profiles with organizations, {active_memberships} active memberships, {users_with_active} users with active membership")


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0005_fix_backfill_memberships"),
    ]
    operations = [
        migrations.RunPython(
            activate_pending_memberships,
            reverse_code=migrations.RunPython.noop
        ),
    ] 