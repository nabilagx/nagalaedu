import { NextResponse } from 'next/server'
import { User } from '@supabase/supabase-js'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

type FounderAuthSuccess = {
  authorized: true
  user: User
  supabase: Awaited<
    ReturnType<typeof createClient>
  >
}

type FounderAuthFailure = {
  authorized: false
  response: NextResponse
}

export type FounderAuthResult =
  | FounderAuthSuccess
  | FounderAuthFailure

/**
 * Memastikan request berasal dari user
 * yang sudah login dan memiliki role Founder.
 *
 * Digunakan pada API yang hanya boleh
 * diakses oleh Founder.
 */
export async function requireFounder(): Promise<FounderAuthResult> {
  /**
   * Client Supabase menggunakan cookie
   * session user yang sedang login.
   */
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  /**
   * Tidak ada session / user.
   */
  if (userError || !user) {
    return {
      authorized: false,
      response: NextResponse.json(
        {
          error:
            'Anda harus login terlebih dahulu.',
        },
        {
          status: 401,
        }
      ),
    }
  }

  /**
   * Ambil role user dari profiles.
   *
   * Menggunakan admin client supaya pengecekan
   * role tidak terganggu oleh RLS profiles.
   */
  const admin = createAdminClient()

  const {
    data: profile,
    error: profileError,
  } = await admin
    .from('profiles')
    .select(
      `
        id,
        role_id,
        full_name
      `
    )
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
        }
      ),
    }
  }

  /**
   * Profile tidak ditemukan.
   */
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
        }
      ),
    }
  }

  /**
   * Role 1 = Founder
   */
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
        }
      ),
    }
  }

  /**
   * User terautentikasi + role Founder.
   */
  return {
    authorized: true,
    user,
    supabase,
  }
}
