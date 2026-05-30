import { Outlet } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import { useEffect } from 'react'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import { cn } from '../../utils/helpers'

export default function Layout() {
  const { sidebarCollapsed, theme } = useSelector((state) => state.ui)

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [theme])

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">
      <Sidebar />
      <div className={cn(
        'flex flex-1 flex-col overflow-hidden transition-all duration-300',
        sidebarCollapsed ? 'ml-16' : 'ml-64'
      )}>
        <Topbar />
        <main className="flex-1 overflow-y-auto p-4">
          <div className="mx-auto max-w-screen-xl animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
