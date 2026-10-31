import type { Meme } from './types'

const base = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
const url = (path: string) => `${base}${path}`
async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(url(path), { ...init, headers: { 'content-type': 'application/json', ...init.headers } })
  if (!response.ok) { const error = new Error((await response.json().catch(() => ({ message: 'Bir şeyler ters gitti.' }))).message) as Error & { status?: number }; error.status = response.status; throw error }
  return response.json() as Promise<T>
}
export const api = {
  memes: () => request<{ memes: Meme[] }>('/memes'),
  copy: (id: string) => request(`/memes/${id}/copies`, { method: 'POST' }),
  upload: async (file: File) => {
    const form = new FormData(); form.append('file', file)
    const response = await fetch(url('/uploads'), { method: 'POST', body: form })
    if (!response.ok) throw new Error('Yükleme tamamlanamadı.')
    return response.json() as Promise<{ meme: Meme }>
  },
  remove: (id: string) => request(`/memes/${id}`, { method: 'DELETE' })
}
