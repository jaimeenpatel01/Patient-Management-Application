import { supabase } from '@/lib/supabase';
import { decode } from 'base64-arraybuffer';
import type { Consultation, Diagnosis, Treatment, ExercisePlan } from '@/types';

// Reuse the same private Supabase Storage bucket used for patient documents.
// Exercise media is stored under an `exercise-media/{patient_id}/` path prefix
// within this bucket rather than provisioning a dedicated bucket.
const EXERCISE_MEDIA_BUCKET = 'medical_documents';

// Consultations
export async function getConsultations(patientId: string): Promise<{ data: Consultation[]; error: string | null }> {
  const { data, error } = await supabase.from('consultations').select('*').eq('patient_id', patientId).order('consultation_date', { ascending: false });
  return { data: (data as Consultation[]) || [], error: error?.message || null };
}

export async function createConsultation(input: Omit<Consultation, 'id' | 'doctor_id' | 'created_at' | 'updated_at'>): Promise<{ data: Consultation | null; error: string | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: 'Not authenticated' };
  const { data, error } = await supabase.from('consultations').insert({ ...input, doctor_id: user.id }).select().single();
  return { data: (data as Consultation) || null, error: error?.message || null };
}

// Diagnoses
export async function getDiagnoses(consultationId: string): Promise<{ data: Diagnosis[]; error: string | null }> {
  const { data, error } = await supabase.from('diagnoses').select('*').eq('consultation_id', consultationId);
  return { data: (data as Diagnosis[]) || [], error: error?.message || null };
}

export async function createDiagnosis(input: Omit<Diagnosis, 'id' | 'doctor_id' | 'created_at' | 'updated_at'>): Promise<{ data: Diagnosis | null; error: string | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: 'Not authenticated' };
  const { data, error } = await supabase.from('diagnoses').insert({ ...input, doctor_id: user.id }).select().single();
  return { data: (data as Diagnosis) || null, error: error?.message || null };
}

// Treatments
export async function getTreatments(consultationId: string): Promise<{ data: Treatment[]; error: string | null }> {
  const { data, error } = await supabase.from('treatments').select('*').eq('consultation_id', consultationId);
  return { data: (data as Treatment[]) || [], error: error?.message || null };
}

export async function createTreatment(input: Omit<Treatment, 'id' | 'doctor_id' | 'created_at' | 'updated_at'>): Promise<{ data: Treatment | null; error: string | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: 'Not authenticated' };
  const { data, error } = await supabase.from('treatments').insert({ ...input, doctor_id: user.id }).select().single();
  return { data: (data as Treatment) || null, error: error?.message || null };
}

// Exercise Plans
export async function getExercisePlans(consultationId: string): Promise<{ data: ExercisePlan[]; error: string | null }> {
  const { data, error } = await supabase.from('exercise_plans').select('*').eq('consultation_id', consultationId);
  return { data: (data as ExercisePlan[]) || [], error: error?.message || null };
}

export async function createExercisePlan(input: Omit<ExercisePlan, 'id' | 'doctor_id' | 'created_at' | 'updated_at'>): Promise<{ data: ExercisePlan | null; error: string | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: 'Not authenticated' };
  const { data, error } = await supabase.from('exercise_plans').insert({ ...input, doctor_id: user.id }).select().single();
  return { data: (data as ExercisePlan) || null, error: error?.message || null };
}

/**
 * Uploads a base64 image/video to Supabase Storage for an exercise plan and
 * returns a long-lived signed URL to store on `ExercisePlan.media_url`.
 *
 * Mirrors the upload pattern in `documentService.ts` — same bucket, same
 * base64 -> arraybuffer decode step — but files live under an
 * `exercise-media/{patient_id}/` prefix instead of the bare `{patient_id}/`
 * prefix used for documents, so the two don't collide.
 */
export async function uploadExerciseMedia(input: {
  patient_id: string;
  file_name: string;
  file_type: string;
  base64Data: string;
}): Promise<{ url: string | null; error: string | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { url: null, error: 'Not authenticated' };

    const timestamp = new Date().getTime();
    const sanitizedFileName = input.file_name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storagePath = `exercise-media/${input.patient_id}/${timestamp}_${sanitizedFileName}`;

    const { error: uploadError } = await supabase.storage
      .from(EXERCISE_MEDIA_BUCKET)
      .upload(storagePath, decode(input.base64Data), {
        contentType: input.file_type,
        upsert: false,
      });

    if (uploadError) {
      return { url: null, error: `Storage error: ${uploadError.message}` };
    }

    // The bucket is private, and `ExercisePlan.media_url` has no separate
    // storage_path column to re-sign on demand, so we mint a long-lived
    // (~10 year) signed URL and store it directly.
    const TEN_YEARS_IN_SECONDS = 60 * 60 * 24 * 365 * 10;
    const { data: signedData, error: signError } = await supabase.storage
      .from(EXERCISE_MEDIA_BUCKET)
      .createSignedUrl(storagePath, TEN_YEARS_IN_SECONDS);

    if (signError || !signedData) {
      return { url: null, error: signError?.message || 'Could not generate a media URL' };
    }

    return { url: signedData.signedUrl, error: null };
  } catch (err: any) {
    return { url: null, error: err.message || 'Unknown error occurred during media upload' };
  }
}

export async function updateConsultation(id: string, input: Partial<Omit<Consultation, 'id' | 'doctor_id' | 'created_at' | 'updated_at'>>): Promise<{ data: Consultation | null; error: string | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: 'Not authenticated' };

  const { data, error } = await supabase
    .from('consultations')
    .update(input)
    .eq('id', id)
    .eq('doctor_id', user.id)
    .select()
    .single();
  return { data: (data as Consultation) || null, error: error?.message || null };
}

export async function deleteConsultation(id: string): Promise<{ error: string | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { error } = await supabase
    .from('consultations')
    .delete()
    .eq('id', id)
    .eq('doctor_id', user.id);
  return { error: error?.message || null };
}
