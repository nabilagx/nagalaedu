import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

type Params = {
  params: Promise<{
    id: string
  }>
}

async function getTutorAndGrade(
  id: string
) {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return {
      supabase,
      user: null,
      grade: null,
      errorResponse: NextResponse.json(
        { error: "Unauthorized." },
        { status: 401 }
      ),
    }
  }

  const { data: profile } =
    await supabase
      .from("profiles")
      .select("role_id")
      .eq("id", user.id)
      .single()

  if (!profile || profile.role_id !== 2) {
    return {
      supabase,
      user,
      grade: null,
      errorResponse: NextResponse.json(
        { error: "Akses hanya untuk tutor." },
        { status: 403 }
      ),
    }
  }

  const { data: grade, error: gradeError } =
    await supabase
      .from("grades")
      .select(
        "id, enrollment_id, subject, assessment_name, score, feedback_notes, created_at, updated_at"
      )
      .eq("id", id)
      .single()

  if (gradeError || !grade) {
    return {
      supabase,
      user,
      grade: null,
      errorResponse: NextResponse.json(
        { error: "Feedback tidak ditemukan." },
        { status: 404 }
      ),
    }
  }

  const { data: enrollment } =
    await supabase
      .from("class_enrollments")
      .select(
        "id, class_id, student_id, status"
      )
      .eq("id", grade.enrollment_id)
      .single()

  if (!enrollment) {
    return {
      supabase,
      user,
      grade: null,
      errorResponse: NextResponse.json(
        { error: "Enrollment tidak ditemukan." },
        { status: 404 }
      ),
    }
  }

  const { data: tutorClass } =
    await supabase
      .from("classes")
      .select(
        "id, class_name, subject, description, schedule_day, schedule_start, schedule_end, status"
      )
      .eq("id", enrollment.class_id)
      .eq("tutor_id", user.id)
      .single()

  if (!tutorClass) {
    return {
      supabase,
      user,
      grade: null,
      errorResponse: NextResponse.json(
        {
          error:
            "Anda tidak memiliki akses ke feedback ini.",
        },
        { status: 403 }
      ),
    }
  }

  return {
    supabase,
    user,
    grade: {
      ...grade,
      enrollment,
      tutorClass,
    },
    errorResponse: null,
  }
}

export async function GET(
  _request: Request,
  { params }: Params
) {
  try {
    const { id } = await params

    const result =
      await getTutorAndGrade(id)

    if (result.errorResponse) {
      return result.errorResponse
    }

    const {
      supabase,
      grade,
    } = result

    const { data: student } =
      await supabase
        .from("students")
        .select(
          "id, student_name, grade_level, school_name, phone_number, status"
        )
        .eq(
          "id",
          grade.enrollment.student_id
        )
        .single()

    return NextResponse.json({
      feedback: {
        id: grade.id,
        enrollment_id:
          grade.enrollment_id,
        student_id:
          grade.enrollment.student_id,
        student_name:
          student?.student_name ?? "-",
        grade_level:
          student?.grade_level ?? null,
        school_name:
          student?.school_name ?? null,
        phone_number:
          student?.phone_number ?? null,
        student_status:
          student?.status ?? null,
        class_id:
          grade.tutorClass.id,
        class_name:
          grade.tutorClass.class_name,
        class_subject:
          grade.tutorClass.subject,
        class_description:
          grade.tutorClass.description,
        schedule_day:
          grade.tutorClass.schedule_day,
        schedule_start:
          grade.tutorClass.schedule_start,
        schedule_end:
          grade.tutorClass.schedule_end,
        class_status:
          grade.tutorClass.status,
        subject: grade.subject,
        assessment_name:
          grade.assessment_name,
        score: grade.score,
        feedback_notes:
          grade.feedback_notes,
        created_at:
          grade.created_at,
        updated_at:
          grade.updated_at,
      },
    })
  } catch (error) {
    console.error(
      "Tutor feedback detail GET error:",
      error
    )

    return NextResponse.json(
      { error: "Terjadi kesalahan pada server." },
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

    const result =
      await getTutorAndGrade(id)

    if (result.errorResponse) {
      return result.errorResponse
    }

    const {
      supabase,
    } = result

    const body = await request.json()

    const updates: Record<
      string,
      string | number | null
    > = {}

    if (
      body.subject !== undefined
    ) {
      const subject =
        typeof body.subject === "string"
          ? body.subject.trim()
          : ""

      if (!subject) {
        return NextResponse.json(
          {
            error:
              "Mata pelajaran wajib diisi.",
          },
          { status: 400 }
        )
      }

      updates.subject = subject
    }

    if (
      body.assessment_name !==
      undefined
    ) {
      const assessmentName =
        typeof body.assessment_name ===
        "string"
          ? body.assessment_name.trim()
          : ""

      if (!assessmentName) {
        return NextResponse.json(
          {
            error:
              "Nama assessment wajib diisi.",
          },
          { status: 400 }
        )
      }

      updates.assessment_name =
        assessmentName
    }

    if (
      body.score !== undefined
    ) {
      const score =
        typeof body.score === "number"
          ? body.score
          : Number(body.score)

      if (
        !Number.isFinite(score) ||
        score < 0 ||
        score > 100
      ) {
        return NextResponse.json(
          {
            error:
              "Nilai harus berada antara 0 sampai 100.",
          },
          { status: 400 }
        )
      }

      updates.score = score
    }

    if (
      body.feedback_notes !==
      undefined
    ) {
      const feedbackNotes =
        typeof body.feedback_notes ===
        "string"
          ? body.feedback_notes.trim()
          : ""

      if (!feedbackNotes) {
        return NextResponse.json(
          {
            error:
              "Feedback wajib diisi.",
          },
          { status: 400 }
        )
      }

      updates.feedback_notes =
        feedbackNotes
    }

    updates.updated_at =
      new Date().toISOString()

    const { data: updatedGrade, error } =
      await supabase
        .from("grades")
        .update(updates)
        .eq("id", id)
        .select(
          "id, enrollment_id, subject, assessment_name, score, feedback_notes, created_at, updated_at"
        )
        .single()

    if (error) {
      console.error(
        "Tutor feedback update error:",
        error
      )

      return NextResponse.json(
        { error: "Gagal memperbarui feedback." },
        { status: 500 }
      )
    }

    return NextResponse.json({
      feedback: updatedGrade,
    })
  } catch (error) {
    console.error(
      "Tutor feedback PATCH error:",
      error
    )

    return NextResponse.json(
      { error: "Terjadi kesalahan pada server." },
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

    const result =
      await getTutorAndGrade(id)

    if (result.errorResponse) {
      return result.errorResponse
    }

    const { supabase } = result

    const { error } =
      await supabase
        .from("grades")
        .delete()
        .eq("id", id)

    if (error) {
      console.error(
        "Tutor feedback delete error:",
        error
      )

      return NextResponse.json(
        { error: "Gagal menghapus feedback." },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: "Feedback berhasil dihapus.",
    })
  } catch (error) {
    console.error(
      "Tutor feedback DELETE error:",
      error
    )

    return NextResponse.json(
      { error: "Terjadi kesalahan pada server." },
      { status: 500 }
    )
  }
}