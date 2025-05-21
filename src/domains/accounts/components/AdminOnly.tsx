import { useAuth } from '@/domains/app/providers/AuthContext'

interface AdminOnlyProps {
  children: React.ReactNode
}

export default function AdminOnly({ children }: AdminOnlyProps) {
  const { user, loading } = useAuth()
  console.log('AdminOnly user:', user, 'loading:', loading)
  if (loading) return <div className="flex h-screen items-center justify-center">Loading...</div>
  if (user?.role !== 'admin') return null
  return <>{children}</>
} 