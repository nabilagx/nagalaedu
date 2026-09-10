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
        { error: "ID siswa tidak valid" },
        { status: 400 }
      )
    }

    // =========================
    // GET TUTOR CLASSES
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

    if (classesError) {
      console.error("GET CLASSES ERROR:", classesError)

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
    // GET ENROLLMENTS
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
        "GET STUDENT ENROLLMENTS ERROR:",
        enrollmentError
      )

      return NextResponse.json(
        { error: "Gagal mengambil data pendaftaran siswa" },
        { status: 500 }
      )
    }

    const enrollmentList = enrollments ?? []

    // =========================
    // SECURITY:
    // Student must belong to
    // at least one class of
    // current tutor
    // =========================
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
          status,
          created_at,
          updated_at
        `)
        .eq("id", id)
        .single()

    if (studentError || !student) {
      return NextResponse.json(
        { error: "Data siswa tidak ditemukan" },
        { status: 404 }
      )
    }

    // =========================
    // ACTIVE ENROLLMENTS
    // =========================
    const activeEnrollments =
      enrollmentList.filter(
        (item) => item.status === "ACTIVE"
      )

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
        "GET STUDENT ATTENDANCE ERROR:",
        attendanceError
      )

      return NextResponse.json(
        { error: "Gagal mengambil data kehadiran" },
        { status: 500 }
      )
    }

    const attendanceList = attendance ?? []

    // =========================
    // GET GRADES
    // =========================
    const { data: grades, error: gradesError } =
      await supabase
        .from("grades")
        .select(`
          enrollment_id,
          subject,
          score
        `)
        .in("enrollment_id", enrollmentIds)

    if (gradesError) {
      console.error(
        "GET STUDENT GRADES ERROR:",
        gradesError
      )

      return NextResponse.json(
        { error: "Gagal mengambil data nilai" },
        { status: 500 }
      )
    }

    const gradeList = grades ?? []

    // =========================
    // GET MODULES
    // =========================
    const tutorClassIds = [
      ...new Set(
        enrollmentList.map(
          (item) => item.class_id
        )
      ),
    ]

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
        .in("class_id", tutorClassIds)
        .eq("tutor_id", user.id)
        .order("created_at", {
          ascending: false,
        })

    if (modulesError) {
      console.error(
        "GET STUDENT MODULES ERROR:",
        modulesError
      )

      return NextResponse.json(
        { error: "Gagal mengambil data modul" },
        { status: 500 }
      )
    }

    // =========================
    // CLASS DETAILS
    // =========================
    const studentClasses = classList
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

        const totalAttendance =
          classAttendance.length

        const presentAttendance =
          classAttendance.filter(
            (item) =>
              item.status === "HADIR"
          ).length

        const attendanceRate =
          totalAttendance > 0
            ? Math.round(
                (presentAttendance /
                  totalAttendance) *
                  100
              )
            : 0

        const classGrades =
          gradeList.filter(
            (grade) =>
              grade.enrollment_id ===
              enrollment?.id
          )

        const averageScore =
          classGrades.length > 0
            ? Math.round(
                classGrades.reduce(
                  (sum, grade) =>
                    sum +
                    Number(grade.score),
                  0
                ) /
                  classGrades.length
              )
            : null

        return {
          id: classItem.id,
          enrollment_id:
            enrollment?.id ?? null,
          class_name:
            classItem.class_name,
          subject: classItem.subject,
          description:
            classItem.description,
          schedule_day:
            classItem.schedule_day,
          schedule_start:
            classItem.schedule_start,
          schedule_end:
            classItem.schedule_end,
          status: classItem.status,
          attendance_rate:
            attendanceRate,
          average_score:
            averageScore,
        }
      })

    // =========================
    // OVERALL ATTENDANCE
    // =========================
    const totalAttendance =
      attendanceList.length

    const presentAttendance =
      attendanceList.filter(
        (item) => item.status === "HADIR"
      ).length

    const attendancePercentage =
      totalAttendance > 0
        ? Math.round(
            (presentAttendance /
              totalAttendance) *
              100
          )
        : 0

    // =========================
    // OVERALL SCORE
    // =========================
    const averageScore =
      gradeList.length > 0
        ? Math.round(
            gradeList.reduce(
              (sum, grade) =>
                sum + Number(grade.score),
              0
            ) / gradeList.length
          )
        : null

    // =========================
    // FORMAT GRADES
    // =========================
    const formattedGrades =
      gradeList.map((grade) => {
        const enrollment =
          enrollmentList.find(
            (item) =>
              item.id ===
              grade.enrollment_id
          )

        const classItem =
          classList.find(
            (item) =>
              item.id ===
              enrollment?.class_id
          )

        return {
          enrollment_id:
            grade.enrollment_id,
          class_id:
            classItem?.id ?? null,
          class_name:
            classItem?.class_name ??
            "Kelas",
          subject: grade.subject,
          score: Number(grade.score),
        }
      })

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
        created_at:
          student.created_at,
        updated_at:
          student.updated_at,
      },

      summary: {
        total_classes:
          studentClasses.length,
        active_classes:
          activeEnrollments.length,
        total_attendance:
          totalAttendance,
        present_attendance:
          presentAttendance,
        attendance_percentage:
          attendancePercentage,
        total_grades:
          gradeList.length,
        average_score:
          averageScore,
        total_modules:
          modules?.length ?? 0,
      },

      classes: studentClasses,

      attendance: attendanceList,

      grades: formattedGrades,

      modules: modules ?? [],
    })
  } catch (error) {
    console.error(
      "TUTOR STUDENT DETAIL API ERROR:",
      error
    )

    return NextResponse.json(
      { error: "Terjadi kesalahan pada server" },
      { status: 500 }
    )
  }
}