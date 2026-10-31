import { Hono } from 'hono'
import { cors } from 'hono/cors'
import postgres from 'postgres'
import { DeleteObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const sql = postgres(process.env.DATABASE_URL!, { prepare: false })
const env = process.env as Record<string, string>
const app = new Hono()
const types = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif'])
const MAX = 12 * 1024 * 1024, bucket = 'memes'
const error = (c: any, message: string, status = 400) => c.json({ message }, status)
// Neon public-read URLs always include both the bucket and the stored object key.
const publicUrl = (key: string) => `${env.AWS_ENDPOINT_URL_S3.replace(/\/$/, '')}/${bucket}/${key}`
const s3 = () => new S3Client({ region: env.AWS_REGION, endpoint: env.AWS_ENDPOINT_URL_S3, forcePathStyle: true, credentials: { accessKeyId: env.AWS_ACCESS_KEY_ID, secretAccessKey: env.AWS_SECRET_ACCESS_KEY } })
app.use('*', cors({ origin: () => env.ALLOWED_ORIGIN || '*', allowHeaders: ['Content-Type'], allowMethods: ['GET', 'POST', 'DELETE', 'OPTIONS'], maxAge: 86400 }))
async function allow(c: any, action: string, limit: number) {
  const ip = c.req.header('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const [row] = await sql`INSERT INTO rate_limits(key,attempts,window_start) VALUES (${`${action}:${ip}`},1,now()) ON CONFLICT(key) DO UPDATE SET attempts=CASE WHEN rate_limits.window_start < now()-interval '10 minutes' THEN 1 ELSE rate_limits.attempts+1 END,window_start=CASE WHEN rate_limits.window_start < now()-interval '10 minutes' THEN now() ELSE rate_limits.window_start END RETURNING attempts`
  return row.attempts <= limit
}
app.get('/memes', async c => {
  const rows = await sql`SELECT m.id,m.storage_key,m.mime_type,m.created_at,COALESCE(sum(s.copies * power(2::float, -(current_date-s.day)::float/7)),0)+5*power(2::float,-date_part('epoch',now()-m.created_at)/86400/3) AS score FROM memes m LEFT JOIN daily_copy_stats s ON s.meme_id=m.id WHERE m.deleted_at IS NULL GROUP BY m.id ORDER BY score DESC,m.created_at DESC,m.id DESC LIMIT 250`
  return c.json({ memes: rows.map(m => ({ id:m.id,imageUrl:publicUrl(m.storage_key),mimeType:m.mime_type,createdAt:m.created_at,score:Number(m.score) })) })
})
app.post('/uploads', async c => {
  if (!await allow(c,'upload',20)) return error(c,'Çok fazla yükleme denemesi.',429)
  const form=await c.req.raw.formData().catch(()=>null), file=form?.get('file') as File | null; if(!file||typeof file.arrayBuffer!=='function'||!types.has(file.type)||file.size<1||file.size>MAX)return error(c,'JPEG, PNG, WebP veya GIF seçin (en çok 12 MB).')
  const id=crypto.randomUUID(),storageKey=`memes/${id}`; await s3().send(new PutObjectCommand({Bucket:bucket,Key:storageKey,Body:new Uint8Array(await file.arrayBuffer()),ContentType:file.type,ContentLength:file.size}))
  const [meme]=await sql`INSERT INTO memes(id,storage_key,mime_type,file_size) VALUES (${id}::uuid,${storageKey},${file.type},${file.size}) RETURNING *`
  return c.json({meme:{id:meme.id,imageUrl:publicUrl(meme.storage_key),mimeType:meme.mime_type,createdAt:meme.created_at,score:5}})
})
app.post('/memes/:id/copies', async c => {const id=c.req.param('id');await sql`INSERT INTO daily_copy_stats(meme_id,day,copies) SELECT ${id}::uuid,current_date,1 WHERE EXISTS(SELECT 1 FROM memes WHERE id=${id}::uuid AND deleted_at IS NULL) ON CONFLICT(meme_id,day) DO UPDATE SET copies=daily_copy_stats.copies+1`;return c.json({ok:true})})
app.delete('/memes/:id', async c => {if(!await allow(c,'delete',20))return error(c,'Çok fazla silme denemesi.',429);const id=c.req.param('id');const [meme]=await sql`UPDATE memes SET deleted_at=now() WHERE id=${id}::uuid AND deleted_at IS NULL RETURNING storage_key`;if(!meme)return error(c,'Meme bulunamadı.',404);try{await s3().send(new DeleteObjectCommand({Bucket:bucket,Key:meme.storage_key}))}catch{await sql`UPDATE memes SET deleted_at=NULL WHERE id=${id}::uuid`;return error(c,'Dosya silinemedi; kayıt geri alındı.',502)}return c.json({ok:true})})
export default app
