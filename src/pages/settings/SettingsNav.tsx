import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

export function SettingsNav() {
  const { t } = useTranslation()
  
  const navItems = [
    { label: t('settings.general'), path: '/app/settings' },
    { label: t('settings.teams'), path: '/app/settings/teams' },
    { label: t('settings.families'), path: '/app/settings/families' },
    { label: t('settings.attributes'), path: '/app/settings/attributes' },
    { label: t('settings.integrations'), path: '/app/settings/integrations' },
  ]
  
  return (
    <nav className="space-y-1 w-full">
      {navItems.map(item => (
        <NavLink
          key={item.path}
          to={item.path}
          className={({ isActive }) =>
            cn(
              'flex items-center px-4 py-3 text-sm rounded-md transition-colors',
              isActive
                ? 'bg-primary-50 text-primary-700 font-medium'
                : 'text-enterprise-600 hover:bg-enterprise-100'
            )
          }
          end={item.path === '/app/settings'}
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  )
} 