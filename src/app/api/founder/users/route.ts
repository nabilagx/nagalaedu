import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

type FounderAuthSuccess = {
  authorized: true
  user: NonNullable<
    Awaited<
      ReturnType<
        Awaited<ReturnType<typeof createClient>>["auth"]["getUser"]
      >
    >["data"]["user"]
  >
  supabase: Awaited<ReturnType<typeof createClient>>
}

type FounderAuthFailure = {
  authorized: false
  response: NextResponse
}

type FounderAuthResult =
  | FounderAuthSuccess
  | FounderAuthFailure

function isValidEmail(email: unknown): email is string {
  if (typeof email !== "string") {
    return false
  }

  const normalized = email.trim()

  return (
    normalized.length <= 254 &&
    /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+$/.test(
      normalized
    )
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
 * GET
 * Mengambil seluruh pengguna.
 */
export async function GET() {
  try {
    const auth = await requireFounder()

    if (!auth.authorized) {
      return auth.response
    }

    const { data, error } = await auth.supabase
      .from("profiles")
      .select(`
        id,
        full_name,
        phone_number,
        role_id,
        roles (
          role_name
        )
      `)
      .order("full_name", {
        ascending: true,
      })

    if (error) {
      console.error("GET USERS ERROR:", error)

      return NextResponse.json(
        {
          error: "Gagal mengambil data pengguna.",
        },
        {
          status: 500,
        }
      )
    }

    return NextResponse.json({
      users: data ?? [],
    })
  } catch (error) {
    console.error("GET USERS SERVER ERROR:", error)

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
 * POST
 * Membuat akun Tutor atau Parent baru.
 */
export async function POST(request: Request) {
  try {
    const auth = await requireFounder()

    if (!auth.authorized) {
      return auth.response
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
      email,
      password,
      fullName,
      phoneNumber,
      roleId,
    } = body as Record<string, unknown>

    /**
     * Email
     */
    if (!isValidEmail(email)) {
      return NextResponse.json(
        {
          error: "Format email tidak valid.",
        },
        {
          status: 400,
        }
      )
    }

    const normalizedEmail = email.trim().toLowerCase()

    /**
     * Password
     */
    if (!isValidPassword(password)) {
      return NextResponse.json(
        {
          error: "Password harus 6–128 karakter.",
        },
        {
          status: 400,
        }
      )
    }

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
     * Nomor telepon
     *
     * Wajib:
     * - hanya angka
     * - 10–13 digit
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
     * Role
     *
     * Founder (1) TIDAK BOLEH dibuat melalui endpoint ini.
     * Hanya:
     * 2 = Tutor
     * 3 = Parent
     */
    const parsedRoleId = Number(roleId)

    if (![2, 3].includes(parsedRoleId)) {
      return NextResponse.json(
        {
          error:
            "Role tidak valid. Akun baru hanya dapat dibuat sebagai Tutor atau Orang Tua.",
        },
        {
          status: 400,
        }
      )
    }

    const admin = createAdminClient()

    /**
     * Buat akun Authentication.
     */
    const {
      data: createdUser,
      error: authError,
    } = await admin.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: normalizedFullName,
      },
    })

    if (authError || !createdUser.user) {
      console.error("CREATE AUTH USER ERROR:", authError)

      return NextResponse.json(
        {
          error:
            authError?.message ||
            "Gagal membuat akun pengguna.",
        },
        {
          status: 400,
        }
      )
    }

    /**
     * Buat profile.
     */
    const { error: profileError } = await admin
      .from("profiles")
      .insert({
        id: createdUser.user.id,
        full_name: normalizedFullName,
        phone_number: phoneNumber,
        role_id: parsedRoleId,
      })

    /**
     * Jika profile gagal dibuat,
     * hapus kembali akun Authentication
     * agar tidak ada akun yatim.
     */
    if (profileError) {
      console.error(
        "CREATE PROFILE ERROR:",
        profileError
      )

      await admin.auth.admin.deleteUser(
        createdUser.user.id
      )

      return NextResponse.json(
        {
          error:
            "Akun gagal dibuat karena profil tidak dapat disimpan.",
        },
        {
          status: 500,
        }
      )
    }

    return NextResponse.json(
      {
        message: "Pengguna berhasil ditambahkan.",
        user: {
          id: createdUser.user.id,
          email: createdUser.user.email,
          fullName: normalizedFullName,
          phoneNumber,
          roleId: parsedRoleId,
        },
      },
      {
        status: 201,
      }
    )
  } catch (error) {
    console.error(
      "CREATE USER SERVER ERROR:",
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