import os
import django

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

# Import models
from accounts.models import Profile, User
from teams.models import Membership

print('Profiles with organizations:')
for p in Profile.objects.exclude(organization__isnull=True):
    print(f'User {p.user.id} ({p.user.email}) -> Org {p.organization.id}')

print('\nActive memberships:')
for m in Membership.objects.filter(status='active'):
    print(f'User {m.user.id} ({m.user.email}) -> Org {m.organization.id}')

print('\nPending memberships:')
for m in Membership.objects.exclude(status='active'):
    print(f'User {m.user.id} ({m.user.email}) -> Org {m.organization.id} [Status: {m.status}]')

# Verify 
profiles_with_org = Profile.objects.exclude(organization__isnull=True).count()
active_memberships = Membership.objects.filter(status='active').count()
users_with_membership = Membership.objects.filter(status='active').values('user').distinct().count()

print(f'\nSummary:')
print(f'Profiles with organization: {profiles_with_org}')
print(f'Active memberships: {active_memberships}')
print(f'Users with active membership: {users_with_membership}')

# Check for missing memberships
print('\nChecking for profiles without corresponding memberships:')
for p in Profile.objects.exclude(organization__isnull=True):
    has_membership = Membership.objects.filter(
        user=p.user, 
        organization=p.organization,
        status='active'
    ).exists()
    if not has_membership:
        print(f'WARNING: User {p.user.id} ({p.user.email}) has profile.organization={p.organization.id} but no active membership') 