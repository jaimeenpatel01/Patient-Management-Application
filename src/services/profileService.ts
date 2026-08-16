import { supabase } from '@/lib/supabase';
import { decode } from 'base64-arraybuffer';

export async function uploadAvatar(userId: string, imageUri: string, base64Data: string): Promise<{ publicUrl: string | null; error: string | null }> {
  try {
    const ext = imageUri.substring(imageUri.lastIndexOf('.') + 1) || 'jpeg';
    // Use a dynamic file name to completely bypass CDN caching.
    // The cleanup block below will ensure old files are deleted so they don't accumulate.
    const fileName = `${userId}_${Date.now()}.${ext}`;
    const filePath = `${userId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, decode(base64Data), {
        contentType: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
      });

    if (uploadError) throw uploadError;

    // Cleanup: Since RLS policies now allow DELETE, this will successfully wipe out 
    // any old avatars, leaving only the newly uploaded one.
    const { data: existingFiles } = await supabase.storage.from('avatars').list(userId);
    if (existingFiles && existingFiles.length > 0) {
      const filesToRemove = existingFiles
        .filter(f => f.name !== fileName && f.name !== '.emptyFolderPlaceholder')
        .map(f => `${userId}/${f.name}`);
      
      if (filesToRemove.length > 0) {
        await supabase.storage.from('avatars').remove(filesToRemove).catch(err => console.error('Failed to cleanup old avatars', err));
      }
    }

    const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);

    // No need for ?t= parameter since the filename itself is unique
    const publicUrl = data.publicUrl;

    return { publicUrl, error: null };
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

export async function removeAvatarFile(currentUrl: string): Promise<{ error: string | null }> {
  try {
    const parts = currentUrl.split('/avatars/');
    if (parts.length === 2) {
      // Decode the URL in case it has URL-encoded characters (like spaces)
      const storagePath = decodeURIComponent(parts[1].split('?')[0]);
      const { error: storageError } = await supabase.storage.from('avatars').remove([storagePath]);
      if (storageError) {
        console.warn('Could not delete old avatar from storage by URL:', storageError);
        return { error: storageError.message };
      }
    }
    return { error: null };
  } catch (error: any) {
    console.error('Error removing avatar file:', error);
    return { error: error.message || 'Failed to remove avatar file' };
  }
}

export async function removeAvatar(userId: string, currentUrl: string): Promise<{ error: string | null }> {
  try {
    // Delete all files in the user's folder to ensure complete cleanup
    const { data: existingFiles } = await supabase.storage.from('avatars').list(userId);
    if (existingFiles && existingFiles.length > 0) {
      const filesToRemove = existingFiles
        .filter(f => f.name !== '.emptyFolderPlaceholder')
        .map(f => `${userId}/${f.name}`);
        
      if (filesToRemove.length > 0) {
        await supabase.storage.from('avatars').remove(filesToRemove);
      }
    } else {
      // Fallback to deleting by URL if listing failed or found nothing
      await removeAvatarFile(currentUrl);
    }
    
    const { error } = await supabase.from('profiles').update({ avatar_url: null }).eq('id', userId);
    if (error) throw error;
    
    return { error: null };
  } catch (error: any) {
    console.error('Error removing avatar:', error);
    return { error: error.message || 'Failed to remove avatar' };
  }
}
