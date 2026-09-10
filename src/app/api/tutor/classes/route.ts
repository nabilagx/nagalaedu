import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
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
    // PROFILE / ROLE CHECK
    // =========================
    const { data: profile, error: profileError } = await supabase
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
    // GET CLASSES
    // =========================
    const { data: classes, error: classesError } = await supabase
      .from("classes")
      .select(`
        id,
        tutor_id,
        class_name,
        subject,
        description,
        schedule_day,
        schedule_start,
        schedule_end,
        status,
        created_at,
        updated_at
      `)
      .eq("tutor_id", user.id)
      .order("created_at", { ascending: false })

    if (classesError) {
      console.error("GET TUTOR CLASSES ERROR:", classesError)

      return NextResponse.json(
        { error: "Gagal mengambil data kelas" },
        { status: 500 }
      )
    }

    const classList = classes ?? []

    if (classList.length === 0) {
      return NextResponse.json({
        tutor: {
          id: profile.id,
          full_name: profile.full_name,
        },
        summary: {
          total_classes: 0,
          active_classes: 0,
          total_students: 0,
        },
        classes: [],
      })
    }

    // =========================
    // GET ACTIVE ENROLLMENTS
    // =========================
    const classIds = classList.map((item) => item.id)

    const { data: enrollments, error: enrollmentError } = await supabase
      .from("class_enrollments")
      .select("id, class_id, student_id, status")
      .in("class_id", classIds)
      .eq("status", "ACTIVE")

    if (enrollmentError) {
      console.error("GET ENROLLMENTS ERROR:", enrollmentError)

      return NextResponse.json(
        { error: "Gagal mengambil data siswa" },
        { status: 500 }
      )
    }

    const enrollmentList = enrollments ?? []

    // =========================
    // GET ATTENDANCE
    // =========================
    const enrollmentIds = enrollmentList.map((item) => item.id)

    let attendanceList: {
      enrollment_id: string
      status: string
    }[] = []

    if (enrollmentIds.length > 0) {
      const { data: attendance, error: attendanceError } =
        await supabase
          .from("student_attendance")
          .select("enrollment_id, status")
          .in("enrollment_id", enrollmentIds)

      if (attendanceError) {
        console.error("GET ATTENDANCE ERROR:", attendanceError)

        return NextResponse.json(
          { error: "Gagal mengambil data kehadiran" },
          { status: 500 }
        )
      }

      attendanceList = attendance ?? []
    }

    // =========================
    // BUILD CLASS STATS
    // =========================
    const formattedClasses = classList.map((item) => {
      const classEnrollments = enrollmentList.filter(
        (enrollment) => enrollment.class_id === item.id
      )

      const classEnrollmentIds = classEnrollments.map(
        (enrollment) => enrollment.id
      )

      const classAttendance = attendanceList.filter((attendance) =>
        classEnrollmentIds.includes(attendance.enrollment_id)
      )

      const totalAttendance = classAttendance.length

      const presentAttendance = classAttendance.filter(
        (attendance) => attendance.status === "HADIR"
      ).length

      const attendanceRate =
        totalAttendance > 0
          ? Math.round((presentAttendance / totalAttendance) * 100)
          : 0

      return {
        id: item.id,
        class_name: item.class_name,
        subject: item.subject,
        description: item.description,
        schedule_day: item.schedule_day,
        schedule_start: item.schedule_start,
        schedule_end: item.schedule_end,
        status: item.status,
        student_count: classEnrollments.length,
        attendance_rate: attendanceRate,
        created_at: item.created_at,
        updated_at: item.updated_at,
      }
    })

    const totalStudents = enrollmentList.length

    const activeClasses = classList.filter(
      (item) => item.status === "ACTIVE"
    ).length

    return NextResponse.json({
      tutor: {
        id: profile.id,
        full_name: profile.full_name,
      },
      summary: {
        total_classes: classList.length,
        active_classes: activeClasses,
        total_students: totalStudents,
      },
      classes: formattedClasses,
    })
  } catch (error) {
    console.error("TUTOR CLASSES API ERROR:", error)

    return NextResponse.json(
      { error: "Terjadi kesalahan pada server" },
      { status: 500 }
    )
  }
}