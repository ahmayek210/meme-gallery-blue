CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE IF NOT EXISTS memes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), storage_key text UNIQUE NOT NULL,
  mime_type text NOT NULL CHECK (mime_type IN ('image/jpeg','image/png','image/webp','image/gif','image/heic','image/heif')),
  file_size integer NOT NULL CHECK (file_size > 0 AND file_size <= 12582912),
  created_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz
);
CREATE TABLE IF NOT EXISTS daily_copy_stats (
  meme_id uuid NOT NULL REFERENCES memes(id) ON DELETE CASCADE, day date NOT NULL,
  copies integer NOT NULL DEFAULT 0 CHECK (copies >= 0), PRIMARY KEY (meme_id, day)
);
CREATE TABLE IF NOT EXISTS rate_limits (key text PRIMARY KEY, attempts integer NOT NULL DEFAULT 1, window_start timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS memes_active_created_idx ON memes(created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS copy_stats_meme_day_idx ON daily_copy_stats(meme_id, day DESC);
