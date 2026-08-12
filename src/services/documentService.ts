import { supabase } from '@/lib/supabase';
import { decode } from 'base64-arraybuffer';
import type { Document, DocumentCategory } from '@/types';

// The Supabase storage bucket name
const BUCKET_NAME = 'medical_documents';

/**
 * Uploads a base64 file to Supabase Storage and creates a record in the documents table.
 */
export async function uploadDocument(input: {
  patient_id: string;
  consultation_id?: string | null;
  file_name: string;
  file_type: string;
  file_size?: number | null;
  base64Data: string;
  category: DocumentCategory;
  notes?: string | null;
}): Promise<{ data: Document | null; error: string | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: 'Not authenticated' };

    // 1. Generate a unique path for the file in the bucket
    // Format: patient_id/timestamp_filename
    const timestamp = new Date().getTime();
    const sanitizedFileName = input.file_name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storagePath = `${input.patient_id}/${timestamp}_${sanitizedFileName}`;

    // 2. Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(storagePath, decode(input.base64Data), {
        contentType: input.file_type,
        upsert: false,
      });

    if (uploadError) {
      return { data: null, error: `Storage error: ${uploadError.message}` };
    }

    // 3. Insert record into documents table
    const { data, error: dbError } = await supabase
      .from('documents')
      .insert({
        doctor_id: user.id,
        patient_id: input.patient_id,
        consultation_id: input.consultation_id || null,
        file_name: input.file_name,
        file_type: input.file_type,
        file_size: input.file_size || null,
        storage_path: storagePath,
        category: input.category,
        notes: input.notes || null,
      })
      .select()
      .single();

    if (dbError) {
      // If DB insert fails, we should ideally clean up the storage file, but keeping it simple for now
      return { data: null, error: `Database error: ${dbError.message}` };
    }

    return { data: data as Document, error: null };
  } catch (err: any) {
    return { data: null, error: err.message || 'Unknown error occurred during upload' };
  }
}

/**
 * Retrieves all documents for a specific patient.
 */
export async function getPatientDocuments(patientId: string): Promise<{ data: Document[]; error: string | null }> {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false });

  if (error) return { data: [], error: error.message };
  return { data: (data as Document[]) || [], error: null };
}

/**
 * Gets a temporary signed URL to view or download the file securely.
 */
export async function getDocumentUrl(storagePath: string): Promise<{ url: string | null; error: string | null }> {
  // Generate a signed URL valid for 1 hour (3600 seconds)
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .createSignedUrl(storagePath, 3600);

  if (error) return { url: null, error: error.message };
  return { url: data.signedUrl, error: null };
}

/**
 * Deletes a document from both Storage and the database.
 */
export async function deleteDocument(id: string, storagePath: string): Promise<{ error: string | null }> {
  // 1. Delete from storage
  const { error: storageError } = await supabase.storage.from(BUCKET_NAME).remove([storagePath]);
  if (storageError) return { error: `Storage delete error: ${storageError.message}` };

  // 2. Delete from database
  const { error: dbError } = await supabase.from('documents').delete().eq('id', id);
  if (dbError) return { error: `Database delete error: ${dbError.message}` };

  return { error: null };
}
