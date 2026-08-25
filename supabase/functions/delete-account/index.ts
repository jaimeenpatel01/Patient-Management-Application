import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

const jsonResponse = (
  body: Record<string, unknown>,
  status: number,
) => {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  })
}

serve(async (req) => {
  // ---------------------------------------------------------
  // 1. CORS
  // ---------------------------------------------------------
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders,
    })
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return jsonResponse(
      { error: 'Method not allowed' },
      405,
    )
  }

  try {
    // ---------------------------------------------------------
    // 2. Environment variables
    // ---------------------------------------------------------
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('Missing Supabase environment variables')

      return jsonResponse(
        { error: 'Internal server error' },
        500,
      )
    }

    // ---------------------------------------------------------
    // 3. Create admin client
    // ---------------------------------------------------------
    const supabaseAdmin = createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    )

    // ---------------------------------------------------------
    // 4. Get Authorization header
    // ---------------------------------------------------------
    const authHeader = req.headers.get('Authorization')

    if (!authHeader?.startsWith('Bearer ')) {
      return jsonResponse(
        { error: 'Unauthorized' },
        401,
      )
    }

    const token = authHeader.substring('Bearer '.length).trim()

    if (!token) {
      return jsonResponse(
        { error: 'Unauthorized' },
        401,
      )
    }

    // ---------------------------------------------------------
    // 5. Verify authenticated user
    // ---------------------------------------------------------
    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(token)

    if (userError || !user) {
      console.error('JWT verification failed:', userError)

      return jsonResponse(
        { error: 'Unauthorized' },
        401,
      )
    }

    const userId = user.id

    console.log(`Starting account deletion for user: ${userId}`)

    // ---------------------------------------------------------
    // 6. Delete avatar files
    // ---------------------------------------------------------
    const {
      data: avatarFiles,
      error: avatarListError,
    } = await supabaseAdmin.storage
      .from('avatars')
      .list(userId)

    if (avatarListError) {
      console.error(
        'Failed to list avatar files:',
        avatarListError,
      )

      throw new Error('Failed to list avatar files')
    }

    if (avatarFiles && avatarFiles.length > 0) {
      const avatarPaths = avatarFiles
        .filter(
          (file) =>
            file.name !== '.emptyFolderPlaceholder',
        )
        .map(
          (file) => `${userId}/${file.name}`,
        )

      if (avatarPaths.length > 0) {
        const {
          error: avatarDeleteError,
        } = await supabaseAdmin.storage
          .from('avatars')
          .remove(avatarPaths)

        if (avatarDeleteError) {
          console.error(
            'Failed to delete avatar files:',
            avatarDeleteError,
          )

          throw new Error('Failed to delete avatar files')
        }
      }
    }

    // ---------------------------------------------------------
    // 7. Find medical documents belonging to this doctor
    // ---------------------------------------------------------
    const {
      data: documents,
      error: documentsQueryError,
    } = await supabaseAdmin
      .from('documents')
      .select(
        'storage_path, patient_id!inner(doctor_id)',
      )
      .eq('patient_id.doctor_id', userId)

    if (documentsQueryError) {
      console.error(
        'Failed to query medical documents:',
        documentsQueryError,
      )

      throw new Error(
        'Failed to find medical documents',
      )
    }

    // ---------------------------------------------------------
    // 8. Delete medical documents from Storage
    // ---------------------------------------------------------
    if (documents && documents.length > 0) {
      const documentPaths = documents
        .map((document) => document.storage_path)
        .filter(
          (path): path is string =>
            typeof path === 'string' &&
            path.length > 0,
        )

      const batchSize = 100

      for (
        let i = 0;
        i < documentPaths.length;
        i += batchSize
      ) {
        const batch = documentPaths.slice(
          i,
          i + batchSize,
        )

        console.log(
          `Deleting ${batch.length} medical documents`,
        )

        const {
          error: documentDeleteError,
        } = await supabaseAdmin.storage
          .from('medical_documents')
          .remove(batch)

        if (documentDeleteError) {
          console.error(
            'Failed to delete medical documents:',
            documentDeleteError,
          )

          throw new Error(
            'Failed to delete medical documents',
          )
        }
      }
    }

    // ---------------------------------------------------------
    // 9. Delete Auth user
    //
    // Database records should be removed through
    // ON DELETE CASCADE foreign-key relationships.
    // ---------------------------------------------------------
    const {
      error: deleteUserError,
    } = await supabaseAdmin.auth.admin.deleteUser(
      userId,
    )

    if (deleteUserError) {
      console.error(
        'Failed to delete Auth user:',
        deleteUserError,
      )

      throw new Error(
        'Failed to delete account',
      )
    }

    console.log(
      `Successfully deleted account: ${userId}`,
    )

    // ---------------------------------------------------------
    // 10. Success
    // ---------------------------------------------------------
    return jsonResponse(
      {
        success: true,
        message: 'Account deleted successfully',
      },
      200,
    )
  } catch (error) {
    console.error(
      'Account deletion failed:',
      error,
    )

    return jsonResponse(
      {
        success: false,
        error: 'Unable to delete account. Please try again.',
      },
      500,
    )
  }
})
