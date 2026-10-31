/** Safari needs a promised image/png Blob inside ClipboardItem before awaiting fetch. */
export async function copyImageAsPng(imageUrl: string, proxyUrl?: string): Promise<void> {
  if (typeof ClipboardItem === 'undefined' || !navigator.clipboard?.write) {
    throw new Error('Görsel panosu desteklenmiyor.')
  }
  const png = (async (): Promise<Blob> => {
    for (const url of [imageUrl, proxyUrl].filter((value): value is string => !!value)) {
      try {
        const response = await fetch(url, { mode: 'cors' })
        if (!response.ok) continue
        const source = await response.blob()
        if (source.type === 'image/png') return source
        return await toPng(source)
      } catch {
        // S3 public images may load as <img> but reject cross-origin fetch.
      }
    }
    throw new Error('Fotoğraf indirilemedi.')
  })()
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': png })])
}

async function toPng(source: Blob): Promise<Blob> {
  const url = URL.createObjectURL(source)
  try {
    const image = new Image()
    image.src = url
    await new Promise<void>((resolve, reject) => {
      if (image.complete && image.naturalWidth) return resolve()
      image.onload = () => resolve()
      image.onerror = () => reject(new Error('Görsel açılamadı.'))
    })
    const canvas = document.createElement('canvas')
    const ratio = Math.min(1, 4096 / Math.max(image.naturalWidth, image.naturalHeight))
    canvas.width = Math.max(1, Math.round(image.naturalWidth * ratio))
    canvas.height = Math.max(1, Math.round(image.naturalHeight * ratio))
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Canvas kullanılamıyor.')
    context.drawImage(image, 0, 0, canvas.width, canvas.height)
    const png = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'))
    if (!png) throw new Error('PNG oluşturulamadı.')
    return png
  } finally { URL.revokeObjectURL(url) }
}
