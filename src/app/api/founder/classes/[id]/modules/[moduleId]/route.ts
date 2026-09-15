import { NextResponse } from "next/server"

import { requireFounder } from "@/lib/auth/requireFounder"
import { createAdminClient } from "@/lib/supabase/admin"

type Params = {
  params: Promise<{
    id: string
    moduleId: string
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

export async function DELETE(
  _request: Request,
  { params }: Params
) {
  try {
    await requireFounder()

    const {
      id: classId,
      moduleId,
    } = await params

    if (!isValidUUID(classId)) {
      return NextResponse.json(
        { error: "ID kelas tidak valid." },
        { status: 400 }
      )
    }

    if (!isValidUUID(moduleId)) {
      return NextResponse.json(
        { error: "ID modul tidak valid." },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    const { data: module, error: moduleError } =
      await supabase
        .from("learning_modules")
        .select(
          `
          id,
          class_id,
          tutor_id,
          title
          `
        )
        .eq("id", moduleId)
        .eq("class_id", classId)
        .single()

    if (moduleError || !module) {
      return NextResponse.json(
        {
          error:
            "Modul tidak ditemukan di kelas tersebut.",
        },
        { status: 404 }
      )
    }

    const { error: deleteError } =
      await supabase
        .from("learning_modules")
        .delete()
        .eq("id", moduleId)
        .eq("class_id", classId)

    if (deleteError) {
      console.error(
        "Founder module DELETE error:",
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
      module: {
        id: module.id,
        title: module.title,
      },
    })
  } catch (error) {
    console.error(
      "Founder module DELETE exception:",
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