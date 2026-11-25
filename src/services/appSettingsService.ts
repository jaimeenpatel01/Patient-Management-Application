import { supabase } from '@/lib/supabase';

export interface AppSettings {
  minAppVersion: string;
  updateMessage: string | null;
  forceUpdate: boolean;
}

export async function getAppSettings(): Promise<{ data: AppSettings | null; error: string | null }> {
  const { data, error } = await supabase
    .from('app_settings')
    .select('min_app_version, update_message, force_update')
    .eq('id', 1)
    .single();

  if (error) return { data: null, error: error.message };

  return {
    data: {
      minAppVersion: data.min_app_version,
      updateMessage: data.update_message,
      forceUpdate: data.force_update,
    },
    error: null,
  };
}
