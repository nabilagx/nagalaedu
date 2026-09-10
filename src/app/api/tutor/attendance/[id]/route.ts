import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

interface RouteContext {
  params: Promise<{
    id: string
  }>
}

export async function GET(
  request: Request,
  context: RouteContext
) {
  try {
    const supabase = await createClient()

    // =========================
    // AUTH
    // =========================
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // =========================
    // ROLE CHECK
    // =========================
    const { data: profile, error: profileError } =
      await supabase
        .from("profiles")
        .select("id, full_name, role_id")
        .eq("id", user.id)
        .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "Profile tidak ditemukan" },
        { status: 404 }
      )
    }

    if (profile.role_id !== 2) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      )
    }

    // =========================
    // PARAM
    // =========================
    const { id } = await context.params

    if (!id) {
      return NextResponse.json(
        { error: "ID siswa tidak valid" },
        { status: 400 }
      )
    }

    // =========================
    // GET TUTOR CLASSES
    // =========================
    const { data: classes, error: classesError } =
      await supabase
        .from("classes")
        .select(`
          id,
          class_name,
          subject,
          description,
          schedule_day,
          schedule_start,
          schedule_end,
          status
        `)
        .eq("tutor_id", user.id)

    if (classesError) {
      console.error(
        "GET ATTENDANCE DETAIL CLASSES ERROR:",
        classesError
      )

      return NextResponse.json(
        { error: "Gagal mengambil data kelas" },
        { status: 500 }
      )
    }

    const classList = classes ?? []

    const classIds = classList.map(
      (item) => item.id
    )

    if (classIds.length === 0) {
      return NextResponse.json(
        { error: "Siswa tidak ditemukan" },
        { status: 404 }
      )
    }

    // =========================
    // SECURITY:
    // Student must belong to
    // tutor's class
    // =========================
    const { data: enrollments, error: enrollmentError } =
      await supabase
        .from("class_enrollments")
        .select(`
          id,
          class_id,
          student_id,
          status
        `)
        .in("class_id", classIds)
        .eq("student_id", id)

    if (enrollmentError) {
      console.error(
        "GET ATTENDANCE DETAIL ENROLLMENTS ERROR:",
        enrollmentError
      )

      return NextResponse.json(
        {
          error:
            "Gagal mengambil data pendaftaran siswa",
        },
        { status: 500 }
      )
    }

    const enrollmentList =
      enrollments ?? []

    if (enrollmentList.length === 0) {
      return NextResponse.json(
        { error: "Siswa tidak ditemukan" },
        { status: 404 }
      )
    }

    // =========================
    // GET STUDENT
    // =========================
    const { data: student, error: studentError } =
      await supabase
        .from("students")
        .select(`
          id,
          student_name,
          grade_level,
          school_name,
          phone_number,
          status
        `)
        .eq("id", id)
        .single()

    if (studentError || !student) {
      return NextResponse.json(
        { error: "Data siswa tidak ditemukan" },
        { status: 404 }
      )
    }

    const enrollmentIds =
      enrollmentList.map(
        (item) => item.id
      )

    // =========================
    // GET ATTENDANCE
    // =========================
    const { data: attendance, error: attendanceError } =
      await supabase
        .from("student_attendance")
        .select(`
          enrollment_id,
          status
        `)
        .in("enrollment_id", enrollmentIds)

    if (attendanceError) {
      console.error(
        "GET ATTENDANCE DETAIL ERROR:",
        attendanceError
      )

      return NextResponse.json(
        {
          error:
            "Gagal mengambil data kehadiran",
        },
        { status: 500 }
      )
    }

    const attendanceList =
      attendance ?? []

    // =========================
    // CLASS BREAKDOWN
    // =========================
    const classBreakdown =
      classList
        .filter((classItem) =>
          enrollmentList.some(
            (enrollment) =>
              enrollment.class_id ===
              classItem.id
          )
        )
        .map((classItem) => {
          const enrollment =
            enrollmentList.find(
              (item) =>
                item.class_id ===
                classItem.id
            )

          const classAttendance =
            attendanceList.filter(
              (item) =>
                item.enrollment_id ===
                enrollment?.id
            )

          const hadir =
            classAttendance.filter(
              (item) =>
                item.status === "HADIR"
            ).length

          const izin =
            classAttendance.filter(
              (item) =>
                item.status === "IZIN"
            ).length

          const sakit =
            classAttendance.filter(
              (item) =>
                item.status === "SAKIT"
            ).length

          const alpha =
            classAttendance.filter(
              (item) =>
                item.status === "ALPHA"
            ).length

          const total =
            classAttendance.length

          const percentage =
            total > 0
              ? Math.round(
                  (hadir / total) *
                    100
                )
              : 0

          return {
            id: classItem.id,
            enrollment_id:
              enrollment?.id ?? null,
            class_name:
              classItem.class_name,
            subject:
              classItem.subject,
            schedule_day:
              classItem.schedule_day,
            schedule_start:
              classItem.schedule_start,
            schedule_end:
              classItem.schedule_end,
            status:
              classItem.status,
            total,
            hadir,
            izin,
            sakit,
            alpha,
            percentage,
          }
        })

    // =========================
    // OVERALL COUNTS
    // =========================
    const hadir =
      attendanceList.filter(
        (item) =>
          item.status === "HADIR"
      ).length

    const izin =
      attendanceList.filter(
        (item) =>
          item.status === "IZIN"
      ).length

    const sakit =
      attendanceList.filter(
        (item) =>
          item.status === "SAKIT"
      ).length

    const alpha =
      attendanceList.filter(
        (item) =>
          item.status === "ALPHA"
      ).length

    const total =
      attendanceList.length

    const percentage =
      total > 0
        ? Math.round(
            (hadir / total) * 100
          )
        : 0

    return NextResponse.json({
      tutor: {
        id: profile.id,
        full_name: profile.full_name,
      },

      student: {
        id: student.id,
        student_name:
          student.student_name,
        grade_level:
          student.grade_level,
        school_name:
          student.school_name,
        phone_number:
          student.phone_number,
        status: student.status,
      },

      summary: {
        total,
        hadir,
        izin,
        sakit,
        alpha,
        percentage,
        total_classes:
          classBreakdown.length,
      },

      classes: classBreakdown,
    })
  } catch (error) {
    console.error(
      "TUTOR ATTENDANCE DETAIL API ERROR:",
      error
    )

    return NextResponse.json(
      { error: "Terjadi kesalahan pada server" },
      { status: 500 }
    )
  }
}