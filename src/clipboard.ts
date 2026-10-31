export async function copyImageAsPng(imageUrl: string): Promise<void> {
  if (!('ClipboardItem' in window) || !navigator.clipboard?.write) throw new Error('Tarayıcınız görsel kopyalamayı desteklemiyor.')
  // The promise is deliberately created inside ClipboardItem: Safari retains the click activation.
  const png = (async () => {
    const blob = await fetch(imageUrl, { mode: 'cors' }).then(r => { if (!r.ok) throw new Error('Görsel indirilemedi.'); return r.blob() })
    const bitmap = await createImageBitmap(blob)
    const canvas = document.createElement('canvas'); canvas.width = bitmap.width; canvas.height = bitmap.height
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0)
    const result = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'))
    bitmap.close(); if (!result) throw new Error('Görsel dönüştürülemedi.'); return result
  })()
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': png })])
}
