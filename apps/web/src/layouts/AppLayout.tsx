import { Outlet } from 'react-router-dom'
import { Sidebar } from '@/components/Sidebar'
import { Header } from '@/components/Header'

export function AppLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-fleet-black">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
