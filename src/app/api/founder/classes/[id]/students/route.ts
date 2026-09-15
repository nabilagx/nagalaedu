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

function cleanString(value: unknown) {
  return typeof value === "string" ? value.trim() : ""
}

function normalizeDbTime(value: string | null) {
  if (!value) return null

  return value.slice(0, 5)
}

function timeToMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number)

  return hours * 60 + minutes
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
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
          schedule_day,
          schedule_start,
          schedule_end,
          status
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

    const { data: enrollments, error: enrollmentError } =
      await supabase
        .from("class_enrollments")
        .select(
          `
          id,
          class_id,
          student_id,
          enrolled_at,
          ended_at,
          status
          `
        )
        .eq("class_id", classId)
        .eq("status", "ACTIVE")
        .order("enrolled_at", {
          ascending: true,
        })

    if (enrollmentError) {
      console.error(
        "Founder class students GET enrollment error:",
        enrollmentError
      )

      return NextResponse.json(
        {
          error:
            "Gagal mengambil data murid kelas.",
        },
        { status: 500 }
      )
    }

    const enrollmentRows = enrollments ?? []

    const studentIds = enrollmentRows.map(
      (item) => item.student_id
    )

    if (studentIds.length === 0) {
      return NextResponse.json({
        class: {
          ...classInfo,
          schedule_start: normalizeDbTime(
            classInfo.schedule_start
          ),
          schedule_end: normalizeDbTime(
            classInfo.schedule_end
          ),
        },
        students: [],
      })
    }

    const { data: students, error: studentsError } =
      await supabase
        .from("students")
        .select(
          `
          id,
          parent_id,
          student_name,
          grade_level,
          school_name,
          phone_number,
          status
          `
        )
        .in("id", studentIds)

    if (studentsError) {
      console.error(
        "Founder class students GET student error:",
        studentsError
      )

      return NextResponse.json(
        { error: "Gagal mengambil data murid." },
        { status: 500 }
      )
    }

    const parentIds = [
      ...new Set(
        (students ?? [])
          .map((student) => student.parent_id)
          .filter(Boolean)
      ),
    ]

    let parents: Array<{
      id: string
      full_name: string
      phone_number: string | null
    }> = []

    if (parentIds.length > 0) {
      const { data: parentData, error: parentError } =
        await supabase
          .from("profiles")
          .select(
            "id, full_name, phone_number"
          )
          .in("id", parentIds)

      if (parentError) {
        console.error(
          "Founder class students parent error:",
          parentError
        )

        return NextResponse.json(
          {
            error:
              "Gagal mengambil data orang tua.",
          },
          { status: 500 }
        )
      }

      parents = parentData ?? []
    }

    const studentMap = new Map(
      (students ?? []).map((student) => [
        student.id,
        student,
      ])
    )

    const parentMap = new Map(
      parents.map((parent) => [
        parent.id,
        parent,
      ])
    )

    const result = enrollmentRows
      .map((enrollment) => {
        const student = studentMap.get(
          enrollment.student_id
        )

        if (!student) return null

        const parent = parentMap.get(
          student.parent_id
        )

        return {
          enrollment_id: enrollment.id,
          student_id: student.id,
          student_name: student.student_name,
          grade_level: student.grade_level,
          school_name: student.school_name,
          phone_number: student.phone_number,
          status: student.status,
          enrolled_at: enrollment.enrolled_at,
          ended_at: enrollment.ended_at,

          parent: parent
            ? {
                id: parent.id,
                full_name: parent.full_name,
                phone_number:
                  parent.phone_number,
              }
            : null,
        }
      })
      .filter(Boolean)

    return NextResponse.json({
      class: {
        ...classInfo,
        schedule_start: normalizeDbTime(
          classInfo.schedule_start
        ),
        schedule_end: normalizeDbTime(
          classInfo.schedule_end
        ),
      },
      students: result,
    })
  } catch (error) {
    console.error(
      "Founder class students GET exception:",
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

export async function POST(
  request: Request,
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

    let body: unknown

    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: "Format request tidak valid." },
        { status: 400 }
      )
    }

    if (!isPlainObject(body)) {
      return NextResponse.json(
        { error: "Body request tidak valid." },
        { status: 400 }
      )
    }

    const studentId = cleanString(
      body.student_id ?? body.studentId
    )

    if (!isValidUUID(studentId)) {
      return NextResponse.json(
        { error: "ID murid tidak valid." },
        { status: 400 }
      )
    }

    // ---------------------------------------------------------
    // Validasi kelas
    // ---------------------------------------------------------

    const { data: classInfo, error: classError } =
      await supabase
        .from("classes")
        .select(
          `
          id,
          class_name,
          subject,
          schedule_day,
          schedule_start,
          schedule_end,
          status
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

    if (classInfo.status !== "ACTIVE") {
      return NextResponse.json(
        {
          error:
            "Murid tidak dapat ditambahkan ke kelas yang tidak aktif.",
        },
        { status: 409 }
      )
    }

    if (
      !classInfo.schedule_day ||
      !classInfo.schedule_start ||
      !classInfo.schedule_end
    ) {
      return NextResponse.json(
        {
          error:
            "Kelas belum memiliki jadwal yang lengkap.",
        },
        { status: 409 }
      )
    }

    // ---------------------------------------------------------
    // Validasi murid
    // ---------------------------------------------------------

    const { data: student, error: studentError } =
      await supabase
        .from("students")
        .select(
          `
          id,
          parent_id,
          student_name,
          grade_level,
          school_name,
          phone_number,
          status
          `
        )
        .eq("id", studentId)
        .single()

    if (studentError || !student) {
      return NextResponse.json(
        { error: "Murid tidak ditemukan." },
        { status: 404 }
      )
    }

    if (student.status !== "ACTIVE") {
      return NextResponse.json(
        {
          error:
            "Murid tidak aktif dan tidak dapat didaftarkan.",
        },
        { status: 409 }
      )
    }

    // ---------------------------------------------------------
    // Cek duplicate enrollment
    // ---------------------------------------------------------

    const { data: existingEnrollment, error: existingError } =
      await supabase
        .from("class_enrollments")
        .select(
          `
          id,
          status,
          ended_at
          `
        )
        .eq("class_id", classId)
        .eq("student_id", studentId)
        .order("enrolled_at", {
          ascending: false,
        })
        .limit(1)
        .maybeSingle()

    if (existingError) {
      console.error(
        "Enrollment duplicate query error:",
        existingError
      )

      return NextResponse.json(
        {
          error:
            "Gagal memeriksa pendaftaran murid.",
        },
        { status: 500 }
      )
    }

    if (
      existingEnrollment?.status === "ACTIVE"
    ) {
      return NextResponse.json(
        {
          error:
            "Murid sudah terdaftar di kelas ini.",
        },
        { status: 409 }
      )
    }

    // ---------------------------------------------------------
    // Ambil semua kelas lain yang diikuti murid
    // ---------------------------------------------------------

    const {
      data: studentEnrollments,
      error: studentEnrollmentError,
    } = await supabase
      .from("class_enrollments")
      .select(
        `
        id,
        class_id,
        student_id,
        status
        `
      )
      .eq("student_id", studentId)
      .eq("status", "ACTIVE")
      .neq("class_id", classId)

    if (studentEnrollmentError) {
      console.error(
        "Student schedule enrollment error:",
        studentEnrollmentError
      )

      return NextResponse.json(
        {
          error:
            "Gagal memeriksa jadwal murid.",
        },
        { status: 500 }
      )
    }

    const otherClassIds = [
      ...new Set(
        (studentEnrollments ?? []).map(
          (item) => item.class_id
        )
      ),
    ]

    if (otherClassIds.length > 0) {
      const { data: otherClasses, error: otherClassesError } =
        await supabase
          .from("classes")
          .select(
            `
            id,
            class_name,
            subject,
            schedule_day,
            schedule_start,
            schedule_end,
            status
            `
          )
          .in("id", otherClassIds)
          .eq("status", "ACTIVE")

      if (otherClassesError) {
        console.error(
          "Student schedule class query error:",
          otherClassesError
        )

        return NextResponse.json(
          {
            error:
              "Gagal memeriksa jadwal murid.",
          },
          { status: 500 }
        )
      }

      const newStart = timeToMinutes(
        normalizeDbTime(
          classInfo.schedule_start
        )!
      )

      const newEnd = timeToMinutes(
        normalizeDbTime(
          classInfo.schedule_end
        )!
      )

      const conflict =
        (otherClasses ?? []).find((otherClass) => {
          if (
            otherClass.schedule_day !==
              classInfo.schedule_day ||
            !otherClass.schedule_start ||
            !otherClass.schedule_end
          ) {
            return false
          }

          const existingStart =
            timeToMinutes(
              normalizeDbTime(
                otherClass.schedule_start
              )!
            )

          const existingEnd =
            timeToMinutes(
              normalizeDbTime(
                otherClass.schedule_end
              )!
            )

          return (
            newStart < existingEnd &&
            newEnd > existingStart
          )
        })

      if (conflict) {
        return NextResponse.json(
          {
            error:
              "Jadwal murid bentrok.",
            conflict: {
              class_id: conflict.id,
              class_name:
                conflict.class_name,
              subject: conflict.subject,
              day:
                conflict.schedule_day,
              start:
                normalizeDbTime(
                  conflict.schedule_start
                ),
              end:
                normalizeDbTime(
                  conflict.schedule_end
                ),
            },
          },
          { status: 409 }
        )
      }
    }

    // ---------------------------------------------------------
    // Jika pernah INACTIVE, aktifkan kembali record lama
    // ---------------------------------------------------------

    if (
      existingEnrollment &&
      existingEnrollment.status === "INACTIVE"
    ) {
      const { data: reactivated, error: reactivateError } =
        await supabase
          .from("class_enrollments")
          .update({
            status: "ACTIVE",
            ended_at: null,
          })
          .eq("id", existingEnrollment.id)
          .select(
            `
            id,
            class_id,
            student_id,
            enrolled_at,
            ended_at,
            status
            `
          )
          .single()

      if (reactivateError || !reactivated) {
        console.error(
          "Enrollment reactivation error:",
          reactivateError
        )

        return NextResponse.json(
          {
            error:
              "Gagal mengaktifkan kembali pendaftaran murid.",
          },
          { status: 500 }
        )
      }

      return NextResponse.json(
        {
          message:
            "Murid berhasil ditambahkan kembali ke kelas.",
          enrollment: reactivated,
          student,
        },
        { status: 201 }
      )
    }

    // ---------------------------------------------------------
    // Insert enrollment baru
    // ---------------------------------------------------------

    const { data: enrollment, error: insertError } =
      await supabase
        .from("class_enrollments")
        .insert({
          class_id: classId,
          student_id: studentId,
          status: "ACTIVE",
        })
        .select(
          `
          id,
          class_id,
          student_id,
          enrolled_at,
          ended_at,
          status
          `
        )
        .single()

    if (insertError || !enrollment) {
      console.error(
        "Enrollment insert error:",
        insertError
      )

      return NextResponse.json(
        {
          error:
            insertError?.message ||
            "Gagal menambahkan murid ke kelas.",
        },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        message:
          "Murid berhasil ditambahkan ke kelas.",
        enrollment,
        student,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error(
      "Founder class students POST exception:",
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
  request: Request,
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

    const url = new URL(request.url)

    const enrollmentId =
      url.searchParams.get("enrollment_id") ||
      url.searchParams.get("enrollmentId")

    const studentId =
      url.searchParams.get("student_id") ||
      url.searchParams.get("studentId")

    if (
      !isValidUUID(enrollmentId) &&
      !isValidUUID(studentId)
    ) {
      return NextResponse.json(
        {
          error:
            "Enrollment ID atau Student ID wajib diberikan.",
        },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    let query = supabase
      .from("class_enrollments")
      .select(
        `
        id,
        class_id,
        student_id,
        status
        `
      )
      .eq("class_id", classId)
      .eq("status", "ACTIVE")

    if (isValidUUID(enrollmentId)) {
      query = query.eq(
        "id",
        enrollmentId
      )
    } else {
      query = query.eq(
        "student_id",
        studentId!
      )
    }

    const { data: enrollment, error: enrollmentError } =
      await query.maybeSingle()

    if (enrollmentError) {
      console.error(
        "Enrollment DELETE lookup error:",
        enrollmentError
      )

      return NextResponse.json(
        {
          error:
            "Gagal mencari pendaftaran murid.",
        },
        { status: 500 }
      )
    }

    if (!enrollment) {
      return NextResponse.json(
        {
          error:
            "Murid tidak ditemukan dalam kelas ini.",
        },
        { status: 404 }
      )
    }

    const { data: updatedEnrollment, error: updateError } =
      await supabase
        .from("class_enrollments")
        .update({
          status: "INACTIVE",
          ended_at: new Date().toISOString(),
        })
        .eq("id", enrollment.id)
        .select(
          `
          id,
          class_id,
          student_id,
          enrolled_at,
          ended_at,
          status
          `
        )
        .single()

    if (updateError || !updatedEnrollment) {
      console.error(
        "Enrollment deactivate error:",
        updateError
      )

      return NextResponse.json(
        {
          error:
            updateError?.message ||
            "Gagal mengeluarkan murid dari kelas.",
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message:
        "Murid berhasil dikeluarkan dari kelas.",
      enrollment: updatedEnrollment,
    })
  } catch (error) {
    console.error(
      "Founder class students DELETE exception:",
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