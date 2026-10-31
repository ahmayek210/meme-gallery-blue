import { defineConfig } from '@neon/config/v1'

export default defineConfig({
  buckets: { memes: { access: 'public_read' } },
  functions: {
    memeapi: { name: 'Meme Gallery API', source: './functions/api/src/index.ts', env: {
      MANAGEMENT_PASSWORD_HASH: process.env.MANAGEMENT_PASSWORD_HASH!, PASSWORD_SALT: process.env.PASSWORD_SALT!,
      SESSION_SECRET: process.env.SESSION_SECRET!, SESSION_VERSION: process.env.SESSION_VERSION!,
      ALLOWED_ORIGIN: process.env.ALLOWED_ORIGIN!, PUBLIC_BUCKET_URL: process.env.PUBLIC_BUCKET_URL!,
    } },
  },
})
