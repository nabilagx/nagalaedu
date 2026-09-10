import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

type Params = {
  params: Promise<{
    id: string
  }>
}

type EnrollmentRow = {
  id: string
  class_id: string
  student_id: string
  status: string | null
}

type ClassRow = {
  id: string
  class_name: string
  subject: string
  description: string | null
  schedule_day: string | null
  schedule_start: string | null
  schedule_end: string | null
  status: string
}

type StudentRow = {
  id: string
  student_name: string
  grade_level: string | null
  school_name: string | null
  phone_number: string | null
  status: string | null
}

type GradeRow = {
  enrollment_id: string
  subject: string | null
  score: number | null
}

export async function GET(
  _request: Request,
  { params }: Params
) {
  try {
    const { id: studentId } = await params

    if (!studentId) {
      return NextResponse.json(
        { error: "ID siswa tidak valid." },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // ---------------------------------------------------------
    // 1. Auth
    // ---------------------------------------------------------
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

    // ---------------------------------------------------------
    // 2. Role tutor
    // ---------------------------------------------------------
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
    // 3. Pastikan student memang punya enrollment
    //    di kelas tutor
    // ---------------------------------------------------------
    const { data: tutorClasses, error: classesError } =
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

    if (classesError) {
      console.error(
        "Grades detail classes error:",
        classesError
      )

      return NextResponse.json(
        { error: "Gagal mengambil kelas tutor." },
        { status: 500 }
      )
    }

    const classes = (tutorClasses ?? []) as ClassRow[]

    const classIds = classes.map((item) => item.id)

    if (classIds.length === 0) {
      return NextResponse.json(
        { error: "Siswa tidak ditemukan di kelas tutor." },
        { status: 404 }
      )
    }

    const { data: enrollments, error: enrollmentsError } =
      await supabase
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
        .in("class_id", classIds)
        .eq("status", "ACTIVE")

    if (enrollmentsError) {
      console.error(
        "Grades detail enrollments error:",
        enrollmentsError
      )

      return NextResponse.json(
        { error: "Gagal mengambil enrollment siswa." },
        { status: 500 }
      )
    }

    const activeEnrollments =
      (enrollments ?? []) as EnrollmentRow[]

    if (activeEnrollments.length === 0) {
      return NextResponse.json(
        {
          error:
            "Siswa tidak terdaftar di kelas yang Anda ajar.",
        },
        { status: 404 }
      )
    }

    const enrollmentIds = activeEnrollments.map(
      (item) => item.id
    )

    // ---------------------------------------------------------
    // 4. Ambil student
    // ---------------------------------------------------------
    const { data: student, error: studentError } =
      await supabase
        .from("students")
        .select(
          `
          id,
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
        { error: "Data siswa tidak ditemukan." },
        { status: 404 }
      )
    }

    const studentRow = student as StudentRow

    // ---------------------------------------------------------
    // 5. Ambil grades
    // ---------------------------------------------------------
    const { data: grades, error: gradesError } =
      await supabase
        .from("grades")
        .select(
          `
          enrollment_id,
          subject,
          score
          `
        )
        .in("enrollment_id", enrollmentIds)

    if (gradesError) {
      console.error(
        "Grades detail grades error:",
        gradesError
      )

      return NextResponse.json(
        { error: "Gagal mengambil data nilai." },
        { status: 500 }
      )
    }

    const gradeRows = (grades ?? []) as GradeRow[]

    const classMap = new Map(
      classes.map((item) => [item.id, item])
    )

    const enrollmentMap = new Map(
      activeEnrollments.map((item) => [
        item.id,
        item,
      ])
    )

    // ---------------------------------------------------------
    // 6. Detail nilai
    // ---------------------------------------------------------
    const gradeDetails = gradeRows
      .map((grade, index) => {
        const enrollment = enrollmentMap.get(
          grade.enrollment_id
        )

        if (!enrollment) return null

        const classInfo = classMap.get(
          enrollment.class_id
        )

        if (!classInfo) return null

        return {
          id: `${grade.enrollment_id}-${index}`,
          enrollment_id: grade.enrollment_id,
          class_id: classInfo.id,
          class_name: classInfo.class_name,
          class_subject: classInfo.subject,
          subject:
            grade.subject || classInfo.subject,
          score: grade.score,
        }
      })
      .filter(Boolean)

    // ---------------------------------------------------------
    // 7. Statistik
    // ---------------------------------------------------------
    const validScores = gradeRows
      .map((item) => item.score)
      .filter(
        (score): score is number =>
          typeof score === "number" &&
          Number.isFinite(score)
      )

    const totalGrades = validScores.length

    const averageScore =
      totalGrades > 0
        ? Number(
            (
              validScores.reduce(
                (sum, score) => sum + score,
                0
              ) / totalGrades
            ).toFixed(2)
          )
        : 0

    const highestScore =
      totalGrades > 0
        ? Math.max(...validScores)
        : 0

    const lowestScore =
      totalGrades > 0
        ? Math.min(...validScores)
        : 0

    const passedCount = validScores.filter(
      (score) => score >= 70
    ).length

    const belowCount = validScores.filter(
      (score) => score < 70
    ).length

    // ---------------------------------------------------------
    // 8. Kelas siswa
    // ---------------------------------------------------------
    const studentClasses = activeEnrollments
      .map((enrollment) => {
        const classInfo = classMap.get(
          enrollment.class_id
        )

        if (!classInfo) return null

        const classGradeRows = gradeRows.filter(
          (grade) =>
            grade.enrollment_id === enrollment.id
        )

        const classScores = classGradeRows
          .map((grade) => grade.score)
          .filter(
            (score): score is number =>
              typeof score === "number" &&
              Number.isFinite(score)
          )

        const classAverage =
          classScores.length > 0
            ? Number(
                (
                  classScores.reduce(
                    (sum, score) => sum + score,
                    0
                  ) / classScores.length
                ).toFixed(2)
              )
            : 0

        return {
          id: classInfo.id,
          class_name: classInfo.class_name,
          subject: classInfo.subject,
          description: classInfo.description,
          schedule_day: classInfo.schedule_day,
          schedule_start: classInfo.schedule_start,
          schedule_end: classInfo.schedule_end,
          status: classInfo.status,
          grade_count: classScores.length,
          average_score: classAverage,
        }
      })
      .filter(Boolean)

    return NextResponse.json({
      student: {
        id: studentRow.id,
        student_name: studentRow.student_name,
        grade_level: studentRow.grade_level,
        school_name: studentRow.school_name,
        phone_number: studentRow.phone_number,
        status: studentRow.status,
      },

      summary: {
        total_grades: totalGrades,
        average_score: averageScore,
        highest_score: highestScore,
        lowest_score: lowestScore,
        passed_count: passedCount,
        below_count: belowCount,
      },

      classes: studentClasses,
      grades: gradeDetails,
    })
  } catch (error) {
    console.error(
      "Tutor grades detail API error:",
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