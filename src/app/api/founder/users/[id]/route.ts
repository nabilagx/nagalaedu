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

function isValidUuid(value: unknown): value is string {
  if (typeof value !== "string") {
    return false
  }

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  )
}

function isValidPhone(phone: unknown): phone is string {
  return (
    typeof phone === "string" &&
    /^\d{10,13}$/.test(phone)
  )
}

function isValidFullName(fullName: unknown): fullName is string {
  if (typeof fullName !== "string") {
    return false
  }

  const trimmed = fullName.trim()

  return (
    trimmed.length >= 2 &&
    trimmed.length <= 100 &&
    !/[\u0000-\u001F\u007F]/.test(trimmed)
  )
}

function isValidPassword(password: unknown): password is string {
  return (
    typeof password === "string" &&
    password.length >= 6 &&
    password.length <= 128
  )
}

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

    /**
     * Validasi UUID.
     */
    if (!isValidUuid(id)) {
      return NextResponse.json(
        {
          error: "ID pengguna tidak valid.",
        },
        {
          status: 400,
        }
      )
    }

    /**
     * Founder tidak boleh mengedit akun Founder.
     */
    const admin = createAdminClient()

    const {
      data: targetProfile,
      error: targetProfileError,
    } = await admin
      .from("profiles")
      .select("id, full_name, phone_number, role_id")
      .eq("id", id)
      .single()

    if (
      targetProfileError ||
      !targetProfile
    ) {
      return NextResponse.json(
        {
          error: "Pengguna tidak ditemukan.",
        },
        {
          status: 404,
        }
      )
    }

    if (targetProfile.role_id === 1) {
      return NextResponse.json(
        {
          error:
            "Akun Founder tidak dapat diedit melalui endpoint ini.",
        },
        {
          status: 403,
        }
      )
    }

    let body: unknown

    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        {
          error: "Format request JSON tidak valid.",
        },
        {
          status: 400,
        }
      )
    }

    if (
      typeof body !== "object" ||
      body === null ||
      Array.isArray(body)
    ) {
      return NextResponse.json(
        {
          error: "Data request tidak valid.",
        },
        {
          status: 400,
        }
      )
    }

    const {
      fullName,
      phoneNumber,
      roleId,
      password,
    } = body as Record<string, unknown>

    /**
     * Nama lengkap
     */
    if (!isValidFullName(fullName)) {
      return NextResponse.json(
        {
          error:
            "Nama lengkap wajib diisi dan harus terdiri dari 2–100 karakter.",
        },
        {
          status: 400,
        }
      )
    }

    const normalizedFullName = fullName.trim()

    /**
     * Nomor telepon wajib.
     */
    if (!isValidPhone(phoneNumber)) {
      return NextResponse.json(
        {
          error:
            "Nomor telepon wajib diisi dan harus terdiri dari 10–13 digit angka.",
        },
        {
          status: 400,
        }
      )
    }

    /**
     * Role hanya Tutor atau Parent.
     */
    const parsedRoleId = Number(roleId)

    if (![2, 3].includes(parsedRoleId)) {
      return NextResponse.json(
        {
          error:
            "Role tidak valid. Pengguna hanya dapat memiliki role Tutor atau Orang Tua.",
        },
        {
          status: 400,
        }
      )
    }

    /**
     * Password bersifat opsional ketika edit.
     *
     * Tetapi jika dikirim:
     * - harus string
     * - minimal 6 karakter
     * - maksimal 128 karakter
     */
    if (
      password !== undefined &&
      password !== null &&
      password !== ""
    ) {
      if (!isValidPassword(password)) {
        return NextResponse.json(
          {
            error:
              "Password harus 6–128 karakter.",
          },
          {
            status: 400,
          }
        )
      }
    }

    /**
     * Update Authentication terlebih dahulu.
     */
    const authUpdate: {
      user_metadata: {
        full_name: string
      }
      password?: string
    } = {
      user_metadata: {
        full_name: normalizedFullName,
      },
    }

    if (
      typeof password === "string" &&
      password.length > 0
    ) {
      authUpdate.password = password
    }

    const {
      error: authError,
    } = await admin.auth.admin.updateUserById(
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
            "Gagal memperbarui data autentikasi pengguna.",
        },
        {
          status: 500,
        }
      )
    }

    /**
     * Setelah Authentication berhasil,
     * update profile.
     */
    const {
      error: profileError,
    } = await admin
      .from("profiles")
      .update({
        full_name: normalizedFullName,
        phone_number: phoneNumber,
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
            "Data autentikasi berhasil diperbarui, tetapi profil gagal diperbarui.",
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
    console.error(
      "PATCH USER ERROR:",
      error
    )

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
     * Validasi UUID.
     */
    if (!isValidUuid(id)) {
      return NextResponse.json(
        {
          error: "ID pengguna tidak valid.",
        },
        {
          status: 400,
        }
      )
    }

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
          status: 403,
        }
      )
    }

    const admin = createAdminClient()

    /**
     * Pastikan target memang ada.
     */
    const {
      data: targetProfile,
      error: profileError,
    } = await admin
      .from("profiles")
      .select("id, full_name, role_id")
      .eq("id", id)
      .single()

    if (
      profileError ||
      !targetProfile
    ) {
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
     * Founder tidak boleh dihapus.
     *
     * Ini penting walaupun ID tersebut bukan
     * ID Founder yang sedang login.
     */
    if (targetProfile.role_id === 1) {
      return NextResponse.json(
        {
          error:
            "Akun Founder tidak dapat dihapus.",
        },
        {
          status: 403,
        }
      )
    }

    /**
     * Hapus profile terlebih dahulu.
     */
    const {
      error: deleteProfileError,
    } = await admin
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
     * Hapus Authentication.
     */
    const {
      error: deleteAuthError,
    } = await admin.auth.admin.deleteUser(id)

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
    console.error(
      "DELETE USER ERROR:",
      error
    )

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