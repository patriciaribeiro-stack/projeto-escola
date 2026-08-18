export const SESSION_STORAGE_KEY = 'escola-app-session'

function getToken(): string | null {
  const raw = localStorage.getItem(SESSION_STORAGE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw).token ?? null
  } catch {
    return null
  }
}

const base = '/api'

async function req<T>(method: string, url: string, body?: unknown): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {}
  if (body) headers['Content-Type'] = 'application/json'
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(base + url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
  if (res.status === 401 && !url.startsWith('/sessions')) {
    localStorage.removeItem(SESSION_STORAGE_KEY)
    window.location.href = '/'
    throw new Error('Sessão expirada')
  }
  if (!res.ok) {
    const payload = await res.json().catch(() => ({ erro: res.statusText }))
    throw new Error(payload.erro ?? 'Erro na requisição')
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

export const api = {
  get: <T>(url: string) => req<T>('GET', url),
  post: <T>(url: string, body?: unknown) => req<T>('POST', url, body ?? {}),
  patch: <T>(url: string, body?: unknown) => req<T>('PATCH', url, body ?? {}),
  put: <T>(url: string, body?: unknown) => req<T>('PUT', url, body ?? {}),
  delete: <T>(url: string) => req<T>('DELETE', url),
}

export function qs(params: Record<string, string | undefined>) {
  const usp = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) if (v) usp.set(k, v)
  const s = usp.toString()
  return s ? `?${s}` : ''
}
