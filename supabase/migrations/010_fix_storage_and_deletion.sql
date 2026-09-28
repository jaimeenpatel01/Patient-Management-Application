-- 1. Make the 'medical_documents' bucket private
UPDATE storage.buckets 
SET public = false 
WHERE id = 'medical_documents';

-- Note: The delete_user RPC modifications were removed from this migration.
-- Account deletion and storage cleanup is now handled securely via the 'delete-account' Edge Function.
