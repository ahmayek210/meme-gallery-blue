import { useEffect, useMemo, useRef, useState } from 'react'
import { api } from './api'
import { copyImageAsPng } from './clipboard'
import type { Meme } from './types'

const favoriteKey = (id: string) => 'meme-favorite-' + id
function getFavorites(): string[] {
  try {
    const ids: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith('meme-favorite-') && localStorage.getItem(key) === '1') {
        ids.push(key.slice('meme-favorite-'.length))
      }
    }
    return ids
  } catch { return [] }
}

export default function App() {
  const [memes, setMemes] = useState<Meme[]>([])
  const [favorites, setFavorites] = useState<string[]>(getFavorites)
  const [onlyFavorites, setOnlyFavorites] = useState(false)
  const [toast, setToast] = useState('')
  const [busy, setBusy] = useState('')
  const [uploadOpen, setUploadOpen] = useState(false)
  const [copyHelp, setCopyHelp] = useState<Meme | null>(null)
  const [loading, setLoading] = useState(true)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const show = (message: string) => {
    if (timer.current) clearTimeout(timer.current)
    setToast(message)
    timer.current = setTimeout(() => setToast(''), 2800)
  }
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])
  useEffect(() => {
    let active = true
    api.memes().then(({ memes: data }) => { if (active) setMemes(data) })
      .catch(() => { if (active) show('Galeri yüklenemedi. Sayfayı yenile.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const visible = useMemo(
    () => onlyFavorites ? memes.filter(item => favorites.includes(item.id)) : memes,
    [memes, favorites, onlyFavorites]
  )

  const toggleFavorite = (id: string) => {
    setFavorites(previous => {
      const selected = !previous.includes(id)
      try { localStorage.setItem(favoriteKey(id), selected ? '1' : '0') } catch { /* Private browsing */ }
      return selected ? [...previous, id] : previous.filter(item => item !== id)
    })
  }

  const copy = async (meme: Meme) => {
    if (busy) return
    setBusy(meme.id)
    try {
      await copyImageAsPng(meme.imageUrl, api.imageProxyUrl(meme.id))
      void api.copy(meme.id).catch(() => {})
      show('Fotoğraf kopyalandı!')
    } catch { setCopyHelp(meme) }
    finally { setBusy('') }
  }

  const remove = async (id: string) => {
    if (busy || !window.confirm('Bu fotoğraf kalıcı olarak silinsin mi?')) return
    setBusy('delete:' + id)
    try {
      await api.remove(id)
      setMemes(previous => previous.filter(item => item.id !== id))
      show('Fotoğraf silindi.')
    } catch { show('Fotoğraf silinemedi.') }
    finally { setBusy('') }
  }

  const upload = async (files: FileList | File[]) => {
    if (busy) return
    const selected = Array.from(files)
    const types = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif'])
    const accepted = selected.filter(file => types.has(file.type) && file.size > 0 && file.size <= 12 * 1024 * 1024)
    if (!accepted.length) return show('JPEG, PNG, WebP veya GIF seç (en fazla 12 MB).')
    setBusy('upload')
    let count = 0
    try {
      for (const file of accepted) {
        const { meme } = await api.upload(file)
        setMemes(previous => [meme, ...previous])
        count++
      }
      setUploadOpen(false)
      show(count + ' fotoğraf eklendi.')
    } catch { show(count ? count + ' fotoğraf eklendi, diğerleri yüklenemedi.' : 'Yükleme başarısız.') }
    finally { setBusy('') }
  }

  return <main className="app">
    <header className="topbar">
      <a className="brand" href="./" aria-label="blup ana sayfa"><span className="brand-mark">◒</span>blup</a>
      <nav className="actions" aria-label="Galeri işlemleri">
        <button type="button" className={'action' + (onlyFavorites ? ' selected' : '')}
          aria-pressed={onlyFavorites} aria-label={onlyFavorites ? 'Tüm fotoğrafları göster' : 'Favorileri göster'}
          onClick={() => setOnlyFavorites(value => !value)}>♥</button>
        <button type="button" className="action add" aria-label="Fotoğraf ekle"
          onClick={() => setUploadOpen(true)}>+</button>
      </nav>
    </header>
    <section className="gallery" aria-label="Fotoğraflar">
      {loading ? Array.from({ length: 10 }, (_, index) => <div className="skeleton" key={index}/>) :
        visible.map(meme => <MemeCard key={meme.id} meme={meme} favorite={favorites.includes(meme.id)}
          copying={busy === meme.id} onCopy={() => void copy(meme)}
          onFavorite={() => toggleFavorite(meme.id)} onDelete={() => void remove(meme.id)}/>)}
    </section>
    {!loading && !visible.length && <p className="empty">
      {onlyFavorites ? 'Henüz favorin yok.' : 'Henüz fotoğraf yok. + ile ekle.'}
    </p>}
    {toast && <div className="toast" role="status">{toast}</div>}
    {uploadOpen && <Uploader busy={busy === 'upload'} onClose={() => { if (!busy) setUploadOpen(false) }} onFiles={upload}/>}
    {copyHelp && <div className="overlay" onClick={() => setCopyHelp(null)}>
      <section className="dialog" role="dialog" aria-modal="true" aria-label="Kopyalama yardımı"
        onClick={event => event.stopPropagation()}>
        <button type="button" className="close" aria-label="Kapat" onClick={() => setCopyHelp(null)}>×</button>
        <h2>Fotoğrafı kopyala</h2>
        <p>Tarayıcı otomatik kopyalamaya izin vermedi. Fotoğrafı aç, telefonda üzerine basılı tutup <strong>Kopyala</strong> veya <strong>Fotoğraflara Kaydet</strong> seç.</p>
        <a className="primary-link" href={copyHelp.imageUrl} target="_blank" rel="noopener noreferrer">Fotoğrafı aç</a>
      </section>
    </div>}
  </main>
}

function MemeCard({ meme, favorite, copying, onCopy, onFavorite, onDelete }: {
  meme: Meme; favorite: boolean; copying: boolean; onCopy: () => void; onFavorite: () => void; onDelete: () => void
}) {
  const [failed, setFailed] = useState(false)
  const [menu, setMenu] = useState(false)
  return <article className="card">
    <button type="button" className="image" onClick={onCopy} aria-label="Fotoğrafı panoya kopyala">
      {failed ? <span className="broken">Fotoğraf yüklenemedi</span> :
        <img src={meme.imageUrl} alt="Galeri fotoğrafı" loading="lazy" decoding="async" onError={() => setFailed(true)}/>}
      {copying && <span className="copy-state">Kopyalanıyor…</span>}
    </button>
    <button type="button" className={'heart' + (favorite ? ' liked' : '')}
      aria-label={favorite ? 'Favorilerden çıkar' : 'Favorilere ekle'} aria-pressed={favorite}
      onClick={onFavorite}>♥</button>
    <button type="button" className="more" aria-label="Diğer işlemler"
      aria-expanded={menu} onClick={() => setMenu(value => !value)}>•••</button>
    {menu && <button type="button" className="delete-menu" onClick={onDelete}>Sil</button>}
  </article>
}

function Uploader({ onClose, onFiles, busy }: { onClose: () => void; onFiles: (files: FileList | File[]) => void; busy: boolean }) {
  const [drag, setDrag] = useState(false)
  return <div className="overlay" onClick={onClose}>
    <section className="dialog" role="dialog" aria-modal="true" aria-label="Fotoğraf ekle"
      onClick={event => event.stopPropagation()}>
      <button className="close" type="button" aria-label="Kapat" disabled={busy} onClick={onClose}>×</button>
      <h2>Fotoğraf ekle</h2>
      <label className="upload-choice">
        Galeriden seç
        <input type="file" accept="image/*,.heic,.heif" multiple disabled={busy}
          onChange={event => { if (event.target.files?.length) void onFiles(event.target.files); event.target.value = '' }}/>
      </label>
      <label className="upload-choice secondary">
        Kamera ile çek
        <input type="file" accept="image/*" capture="environment" disabled={busy}
          onChange={event => { if (event.target.files?.length) void onFiles(event.target.files); event.target.value = '' }}/>
      </label>
      <div className={'dropzone' + (drag ? ' drag' : '')}
        onDragOver={event => { event.preventDefault(); setDrag(true) }}
        onDragLeave={() => setDrag(false)}
        onDrop={event => { event.preventDefault(); setDrag(false); if (!busy) void onFiles(event.dataTransfer.files) }}>
        {busy ? 'Yükleniyor…' : 'Bilgisayarda sürükleyip bırakabilirsin.'}
      </div>
    </section>
  </div>
}
