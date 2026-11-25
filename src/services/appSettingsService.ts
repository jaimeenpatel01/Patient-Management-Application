import { supabase } from '@/lib/supabase';

export interface AppSettings {
  minAppVersion: string;
  updateMessage: string | null;
}

export async function getAppSettings(): Promise<{ data: AppSettings | null; error: string | null }> {
  const { data, error } = await supabase
    .from('app_settings')
    .select('min_app_version, update_message')
    .eq('id', 1)
    .single();

  if (error) return { data: null, error: error.message };

  return {
    data: { minAppVersion: data.min_app_version, updateMessage: data.update_message },
    error: null,
  };
}
