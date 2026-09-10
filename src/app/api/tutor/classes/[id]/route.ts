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
    // PARAM
    // =========================
    const { id } = await context.params

    if (!id) {
      return NextResponse.json(
        { error: "ID kelas tidak valid" },
        { status: 400 }
      )
    }

    // =========================
    // GET CLASS
    // tutor_id = user.id
    // IMPORTANT: prevents accessing
    // another tutor's class
    // =========================
    const { data: classData, error: classError } = await supabase
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
      .eq("id", id)
      .eq("tutor_id", user.id)
      .single()

    if (classError || !classData) {
      return NextResponse.json(
        { error: "Kelas tidak ditemukan atau bukan kelas Anda" },
        { status: 404 }
      )
    }

    // =========================
    // GET ENROLLMENTS
    // =========================
    const { data: enrollments, error: enrollmentError } = await supabase
      .from("class_enrollments")
      .select("id, class_id, student_id, status")
      .eq("class_id", id)
      .eq("status", "ACTIVE")

    if (enrollmentError) {
      console.error("GET CLASS ENROLLMENTS ERROR:", enrollmentError)

      return NextResponse.json(
        { error: "Gagal mengambil data siswa" },
        { status: 500 }
      )
    }

    const enrollmentList = enrollments ?? []

    const enrollmentIds = enrollmentList.map(
      (item) => item.id
    )

    const studentIds = enrollmentList.map(
      (item) => item.student_id
    )

    // =========================
    // GET STUDENTS
    // =========================
    let students: {
      id: string
      student_name: string
      grade_level: string | null
      school_name: string | null
      phone_number: string | null
      status: string | null
    }[] = []

    if (studentIds.length > 0) {
      const { data: studentData, error: studentError } =
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
          .in("id", studentIds)

      if (studentError) {
        console.error("GET STUDENTS ERROR:", studentError)

        return NextResponse.json(
          { error: "Gagal mengambil data siswa" },
          { status: 500 }
        )
      }

      students = studentData ?? []
    }

    // =========================
    // GET ATTENDANCE
    // =========================
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
    // GET GRADES
    // =========================
    let grades: {
      enrollment_id: string
      subject: string
      score: number
    }[] = []

    if (enrollmentIds.length > 0) {
      const { data: gradeData, error: gradeError } =
        await supabase
          .from("grades")
          .select(`
            enrollment_id,
            subject,
            score
          `)
          .in("enrollment_id", enrollmentIds)

      if (gradeError) {
        console.error("GET GRADES ERROR:", gradeError)

        return NextResponse.json(
          { error: "Gagal mengambil data nilai" },
          { status: 500 }
        )
      }

      grades = gradeData ?? []
    }

    // =========================
    // GET LEARNING MODULES
    // =========================
    const { data: modules, error: modulesError } =
      await supabase
        .from("learning_modules")
        .select(`
          id,
          class_id,
          tutor_id,
          title,
          description,
          file_url,
          created_at,
          updated_at
        `)
        .eq("class_id", id)
        .eq("tutor_id", user.id)
        .order("created_at", { ascending: false })

    if (modulesError) {
      console.error("GET MODULES ERROR:", modulesError)

      return NextResponse.json(
        { error: "Gagal mengambil modul pembelajaran" },
        { status: 500 }
      )
    }

    // =========================
    // STUDENT DETAILS
    // =========================
    const formattedStudents = students.map((student) => {
      const enrollment = enrollmentList.find(
        (item) => item.student_id === student.id
      )

      const studentAttendance = attendanceList.filter(
        (attendance) =>
          attendance.enrollment_id === enrollment?.id
      )

      const totalAttendance = studentAttendance.length

      const presentAttendance = studentAttendance.filter(
        (attendance) => attendance.status === "HADIR"
      ).length

      const attendanceRate =
        totalAttendance > 0
          ? Math.round(
              (presentAttendance / totalAttendance) * 100
            )
          : 0

      const studentGrades = grades.filter(
        (grade) => grade.enrollment_id === enrollment?.id
      )

      const averageScore =
        studentGrades.length > 0
          ? Math.round(
              studentGrades.reduce(
                (sum, grade) => sum + Number(grade.score),
                0
              ) / studentGrades.length
            )
          : null

      return {
        id: student.id,
        enrollment_id: enrollment?.id ?? null,
        student_name: student.student_name,
        grade_level: student.grade_level,
        school_name: student.school_name,
        phone_number: student.phone_number,
        status: student.status,
        attendance_rate: attendanceRate,
        average_score: averageScore,
      }
    })

    // =========================
    // SUMMARY
    // =========================
    const totalAttendance = attendanceList.length

    const presentAttendance = attendanceList.filter(
      (attendance) => attendance.status === "HADIR"
    ).length

    const attendancePercentage =
      totalAttendance > 0
        ? Math.round(
            (presentAttendance / totalAttendance) * 100
          )
        : 0

    const averageClassScore =
      grades.length > 0
        ? Math.round(
            grades.reduce(
              (sum, grade) => sum + Number(grade.score),
              0
            ) / grades.length
          )
        : null

    return NextResponse.json({
      tutor: {
        id: profile.id,
        full_name: profile.full_name,
      },

      class: {
        id: classData.id,
        class_name: classData.class_name,
        subject: classData.subject,
        description: classData.description,
        schedule_day: classData.schedule_day,
        schedule_start: classData.schedule_start,
        schedule_end: classData.schedule_end,
        status: classData.status,
        created_at: classData.created_at,
        updated_at: classData.updated_at,
      },

      summary: {
        total_students: enrollmentList.length,
        total_attendance: totalAttendance,
        present_attendance: presentAttendance,
        attendance_percentage: attendancePercentage,
        total_grades: grades.length,
        average_score: averageClassScore,
        total_modules: modules?.length ?? 0,
      },

      students: formattedStudents,
      grades,
      modules: modules ?? [],
    })
  } catch (error) {
    console.error("TUTOR CLASS DETAIL API ERROR:", error)

    return NextResponse.json(
      { error: "Terjadi kesalahan pada server" },
      { status: 500 }
    )
  }
}