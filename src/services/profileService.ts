import { supabase } from '@/lib/supabase';
import { decode } from 'base64-arraybuffer';

export async function uploadAvatar(userId: string, imageUri: string, base64Data: string): Promise<{ publicUrl: string | null; error: string | null }> {
  try {
    const ext = imageUri.substring(imageUri.lastIndexOf('.') + 1) || 'jpeg';
    const fileName = `${userId}_${Date.now()}.${ext}`;
    const filePath = `${userId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, decode(base64Data), {
        contentType: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
      });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);

    return { publicUrl: data.publicUrl, error: null };
  } catch (error: any) {
    console.error('Error uploading avatar:', error);
    return { publicUrl: null, error: error.message || 'Failed to upload avatar' };
  }
}

export async function updateProfile(userId: string, updates: Record<string, any>): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId);

    if (error) throw error;
    return { error: null };
  } catch (error: any) {
    console.error('Error updating profile:', error);
    return { error: error.message || 'Failed to update profile' };
  }
}

export async function removeAvatar(userId: string, currentUrl: string): Promise<{ error: string | null }> {
  try {
    const parts = currentUrl.split('/avatars/');
    if (parts.length === 2) {
      const storagePath = parts[1];
      const { error: storageError } = await supabase.storage.from('avatars').remove([storagePath]);
      if (storageError) {
        console.warn('Could not delete old avatar from storage:', storageError);
      }
    }
    
    const { error } = await supabase.from('profiles').update({ avatar_url: null }).eq('id', userId);
    if (error) throw error;
    
    return { error: null };
  } catch (error: any) {
    console.error('Error removing avatar:', error);
    return { error: error.message || 'Failed to remove avatar' };
  }
}
