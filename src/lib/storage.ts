import { put, del } from "@vercel/blob"

export async function uploadFile(file: File, _teamId: string, _taskId: string): Promise<{ url: string; name: string; size: number; mimeType: string } | null> {
  try {
    const ext = file.name.split(".").pop() ?? "bin"
    const path = `attachments/${crypto.randomUUID()}.${ext}`
    const { url } = await put(path, file, { access: "public" })
    return { url, name: file.name, size: file.size, mimeType: file.type }
  } catch (e) {
    console.error("Upload error:", e)
    return null
  }
}

export async function deleteFile(url: string) {
  try {
    await del(url)
  } catch (e) {
    console.error("Delete error:", e)
  }
}
