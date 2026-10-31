import type { Meme } from './types'

const base = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
const url = (path: string) => `${base}${path}`
const session = () => localStorage.getItem('meme-gallery-session') || ''
async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(url(path), { ...init, headers: { 'content-type': 'application/json', ...(session() ? { authorization: `Bearer ${session()}` } : {}), ...init.headers } })
  if (!response.ok) { const error = new Error((await response.json().catch(() => ({ message: 'Bir şeyler ters gitti.' }))).message) as Error & { status?: number }; error.status = response.status; throw error }
  return response.json() as Promise<T>
}
export const api = {
  memes: () => request<{ memes: Meme[] }>('/memes'),
  copy: (id: string) => request(`/memes/${id}/copies`, { method: 'POST' }),
  auth: async (password: string) => { const result = await request<{ token: string }>('/management/login', { method: 'POST', body: JSON.stringify({ password }) }); localStorage.setItem('meme-gallery-session', result.token) },
  logout: () => localStorage.removeItem('meme-gallery-session'),
  uploadIntent: (file: File) => request<{ id: string; uploadUrl: string; headers: Record<string, string>; imageUrl: string }>('/uploads/prepare', { method: 'POST', body: JSON.stringify({ name: file.name, type: file.type, size: file.size }) }),
  finalize: (id: string) => request<{ meme: Meme }>('/uploads/finalize', { method: 'POST', body: JSON.stringify({ id }) }),
  remove: (id: string) => request(`/memes/${id}`, { method: 'DELETE' })
}
