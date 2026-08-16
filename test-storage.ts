import { supabase } from './src/lib/supabase';

async function run() {
  const { data: listData, error: listError } = await supabase.storage.from('avatars').list();
  console.log('Buckets list:', listData, listError);
}
run();
