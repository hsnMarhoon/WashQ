import { useEffect } from 'react'

import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useApp } from './store/AppStore.jsx'
import { AppLayout, ROLE_HOME, RequireRole } from './components/Layout.jsx'
import { SignIn } from './pages/auth/SignIn.jsx'
import { SignUp } from './pages/auth/SignUp.jsx'
import { ResetPassword } from './pages/auth/ResetPassword.jsx'
import { MachineBoard } from './pages/student/MachineBoard.jsx'
import { MyBookings } from './pages/student/MyBookings.jsx'
import { QueuePage } from './pages/student/QueuePage.jsx'
import { CheckIn } from './pages/student/CheckIn.jsx'
import { ReportProblem } from './pages/student/ReportProblem.jsx'
import { History } from './pages/student/History.jsx'
import { NotificationSettings } from './pages/student/Settings.jsx'
import { AdminBuildings } from './pages/admin/AdminBuildings.jsx'
import { AdminMachines } from './pages/admin/AdminMachines.jsx'
import { AdminUsers } from './pages/admin/AdminUsers.jsx'
import { AdminRules } from './pages/admin/AdminRules.jsx'
import { AdminStats } from './pages/admin/AdminStats.jsx'
import { AdminReports } from './pages/admin/AdminReports.jsx'
import { Button } from './components/ui.jsx'
import { Logo } from './components/Icons.jsx'


function PublicOnly({ children }) {
  const { user } = useApp()
  if (user) return <Navigate to={ROLE_HOME[user.role]} replace />
  return children
}

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [pathname])
  return null
}

function NotFound() {
  const { user } = useApp()
  return (
    <div className="notfound">
      <Logo size={48} />
      <h1>Page not found - 404</h1>
      <p>The page you followed does not exist in this prototype.</p>
      <Button as="a" href={user ? ROLE_HOME[user.role] : '/signin'}>Go to WashQ</Button>
    </div>
  )
}

export function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<RoleHome />} />
        <Route path="/signin" element={<PublicOnly><SignIn /></PublicOnly>} />
        <Route path="/signup" element={<PublicOnly><SignUp /></PublicOnly>} />
        <Route path="/reset" element={<ResetPassword />} />

        <Route path="/app" element={<RequireRole role="student"><AppLayout /></RequireRole>}>
          <Route index element={<Navigate to="board" replace />} />
          <Route path="board" element={<MachineBoard />} />
          <Route path="bookings" element={<MyBookings />} />
          <Route path="queue" element={<QueuePage />} />
          <Route path="checkin" element={<CheckIn />} />
          <Route path="report" element={<ReportProblem />} />
          <Route path="history" element={<History />} />
          <Route path="settings" element={<NotificationSettings />} /> 
        </Route>
        {/*
        <Route path="/staff" element={<RequireRole role="staff"><AppLayout /></RequireRole>}>
          <Route index element={<Navigate to="overview" replace />} />
          <Route path="overview" element={<StaffOverview />} />
          <Route path="reports" element={<FaultReports />} />
          <Route path="machines" element={<StaffMachines />} />
          <Route path="live" element={<LiveRoom />} />
          <Route path="announcements" element={<Announcements />} />
          <Route path="inventory" element={<Inventory />} />
        </Route>
        */}

        <Route path="/admin" element={<RequireRole role="admin"><AppLayout /></RequireRole>}>
          <Route index element={<Navigate to="buildings" replace />} />
          <Route path="buildings" element={<AdminBuildings />} />
          <Route path="machines" element={<AdminMachines />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="rules" element={<AdminRules />} />
          <Route path="stats" element={<AdminStats />} />
          <Route path="reports" element={<AdminReports />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  )
}

function RoleHome() {
  const { user } = useApp()
  return <Navigate to={user ? ROLE_HOME[user.role] : '/signin'} replace />
}
