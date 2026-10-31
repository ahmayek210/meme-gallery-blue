import { defineConfig } from '@neon/config/v1'

export default defineConfig({
  buckets: { memes: { access: 'public_read' } },
  functions: {
    memeapi: { name: 'Meme Gallery API', source: './functions/api/src/index.ts', env: {
      ALLOWED_ORIGIN: process.env.ALLOWED_ORIGIN!, PUBLIC_BUCKET_URL: process.env.PUBLIC_BUCKET_URL!,
    } },
  },
})
