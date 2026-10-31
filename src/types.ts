export type Meme = { id: string; imageUrl: string; mimeType: string; createdAt: string; score: number }
export type ApiError = Error & { status?: number }
