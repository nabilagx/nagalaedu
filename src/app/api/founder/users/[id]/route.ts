import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import type {
  SupabaseClient,
  User,
} from "@supabase/supabase-js"

type FounderAuthSuccess = {
  authorized: true
  user: User
  supabase: SupabaseClient
}

type FounderAuthFailure = {
  authorized: false
  response: NextResponse
}

type FounderAuthResult =
  | FounderAuthSuccess
  | FounderAuthFailure

async function requireFounder(): Promise<FounderAuthResult> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      authorized: false,
      response: NextResponse.json(
        {
          error: "Anda belum login.",
        },
        {
          status: 401,
        }
      ),
    }
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, role_id")
    .eq("id", user.id)
    .single()

  if (error || !profile) {
    return {
      authorized: false,
      response: NextResponse.json(
        {
          error: "Profil pengguna tidak ditemukan.",
        },
        {
          status: 403,
        }
      ),
    }
  }

  if (profile.role_id !== 1) {
    return {
      authorized: false,
      response: NextResponse.json(
        {
          error: "Akses hanya untuk Founder.",
        },
        {
          status: 403,
        }
      ),
    }
  }

  return {
    authorized: true,
    user,
    supabase,
  }
}

/**
 * PATCH
 * Mengedit data pengguna.
 */
export async function PATCH(
  request: Request,
  context: {
    params: Promise<{ id: string }>
  }
) {
  try {
    const auth = await requireFounder()

    if (!auth.authorized) {
      return auth.response
    }

    const { id } = await context.params

    const body = await request.json()

    const {
      fullName,
      phoneNumber,
      roleId,
      password,
    } = body

    if (!fullName || !roleId) {
      return NextResponse.json(
        {
          error:
            "Nama lengkap dan role wajib diisi.",
        },
        {
          status: 400,
        }
      )
    }

    const parsedRoleId = Number(roleId)

    if (![1, 2, 3].includes(parsedRoleId)) {
      return NextResponse.json(
        {
          error: "Role tidak valid.",
        },
        {
          status: 400,
        }
      )
    }

    /**
     * Founder tidak boleh mengubah dirinya
     * menjadi Tutor atau Parent.
     */
    if (
      id === auth.user.id &&
      parsedRoleId !== 1
    ) {
      return NextResponse.json(
        {
          error:
            "Role akun Founder yang sedang digunakan tidak dapat diubah.",
        },
        {
          status: 400,
        }
      )
    }

    const admin = createAdminClient()

    /**
     * Update profile.
     */
    const { error: profileError } = await admin
      .from("profiles")
      .update({
        full_name: fullName,
        phone_number: phoneNumber || null,
        role_id: parsedRoleId,
      })
      .eq("id", id)

    if (profileError) {
      console.error(
        "UPDATE PROFILE ERROR:",
        profileError
      )

      return NextResponse.json(
        {
          error:
            "Gagal memperbarui profil pengguna.",
        },
        {
          status: 500,
        }
      )
    }

    /**
     * Update data Authentication.
     */
    const authUpdate: {
      user_metadata: {
        full_name: string
      }
      password?: string
    } = {
      user_metadata: {
        full_name: fullName,
      },
    }

    if (password) {
      if (typeof password !== "string") {
        return NextResponse.json(
          {
            error: "Password tidak valid.",
          },
          {
            status: 400,
          }
        )
      }

      if (password.length < 6) {
        return NextResponse.json(
          {
            error:
              "Password minimal 6 karakter.",
          },
          {
            status: 400,
          }
        )
      }

      authUpdate.password = password
    }

    const { error: authError } =
      await admin.auth.admin.updateUserById(
        id,
        authUpdate
      )

    if (authError) {
      console.error(
        "UPDATE AUTH USER ERROR:",
        authError
      )

      return NextResponse.json(
        {
          error:
            "Profil berhasil diperbarui, tetapi data autentikasi gagal diperbarui.",
        },
        {
          status: 500,
        }
      )
    }

    return NextResponse.json({
      message: "Pengguna berhasil diperbarui.",
    })
  } catch (error) {
    console.error("PATCH USER ERROR:", error)

    return NextResponse.json(
      {
        error: "Terjadi kesalahan pada server.",
      },
      {
        status: 500,
      }
    )
  }
}

/**
 * DELETE
 * Menghapus akun pengguna secara permanen.
 */
export async function DELETE(
  _request: Request,
  context: {
    params: Promise<{ id: string }>
  }
) {
  try {
    const auth = await requireFounder()

    if (!auth.authorized) {
      return auth.response
    }

    const { id } = await context.params

    /**
     * Founder tidak boleh menghapus dirinya sendiri.
     */
    if (id === auth.user.id) {
      return NextResponse.json(
        {
          error:
            "Akun Founder yang sedang digunakan tidak dapat dihapus.",
        },
        {
          status: 400,
        }
      )
    }

    const admin = createAdminClient()

    /**
     * Pastikan profile pengguna memang ada.
     */
    const {
      data: targetProfile,
      error: profileError,
    } = await admin
      .from("profiles")
      .select("id, full_name, role_id")
      .eq("id", id)
      .single()

    if (profileError || !targetProfile) {
      return NextResponse.json(
        {
          error: "Pengguna tidak ditemukan.",
        },
        {
          status: 404,
        }
      )
    }

    /**
     * Hapus profile.
     */
    const { error: deleteProfileError } =
      await admin
        .from("profiles")
        .delete()
        .eq("id", id)

    if (deleteProfileError) {
      console.error(
        "DELETE PROFILE ERROR:",
        deleteProfileError
      )

      return NextResponse.json(
        {
          error:
            "Akun tidak dapat dihapus karena masih memiliki data yang terhubung. Periksa relasi database terlebih dahulu.",
        },
        {
          status: 409,
        }
      )
    }

    /**
     * Hapus akun Authentication secara permanen.
     */
    const { error: deleteAuthError } =
      await admin.auth.admin.deleteUser(id)

    if (deleteAuthError) {
      console.error(
        "DELETE AUTH USER ERROR:",
        deleteAuthError
      )

      return NextResponse.json(
        {
          error:
            "Profil berhasil dihapus, tetapi akun Authentication gagal dihapus.",
        },
        {
          status: 500,
        }
      )
    }

    return NextResponse.json({
      message:
        "Akun pengguna berhasil dihapus secara permanen.",
    })
  } catch (error) {
    console.error("DELETE USER ERROR:", error)

    return NextResponse.json(
      {
        error: "Terjadi kesalahan pada server.",
      },
      {
        status: 500,
      }
    )
  }
}