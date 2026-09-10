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
    // ROLE CHECK
    // =========================
    const { data: profile, error: profileError } = await supabase
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
        { error: "Akses hanya tersedia untuk Tutor." },
        { status: 403 }
      )
    }

    // =========================
    // TUTOR CLASSES
    // =========================
    const { data: classes, error: classesError } = await supabase
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
      .eq("status", "ACTIVE")
      .order("schedule_day", { ascending: true })

    if (classesError) {
      console.error("Tutor dashboard classes error:", classesError)

      return NextResponse.json(
        { error: "Gagal mengambil data kelas." },
        { status: 500 }
      )
    }

    const tutorClasses = classes ?? []
    const classIds = tutorClasses.map((item) => item.id)

    // =========================
    // EMPTY STATE
    // =========================
    if (classIds.length === 0) {
      return NextResponse.json({
        tutor: {
          id: user.id,
          full_name: profile.full_name,
        },
        summary: {
          total_classes: 0,
          total_students: 0,
          total_attendance: 0,
          present_attendance: 0,
          attendance_percentage: 0,
          total_modules: 0,
          total_grades: 0,
        },
        classes: [],
        recent_modules: [],
      })
    }

    // =========================
    // ACTIVE ENROLLMENTS
    // =========================
    const { data: enrollments, error: enrollmentError } = await supabase
      .from("class_enrollments")
      .select(`
        id,
        class_id,
        student_id,
        status
      `)
      .in("class_id", classIds)
      .eq("status", "ACTIVE")

    if (enrollmentError) {
      console.error(
        "Tutor dashboard enrollment error:",
        enrollmentError
      )

      return NextResponse.json(
        { error: "Gagal mengambil data siswa." },
        { status: 500 }
      )
    }

    const activeEnrollments = enrollments ?? []

    const studentIds = [
      ...new Set(
        activeEnrollments.map((enrollment) => enrollment.student_id)
      ),
    ]

    // =========================
    // STUDENTS
    // =========================
    let students: Array<{
      id: string
      student_name: string
      grade_level: string | null
      school_name: string | null
    }> = []

    if (studentIds.length > 0) {
      const { data: studentData, error: studentError } = await supabase
        .from("students")
        .select(`
          id,
          student_name,
          grade_level,
          school_name
        `)
        .in("id", studentIds)

      if (studentError) {
        console.error(
          "Tutor dashboard student error:",
          studentError
        )

        return NextResponse.json(
          { error: "Gagal mengambil data siswa." },
          { status: 500 }
        )
      }

      students = studentData ?? []
    }

    // =========================
    // ATTENDANCE
    // =========================
    const enrollmentIds = activeEnrollments.map(
      (enrollment) => enrollment.id
    )

    let attendance: Array<{
      enrollment_id: string
      status: string
    }> = []

    if (enrollmentIds.length > 0) {
      const { data: attendanceData, error: attendanceError } =
        await supabase
          .from("student_attendance")
          .select(`
            enrollment_id,
            status
          `)
          .in("enrollment_id", enrollmentIds)

      if (attendanceError) {
        console.error(
          "Tutor dashboard attendance error:",
          attendanceError
        )

        return NextResponse.json(
          { error: "Gagal mengambil data kehadiran." },
          { status: 500 }
        )
      }

      attendance = attendanceData ?? []
    }

    const totalAttendance = attendance.length

    const presentAttendance = attendance.filter(
      (item) => item.status === "HADIR"
    ).length

    const attendancePercentage =
      totalAttendance > 0
        ? Math.round(
            (presentAttendance / totalAttendance) * 100
          )
        : 0

    // =========================
    // GRADES
    // =========================
    let grades: Array<{
      enrollment_id: string
      subject: string | null
      score: number | null
    }> = []

    if (enrollmentIds.length > 0) {
      const { data: gradeData, error: gradeError } = await supabase
        .from("grades")
        .select(`
          enrollment_id,
          subject,
          score
        `)
        .in("enrollment_id", enrollmentIds)

      if (gradeError) {
        console.error(
          "Tutor dashboard grades error:",
          gradeError
        )

        return NextResponse.json(
          { error: "Gagal mengambil data nilai." },
          { status: 500 }
        )
      }

      grades = gradeData ?? []
    }

    // =========================
    // LEARNING MODULES
    // =========================
    const { data: modules, error: modulesError } = await supabase
      .from("learning_modules")
      .select(`
        id,
        class_id,
        title,
        description,
        file_url,
        created_at
      `)
      .in("class_id", classIds)
      .order("created_at", { ascending: false })

    if (modulesError) {
      console.error(
        "Tutor dashboard modules error:",
        modulesError
      )

      return NextResponse.json(
        { error: "Gagal mengambil data modul." },
        { status: 500 }
      )
    }

    const tutorModules = modules ?? []

    // =========================
    // CLASS SUMMARY
    // =========================
    const classesWithStats = tutorClasses.map((classItem) => {
      const classEnrollments = activeEnrollments.filter(
        (enrollment) => enrollment.class_id === classItem.id
      )

      const classEnrollmentIds = classEnrollments.map(
        (enrollment) => enrollment.id
      )

      const classAttendance = attendance.filter((item) =>
        classEnrollmentIds.includes(item.enrollment_id)
      )

      const classPresent = classAttendance.filter(
        (item) => item.status === "HADIR"
      ).length

      const classAttendancePercentage =
        classAttendance.length > 0
          ? Math.round(
              (classPresent / classAttendance.length) * 100
            )
          : 0

      const classModuleCount = tutorModules.filter(
        (module) => module.class_id === classItem.id
      ).length

      return {
        ...classItem,
        student_count: classEnrollments.length,
        attendance_percentage: classAttendancePercentage,
        module_count: classModuleCount,
      }
    })

    // =========================
    // RECENT MODULES
    // =========================
    const classMap = new Map(
      tutorClasses.map((item) => [item.id, item])
    )

    const recentModules = tutorModules
      .slice(0, 5)
      .map((module) => ({
        ...module,
        class: classMap.get(module.class_id) ?? null,
      }))

    // =========================
    // RESPONSE
    // =========================
    return NextResponse.json({
      tutor: {
        id: user.id,
        full_name: profile.full_name,
      },

      summary: {
        total_classes: tutorClasses.length,
        total_students: students.length,
        total_attendance: totalAttendance,
        present_attendance: presentAttendance,
        attendance_percentage: attendancePercentage,
        total_modules: tutorModules.length,
        total_grades: grades.length,
      },

      classes: classesWithStats,

      recent_modules: recentModules,
    })
  } catch (error) {
    console.error("Tutor dashboard unexpected error:", error)

    return NextResponse.json(
      { error: "Terjadi kesalahan pada server." },
      { status: 500 }
    )
  }
}