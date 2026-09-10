import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

type UserRole = "Founder" | "Tutor" | "Parent"

async function requireFounder(): Promise<
  | {
      authorized: true
      user: NonNullable<
        Awaited<
          ReturnType<
            Awaited<
              ReturnType<typeof createClient>
            >["auth"]["getUser"]
          >
        >["data"]["user"]
      >
      supabase: Awaited<ReturnType<typeof createClient>>
    }
  | {
      authorized: false
      response: NextResponse
    }
> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Anda belum login." },
        { status: 401 }
      ),
    }
  }

  const { data: profile, error } =
    await supabase
      .from("profiles")
      .select("id, role_id, full_name, phone_number")
      .eq("id", user.id)
      .single()

  if (error || !profile) {
    return {
      authorized: false,
      response: NextResponse.json(
        {
          error:
            "Profil pengguna tidak ditemukan.",
        },
        { status: 403 }
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
        { status: 403 }
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
 * Membuat akun baru.
 */
export async function POST(request: Request) {
  try {
    const auth = await requireFounder()

    if (!auth.authorized) {
      return auth.response
    }

    const body = await request.json()

    const {
      email,
      password,
      fullName,
      phoneNumber,
      roleId,
    } = body

    if (
      !email ||
      !password ||
      !fullName ||
      !roleId
    ) {
      return NextResponse.json(
        {
          error:
            "Email, password, nama lengkap, dan role wajib diisi.",
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

    if (password.length < 6) {
      return NextResponse.json(
        {
          error: "Password minimal 6 karakter.",
        },
        {
          status: 400,
        }
      )
    }

    const admin = createAdminClient()

    /**
     * 1. Buat akun Authentication.
     */
    const {
      data: createdUser,
      error: authError,
    } =
      await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
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
     * 2. Buat profile.
     */
    const { error: profileError } =
      await admin
        .from("profiles")
        .insert({
          id: createdUser.user.id,
          full_name: fullName,
          phone_number: phoneNumber || null,
          role_id: parsedRoleId,
        })

    /**
     * Kalau profile gagal dibuat,
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
            "Akun berhasil dibuat tetapi profil gagal disimpan.",
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
          fullName,
          phoneNumber: phoneNumber || null,
          roleId: parsedRoleId,
        },
      },
      {
        status: 201,
      }
    )
  } catch (error) {
    console.error("CREATE USER SERVER ERROR:", error)

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