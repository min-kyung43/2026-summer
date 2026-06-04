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

const supabaseUrl = import.meta.env.NEXT_PUBLIC_SUPABASE_URL
const supabasePublishableKey = import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error('Supabase 환경변수가 설정되지 않았습니다.')
}

export const supabase = createClient(supabaseUrl, supabasePublishableKey)
