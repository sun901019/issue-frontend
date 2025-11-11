import axios, { AxiosHeaders } from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
})

const CSRF_SAFE_METHODS = /^(GET|HEAD|OPTIONS|TRACE)$/i

const getCsrfToken = () => {
  if (typeof document === 'undefined') return ''
  const match = document.cookie.match(/csrftoken=([^;]+)/)
  return match ? decodeURIComponent(match[1]) : ''
}

// Request interceptor
api.interceptors.request.use(
  (config) => {
    if (config.method && !CSRF_SAFE_METHODS.test(config.method)) {
      const csrfToken = getCsrfToken()
      if (csrfToken) {
        const headers = AxiosHeaders.from(config.headers || {})
        headers.set('X-CSRFToken', csrfToken)
        config.headers = headers
      }
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // 統一錯誤處理
    if (error.response) {
      console.error('API Error:', error.response.data)
    }
    return Promise.reject(error)
  }
)

export default api

