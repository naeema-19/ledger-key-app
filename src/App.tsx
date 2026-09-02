import { useAuth } from './context/AuthContext'
import Auth from './pages/Auth'
import OwnerApp from './pages/OwnerApp'
import TenantApp from './pages/TenantApp'

export default function App() {
  const { session, profile, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3">
        <div className="w-9 h-9 border-[3px] border-brass border-t-transparent rounded-full animate-spin" />
        <p className="text-inksoft text-sm">Opening the ledger…</p>
      </div>
    )
  }

  if (!session) return <Auth />

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-center">
        <div>
          <p className="text-inksoft mb-2">Your account isn't linked to a tenant record yet.</p>
          <p className="text-sm text-inksoft">Ask your landlord to add you as a tenant using this email address, then refresh.</p>
        </div>
      </div>
    )
  }

  return profile.role === 'owner' ? <OwnerApp /> : <TenantApp />
}
