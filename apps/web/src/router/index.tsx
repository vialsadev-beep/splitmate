import { createBrowserRouter, Navigate } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { AppLayout } from '@/shared/components/layout/AppLayout'
import { PageLoader } from '@/shared/components/LoadingSpinner'
import { ProtectedRoute, GuestRoute } from './guards'

// Lazy load de slices para code splitting
const LoginPage = lazy(() => import('@/slices/auth/pages/LoginPage'))
const RegisterPage = lazy(() => import('@/slices/auth/pages/RegisterPage'))
const AuthCallbackPage = lazy(() => import('@/slices/auth/pages/AuthCallbackPage'))

const GroupsPage = lazy(() => import('@/slices/groups/pages/GroupsPage'))
const GroupDetailPage = lazy(() => import('@/slices/groups/pages/GroupDetailPage'))
const CreateGroupPage = lazy(() => import('@/slices/groups/pages/CreateGroupPage'))

const CreateExpensePage = lazy(() => import('@/slices/expenses/pages/CreateExpensePage'))
const EditExpensePage = lazy(() => import('@/slices/expenses/pages/EditExpensePage'))

const ProfilePage = lazy(() => import('@/slices/profile/pages/ProfilePage'))
const NotificationsPage = lazy(() => import('@/slices/notifications/pages/NotificationsPage'))
const JoinGroupPage = lazy(() => import('@/slices/groups/pages/JoinGroupPage'))

function S({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>
}

export const router = createBrowserRouter([
  // ─── Auth (guest only) ────────────────────────────────────
  {
    path: '/login',
    element: <GuestRoute><S><LoginPage /></S></GuestRoute>,
  },
  {
    path: '/register',
    element: <GuestRoute><S><RegisterPage /></S></GuestRoute>,
  },
  {
    path: '/auth/callback',
    element: <S><AuthCallbackPage /></S>,
  },

  // ─── App (protected) ──────────────────────────────────────
  {
    element: <ProtectedRoute><AppLayout /></ProtectedRoute>,
    children: [
      { index: true, element: <Navigate to="/groups" replace /> },

      // Groups
      { path: '/groups', element: <S><GroupsPage /></S> },
      { path: '/groups/new', element: <S><CreateGroupPage /></S> },
      { path: '/groups/:groupId', element: <S><GroupDetailPage /></S> },
      { path: '/groups/:groupId/expenses/new', element: <S><CreateExpensePage /></S> },
      { path: '/groups/:groupId/expenses/:expenseId/edit', element: <S><EditExpensePage /></S> },

      // Join group
      { path: '/join/:code', element: <S><JoinGroupPage /></S> },

      // Profile
      { path: '/profile', element: <S><ProfilePage /></S> },

      // Notifications
      { path: '/notifications', element: <S><NotificationsPage /></S> },
    ],
  },

  // ─── 404 ─────────────────────────────────────────────────
  { path: '*', element: <Navigate to="/groups" replace /> },
])
