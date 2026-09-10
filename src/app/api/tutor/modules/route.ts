import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

type CreateModuleBody = {
  class_id?: string
  title?: string
  description?: string | null
  file_url?: string | null
}

export async function GET() {
  try {
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
    // Ambil kelas milik tutor
    // ---------------------------------------------------------
    const { data: classes, error: classesError } =
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
        .eq("tutor_id", user.id)
        .order("class_name", {
          ascending: true,
        })

    if (classesError) {
      console.error(
        "Tutor modules classes error:",
        classesError
      )

      return NextResponse.json(
        { error: "Gagal mengambil data kelas." },
        { status: 500 }
      )
    }

    const tutorClasses = classes ?? []
    const classIds = tutorClasses.map(
      (item) => item.id
    )

    if (classIds.length === 0) {
      return NextResponse.json({
        tutor: {
          id: user.id,
          full_name: profile.full_name,
        },
        summary: {
          total_modules: 0,
          total_classes: 0,
        },
        classes: [],
        modules: [],
      })
    }

    // ---------------------------------------------------------
    // Ambil modul tutor berdasarkan class_id
    // ---------------------------------------------------------
    const { data: modules, error: modulesError } =
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
        .eq("tutor_id", user.id)
        .in("class_id", classIds)
        .order("created_at", {
          ascending: false,
        })

    if (modulesError) {
      console.error(
        "Tutor modules query error:",
        modulesError
      )

      return NextResponse.json(
        { error: "Gagal mengambil data modul." },
        { status: 500 }
      )
    }

    const classMap = new Map(
      tutorClasses.map((item) => [
        item.id,
        item,
      ])
    )

    const moduleResponse = (modules ?? [])
      .map((module) => {
        const classInfo = classMap.get(
          module.class_id
        )

        if (!classInfo) {
          return null
        }

        return {
          id: module.id,
          class_id: module.class_id,
          tutor_id: module.tutor_id,
          title: module.title,
          description: module.description,
          file_url: module.file_url,
          created_at: module.created_at,
          updated_at: module.updated_at,

          class: {
            id: classInfo.id,
            class_name: classInfo.class_name,
            subject: classInfo.subject,
            description: classInfo.description,
            schedule_day: classInfo.schedule_day,
            schedule_start:
              classInfo.schedule_start,
            schedule_end:
              classInfo.schedule_end,
            status: classInfo.status,
          },
        }
      })
      .filter(Boolean)

    return NextResponse.json({
      tutor: {
        id: user.id,
        full_name: profile.full_name,
      },

      summary: {
        total_modules: moduleResponse.length,
        total_classes: tutorClasses.length,
      },

      classes: tutorClasses,

      modules: moduleResponse,
    })
  } catch (error) {
    console.error(
      "Tutor modules GET error:",
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

export async function POST(request: Request) {
  try {
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

    let body: CreateModuleBody

    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: "Format request tidak valid." },
        { status: 400 }
      )
    }

    const classId = body.class_id?.trim()
    const title = body.title?.trim()
    const description =
      body.description?.trim() || null
    const fileUrl =
      body.file_url?.trim() || null

    if (!classId) {
      return NextResponse.json(
        { error: "Kelas wajib dipilih." },
        { status: 400 }
      )
    }

    if (!title) {
      return NextResponse.json(
        { error: "Judul modul wajib diisi." },
        { status: 400 }
      )
    }

    // ---------------------------------------------------------
    // Pastikan kelas memang milik tutor
    // ---------------------------------------------------------
    const { data: tutorClass, error: classError } =
      await supabase
        .from("classes")
        .select("id, class_name, subject")
        .eq("id", classId)
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
    // Insert modul
    // ---------------------------------------------------------
    const { data: module, error: insertError } =
      await supabase
        .from("learning_modules")
        .insert({
          class_id: classId,
          tutor_id: user.id,
          title,
          description,
          file_url: fileUrl,
        })
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

    if (insertError || !module) {
      console.error(
        "Tutor modules insert error:",
        insertError
      )

      return NextResponse.json(
        {
          error:
            insertError?.message ||
            "Gagal membuat modul.",
        },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        message: "Modul berhasil dibuat.",
        module: {
          ...module,
          class: tutorClass,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error(
      "Tutor modules POST error:",
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