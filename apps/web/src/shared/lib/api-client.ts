import axios, { type AxiosError, type AxiosResponse } from 'axios'
import { useAuthStore } from '@/slices/auth/store/auth.store'

// Tipo normalizado para todos los errores de API
export interface ApiError {
  code: string
  message: string
  details?: Record<string, unknown>
  requestId?: string
  status: number
}

export function isApiError(err: unknown): err is AxiosError<{ error: ApiError }> {
  return axios.isAxiosError(err)
}

export function getApiError(err: unknown): ApiError | null {
  if (!isApiError(err) || !err.response) return null
  const body = err.response.data?.error
  return body
    ? {
        ...body,
        requestId: (err.response.headers['x-request-id'] as string) ?? body.requestId,
        status: err.response.status,
      }
    : null
}

export const apiClient = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
})

// ─── Request interceptor: añade access token ─────────────────
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// ─── Response interceptor: renovación automática de token ────
let isRefreshing = false
let pendingRequests: Array<(token: string) => void> = []

function resolveQueue(token: string) {
  pendingRequests.forEach((cb) => cb(token))
  pendingRequests = []
}

apiClient.interceptors.response.use(
  (res: AxiosResponse) => res,
  async (error: AxiosError) => {
    const originalRequest = error.config as typeof error.config & { _retry?: boolean }

    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error)
    }

    if (isRefreshing) {
      return new Promise<string>((resolve) => {
        pendingRequests.push(resolve)
      }).then((token) => {
        originalRequest.headers!.Authorization = `Bearer ${token}`
        return apiClient(originalRequest)
      })
    }

    originalRequest._retry = true
    isRefreshing = true

    try {
      const { data } = await axios.post<{ data: { accessToken: string } }>(
        '/api/v1/auth/refresh',
        {},
        { withCredentials: true },
      )
      const newToken = data.data.accessToken
      useAuthStore.getState().setAccessToken(newToken)
      resolveQueue(newToken)
      originalRequest.headers!.Authorization = `Bearer ${newToken}`
      return apiClient(originalRequest)
    } catch {
      useAuthStore.getState().logout()
      resolveQueue('')
      window.location.href = '/login'
      return Promise.reject(error)
    } finally {
      isRefreshing = false
    }
  },
)
