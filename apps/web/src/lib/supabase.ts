import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export async function uploadDocumentFile(file: File, entityId: string): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'bin'
  const path = `documents/${entityId}/${crypto.randomUUID()}.${ext}`

  const { error } = await supabase.storage.from('documents').upload(path, file)

  if (error) {
    throw new Error(error.message)
  }

  const { data } = supabase.storage.from('documents').getPublicUrl(path)
  return data.publicUrl
}
