import { NextResponse } from "next/server"

import { requireFounder } from "@/lib/auth/requireFounder"
import { createAdminClient } from "@/lib/supabase/admin"

type Params = {
  params: Promise<{
    id: string
  }>
}

function isValidUUID(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value
    )
  )
}

export async function GET(
  _request: Request,
  { params }: Params
) {
  try {
    await requireFounder()

    const { id: classId } = await params

    if (!isValidUUID(classId)) {
      return NextResponse.json(
        { error: "ID kelas tidak valid." },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    const { data: classInfo, error: classError } =
      await supabase
        .from("classes")
        .select(
          `
          id,
          class_name,
          subject,
          tutor_id
          `
        )
        .eq("id", classId)
        .single()

    if (classError || !classInfo) {
      return NextResponse.json(
        { error: "Kelas tidak ditemukan." },
        { status: 404 }
      )
    }

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
        .eq("class_id", classId)
        .order("created_at", {
          ascending: false,
        })

    if (modulesError) {
      console.error(
        "Founder class modules GET error:",
        modulesError
      )

      return NextResponse.json(
        {
          error:
            "Gagal mengambil data modul.",
        },
        { status: 500 }
      )
    }

    const moduleRows = modules ?? []

    const tutorIds = [
      ...new Set(
        moduleRows
          .map((module) => module.tutor_id)
          .filter(Boolean)
      ),
    ]

    let tutors: Array<{
      id: string
      full_name: string
    }> = []

    if (tutorIds.length > 0) {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", tutorIds)

      if (error) {
        console.error(
          "Founder class modules tutor query error:",
          error
        )

        return NextResponse.json(
          {
            error:
              "Gagal mengambil data tutor modul.",
          },
          { status: 500 }
        )
      }

      tutors = data ?? []
    }

    const tutorMap = new Map(
      tutors.map((tutor) => [
        tutor.id,
        tutor,
      ])
    )

    const result = moduleRows.map((module) => {
      const tutor = tutorMap.get(
        module.tutor_id
      )

      return {
        ...module,
        tutor: tutor
          ? {
              id: tutor.id,
              full_name: tutor.full_name,
            }
          : null,
      }
    })

    return NextResponse.json({
      class: classInfo,
      modules: result,
      total_modules: result.length,
    })
  } catch (error) {
    console.error(
      "Founder class modules GET exception:",
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