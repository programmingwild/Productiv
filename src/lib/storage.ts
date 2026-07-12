import { supabase, supabaseAdmin } from "./supabase"

const BUCKET = "task-attachments"

async function ensureBucketByName(bucketName: string) {
  const client = supabaseAdmin ?? supabase
  if (!client) return false
  try {
    const { data } = await client.storage.getBucket(bucketName)
    if (!data) {
      await client.storage.createBucket(bucketName, { public: true })
    }
    return true
  } catch {
    try {
      await client.storage.createBucket(bucketName, { public: true })
      return true
    } catch (e) { console.error(`Bucket "${bucketName}" creation failed:`, e) }
  }
  return false
}

export async function ensureBucket() {
  return ensureBucketByName(BUCKET)
}

export async function ensureAvatarBucket() {
  return ensureBucketByName("avatars")
}

export async function uploadFile(file: File, teamId: string, taskId: string): Promise<{ url: string; name: string; size: number; mimeType: string } | null> {
  const client = supabase
  if (!client) return null

  const ext = file.name.split(".").pop() ?? "bin"
  const path = `${teamId}/${taskId}/${crypto.randomUUID()}.${ext}`

  const { data, error } = await client.storage
    .from(BUCKET)
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    })

  if (error || !data) {
    console.error("Upload error:", error)
    return null
  }

  const { data: urlData } = client.storage
    .from(BUCKET)
    .getPublicUrl(data.path)

  return {
    url: urlData.publicUrl,
    name: file.name,
    size: file.size,
    mimeType: file.type,
  }
}

export async function deleteFile(url: string) {
  const client = supabase
  if (!client) return

  const path = url.split("/").slice(-4).join("/")
  await client.storage.from(BUCKET).remove([path])
}
