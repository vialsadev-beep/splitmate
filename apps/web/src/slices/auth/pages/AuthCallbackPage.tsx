import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '../store/auth.store'
import { apiClient } from '@/shared/lib/api-client'
import { PageLoader } from '@/shared/components/LoadingSpinner'
import type { UserResponse } from '@splitmate/shared'

export default function AuthCallbackPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  useEffect(() => {
    const token = searchParams.get('token')
    if (!token) {
      navigate('/login?error=oauth_failed', { replace: true })
      return
    }

    // Con el access token obtenemos el perfil
    useAuthStore.getState().setAccessToken(token)

    apiClient
      .get<{ data: UserResponse }>('/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then(({ data }) => {
        useAuthStore.getState().setAuth(data.data, token)
        navigate('/groups', { replace: true })
      })
      .catch(() => {
        navigate('/login?error=oauth_failed', { replace: true })
      })
  }, [navigate, searchParams])

  return <PageLoader />
}
