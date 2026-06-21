import { createClient } from '@supabase/supabase-js'

export type TeamRecord = {
  id: number | string
  team_name: string
  team_code: string
  current_stage: number
  completed_count: number
  hint_count: number
  is_finished: boolean
  started_at: string | null
  finished_at: string | null
}

function normalizeSupabaseUrl(url: string) {
  return url.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '')
}

const rawSupabaseUrl = import.meta.env.VITE_SUPABASE_URL
  ?? import.meta.env.NEXT_PUBLIC_SUPABASE_URL
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
  ?? import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

if (!rawSupabaseUrl || !supabasePublishableKey) {
  throw new Error('Supabase 환경변수가 설정되지 않았습니다.')
}

const supabaseUrl = normalizeSupabaseUrl(rawSupabaseUrl)

export const supabase = createClient(supabaseUrl, supabasePublishableKey)
