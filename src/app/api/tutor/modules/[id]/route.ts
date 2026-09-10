import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

type Params = {
  params: Promise<{
    id: string
  }>
}

type UpdateModuleBody = {
  class_id?: string
  title?: string
  description?: string | null
  file_url?: string | null
}

export async function GET(
  _request: Request,
  { params }: Params
) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json(
        { error: "ID modul tidak valid." },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized." },
        { status: 401 }
      )
    }

    const { data: profile, error: profileError } =
      await supabase
        .from("profiles")
        .select("role_id, full_name")
        .eq("id", user.id)
        .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "Profil pengguna tidak ditemukan." },
        { status: 404 }
      )
    }

    if (profile.role_id !== 2) {
      return NextResponse.json(
        { error: "Akses hanya untuk tutor." },
        { status: 403 }
      )
    }

    // ---------------------------------------------------------
    // Ambil modul milik tutor
    // ---------------------------------------------------------
    const { data: module, error: moduleError } =
      await supabase
        .from("learning_modules")
        .select(
          `
          id,
          class_id,
          tutor_id,
          title,
          description,
          file_url,
          created_at,
          updated_at
          `
        )
        .eq("id", id)
        .eq("tutor_id", user.id)
        .single()

    if (moduleError || !module) {
      return NextResponse.json(
        { error: "Modul tidak ditemukan." },
        { status: 404 }
      )
    }

    // ---------------------------------------------------------
    // Ambil kelas modul
    // ---------------------------------------------------------
    const { data: classInfo, error: classError } =
      await supabase
        .from("classes")
        .select(
          `
          id,
          class_name,
          subject,
          description,
          schedule_day,
          schedule_start,
          schedule_end,
          status
          `
        )
        .eq("id", module.class_id)
        .eq("tutor_id", user.id)
        .single()

    if (classError || !classInfo) {
      return NextResponse.json(
        {
          error:
            "Kelas modul tidak ditemukan atau bukan kelas Anda.",
        },
        { status: 403 }
      )
    }

    return NextResponse.json({
      module: {
        ...module,
        class: classInfo,
      },
    })
  } catch (error) {
    console.error(
      "Tutor module detail GET error:",
      error
    )

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Terjadi kesalahan pada server.",
      },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: Request,
  { params }: Params
) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json(
        { error: "ID modul tidak valid." },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized." },
        { status: 401 }
      )
    }

    const { data: profile, error: profileError } =
      await supabase
        .from("profiles")
        .select("role_id")
        .eq("id", user.id)
        .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "Profil pengguna tidak ditemukan." },
        { status: 404 }
      )
    }

    if (profile.role_id !== 2) {
      return NextResponse.json(
        { error: "Akses hanya untuk tutor." },
        { status: 403 }
      )
    }

    let body: UpdateModuleBody

    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: "Format request tidak valid." },
        { status: 400 }
      )
    }

    // ---------------------------------------------------------
    // Pastikan modul milik tutor
    // ---------------------------------------------------------
    const { data: existingModule, error: existingError } =
      await supabase
        .from("learning_modules")
        .select(
          `
          id,
          class_id,
          tutor_id,
          title,
          description,
          file_url
          `
        )
        .eq("id", id)
        .eq("tutor_id", user.id)
        .single()

    if (existingError || !existingModule) {
      return NextResponse.json(
        { error: "Modul tidak ditemukan." },
        { status: 404 }
      )
    }

    const nextClassId =
      body.class_id !== undefined
        ? body.class_id.trim()
        : existingModule.class_id

    const nextTitle =
      body.title !== undefined
        ? body.title.trim()
        : existingModule.title

    const nextDescription =
      body.description !== undefined
        ? body.description?.trim() || null
        : existingModule.description

    const nextFileUrl =
      body.file_url !== undefined
        ? body.file_url?.trim() || null
        : existingModule.file_url

    if (!nextClassId) {
      return NextResponse.json(
        { error: "Kelas wajib dipilih." },
        { status: 400 }
      )
    }

    if (!nextTitle) {
      return NextResponse.json(
        { error: "Judul modul wajib diisi." },
        { status: 400 }
      )
    }

    // ---------------------------------------------------------
    // Validasi kelas baru tetap milik tutor
    // ---------------------------------------------------------
    const { data: tutorClass, error: classError } =
      await supabase
        .from("classes")
        .select(
          `
          id,
          class_name,
          subject
          `
        )
        .eq("id", nextClassId)
        .eq("tutor_id", user.id)
        .single()

    if (classError || !tutorClass) {
      return NextResponse.json(
        {
          error:
            "Kelas tidak ditemukan atau bukan kelas yang Anda ajar.",
        },
        { status: 403 }
      )
    }

    // ---------------------------------------------------------
    // Update
    // ---------------------------------------------------------
    const { data: updatedModule, error: updateError } =
      await supabase
        .from("learning_modules")
        .update({
          class_id: nextClassId,
          title: nextTitle,
          description: nextDescription,
          file_url: nextFileUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("tutor_id", user.id)
        .select(
          `
          id,
          class_id,
          tutor_id,
          title,
          description,
          file_url,
          created_at,
          updated_at
          `
        )
        .single()

    if (updateError || !updatedModule) {
      console.error(
        "Tutor module update error:",
        updateError
      )

      return NextResponse.json(
        {
          error:
            updateError?.message ||
            "Gagal memperbarui modul.",
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: "Modul berhasil diperbarui.",
      module: {
        ...updatedModule,
        class: tutorClass,
      },
    })
  } catch (error) {
    console.error(
      "Tutor module PATCH error:",
      error
    )

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Terjadi kesalahan pada server.",
      },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: Request,
  { params }: Params
) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json(
        { error: "ID modul tidak valid." },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized." },
        { status: 401 }
      )
    }

    const { data: profile, error: profileError } =
      await supabase
        .from("profiles")
        .select("role_id")
        .eq("id", user.id)
        .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "Profil pengguna tidak ditemukan." },
        { status: 404 }
      )
    }

    if (profile.role_id !== 2) {
      return NextResponse.json(
        { error: "Akses hanya untuk tutor." },
        { status: 403 }
      )
    }

    // ---------------------------------------------------------
    // Delete hanya jika modul milik tutor
    // ---------------------------------------------------------
    const { data: module, error: moduleError } =
      await supabase
        .from("learning_modules")
        .select("id, title")
        .eq("id", id)
        .eq("tutor_id", user.id)
        .single()

    if (moduleError || !module) {
      return NextResponse.json(
        { error: "Modul tidak ditemukan." },
        { status: 404 }
      )
    }

    const { error: deleteError } =
      await supabase
        .from("learning_modules")
        .delete()
        .eq("id", id)
        .eq("tutor_id", user.id)

    if (deleteError) {
      console.error(
        "Tutor module delete error:",
        deleteError
      )

      return NextResponse.json(
        {
          error:
            deleteError.message ||
            "Gagal menghapus modul.",
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: "Modul berhasil dihapus.",
    })
  } catch (error) {
    console.error(
      "Tutor module DELETE error:",
      error
    )

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Terjadi kesalahan pada server.",
      },
      { status: 500 }
    )
  }
}