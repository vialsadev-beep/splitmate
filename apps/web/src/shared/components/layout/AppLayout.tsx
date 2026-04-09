import { Outlet } from 'react-router-dom'
import { BottomNav } from './BottomNav'
import { TopBar } from './TopBar'

export function AppLayout() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <TopBar />

      <main className="flex-1 overflow-y-auto pb-20 pt-14">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <Outlet />
        </div>
      </main>

      <BottomNav />
    </div>
  )
}
