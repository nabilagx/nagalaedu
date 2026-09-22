import { NextResponse } from 'next/server'
import { User } from '@supabase/supabase-js'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

type FounderAuthSuccess = {
  authorized: true
  user: User
  supabase: Awaited<ReturnType<typeof createClient>>
}

type FounderAuthFailure = {
  authorized: false
  response: NextResponse
}

export type FounderAuthResult =
  | FounderAuthSuccess
  | FounderAuthFailure

export async function requireFounder(): Promise<FounderAuthResult> {
  try {
    const supabase = await createClient()

    // =========================================================
    // 1. VERIFY LOGIN SESSION
    // =========================================================
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return {
        authorized: false,
        response: NextResponse.json(
          {
            error: 'Anda harus login terlebih dahulu.',
          },
          {
            status: 401,
            headers: {
              'Cache-Control': 'no-store',
            },
          }
        ),
      }
    }

    // =========================================================
    // 2. GET USER PROFILE
    // =========================================================
    const admin = createAdminClient()

    const {
      data: profile,
      error: profileError,
    } = await admin
      .from('profiles')
      .select('id, role_id, full_name')
      .eq('id', user.id)
      .maybeSingle()

    if (profileError) {
      console.error(
        'REQUIRE FOUNDER PROFILE ERROR:',
        profileError
      )

      return {
        authorized: false,
        response: NextResponse.json(
          {
            error:
              'Gagal memverifikasi akses pengguna.',
          },
          {
            status: 500,
            headers: {
              'Cache-Control': 'no-store',
            },
          }
        ),
      }
    }

    // =========================================================
    // 3. PROFILE MUST EXIST
    // =========================================================
    if (!profile) {
      return {
        authorized: false,
        response: NextResponse.json(
          {
            error:
              'Profil pengguna tidak ditemukan.',
          },
          {
            status: 403,
            headers: {
              'Cache-Control': 'no-store',
            },
          }
        ),
      }
    }

    // =========================================================
    // 4. VERIFY FOUNDER ROLE
    //
    // Berdasarkan schema NAGALA:
    // Founder = role_id 1
    // Tutor   = role_id 2
    // Parent  = role_id 3
    // =========================================================
    if (profile.role_id !== 1) {
      return {
        authorized: false,
        response: NextResponse.json(
          {
            error:
              'Akses ditolak. Hanya Founder yang dapat mengakses fitur ini.',
          },
          {
            status: 403,
            headers: {
              'Cache-Control': 'no-store',
            },
          }
        ),
      }
    }

    // =========================================================
    // 5. AUTHORIZED
    // =========================================================
    return {
      authorized: true,
      user,
      supabase,
    }
  } catch (error) {
    console.error(
      'REQUIRE FOUNDER UNEXPECTED ERROR:',
      error
    )

    return {
      authorized: false,
      response: NextResponse.json(
        {
          error:
            'Terjadi kesalahan saat memverifikasi akses.',
        },
        {
          status: 500,
          headers: {
            'Cache-Control': 'no-store',
          },
        }
      ),
    }
  }
}