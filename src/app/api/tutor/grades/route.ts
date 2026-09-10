import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

type GradeRow = {
  enrollment_id: string
  subject: string | null
  score: number | null
}

type EnrollmentRow = {
  id: string
  class_id: string
  student_id: string
  status: string | null
}

type StudentRow = {
  id: string
  student_name: string
  grade_level: string | null
  school_name: string | null
  status: string | null
}

type ClassRow = {
  id: string
  class_name: string
  subject: string
  schedule_day: string | null
  schedule_start: string | null
  schedule_end: string | null
  status: string
}

export async function GET() {
  try {
    const supabase = await createClient()

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
        { error: "Akses hanya untuk tutor." },
        { status: 403 }
      )
    }

    // ---------------------------------------------------------
    // 1. Ambil kelas milik tutor
    // ---------------------------------------------------------
    const { data: classes, error: classesError } = await supabase
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
      .eq("tutor_id", user.id)

    if (classesError) {
      console.error("Grades classes error:", classesError)

      return NextResponse.json(
        { error: "Gagal mengambil data kelas." },
        { status: 500 }
      )
    }

    const tutorClasses = (classes ?? []) as ClassRow[]

    if (tutorClasses.length === 0) {
      return NextResponse.json({
        tutor: {
          id: user.id,
          full_name: profile.full_name,
        },
        summary: {
          total_students: 0,
          total_grades: 0,
          average_score: 0,
          passed_count: 0,
          below_count: 0,
        },
        classes: [],
        students: [],
      })
    }

    const classIds = tutorClasses.map((item) => item.id)

    // ---------------------------------------------------------
    // 2. Ambil enrollment aktif dari kelas tutor
    // ---------------------------------------------------------
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
        .in("class_id", classIds)
        .eq("status", "ACTIVE")

    if (enrollmentsError) {
      console.error(
        "Grades enrollments error:",
        enrollmentsError
      )

      return NextResponse.json(
        { error: "Gagal mengambil data enrollment." },
        { status: 500 }
      )
    }

    const activeEnrollments =
      (enrollments ?? []) as EnrollmentRow[]

    if (activeEnrollments.length === 0) {
      return NextResponse.json({
        tutor: {
          id: user.id,
          full_name: profile.full_name,
        },
        summary: {
          total_students: 0,
          total_grades: 0,
          average_score: 0,
          passed_count: 0,
          below_count: 0,
        },
        classes: tutorClasses.map((item) => ({
          ...item,
          student_count: 0,
          grade_count: 0,
          average_score: 0,
        })),
        students: [],
      })
    }

    const enrollmentIds = activeEnrollments.map(
      (item) => item.id
    )

    const studentIds = [
      ...new Set(
        activeEnrollments.map((item) => item.student_id)
      ),
    ]

    // ---------------------------------------------------------
    // 3. Ambil siswa
    // ---------------------------------------------------------
    const { data: students, error: studentsError } =
      await supabase
        .from("students")
        .select(
          `
          id,
          student_name,
          grade_level,
          school_name,
          status
          `
        )
        .in("id", studentIds)

    if (studentsError) {
      console.error("Grades students error:", studentsError)

      return NextResponse.json(
        { error: "Gagal mengambil data siswa." },
        { status: 500 }
      )
    }

    const studentRows = (students ?? []) as StudentRow[]

    // ---------------------------------------------------------
    // 4. Ambil grades
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
      console.error("Grades query error:", gradesError)

      return NextResponse.json(
        { error: "Gagal mengambil data nilai." },
        { status: 500 }
      )
    }

    const gradeRows = (grades ?? []) as GradeRow[]

    // ---------------------------------------------------------
    // 5. Mapping helper
    // ---------------------------------------------------------
    const classMap = new Map(
      tutorClasses.map((item) => [item.id, item])
    )

    const studentMap = new Map(
      studentRows.map((item) => [item.id, item])
    )

    const enrollmentMap = new Map(
      activeEnrollments.map((item) => [item.id, item])
    )

    // ---------------------------------------------------------
    // 6. Group grades berdasarkan student
    // ---------------------------------------------------------
    const gradesByStudent = new Map<string, GradeRow[]>()

    for (const grade of gradeRows) {
      const enrollment = enrollmentMap.get(
        grade.enrollment_id
      )

      if (!enrollment) continue

      const current =
        gradesByStudent.get(enrollment.student_id) ?? []

      current.push(grade)

      gradesByStudent.set(
        enrollment.student_id,
        current
      )
    }

    // ---------------------------------------------------------
    // 7. Student response
    // ---------------------------------------------------------
    const studentResponse = studentRows
      .map((student) => {
        const studentEnrollments = activeEnrollments.filter(
          (item) => item.student_id === student.id
        )

        const studentGrades =
          gradesByStudent.get(student.id) ?? []

        const validScores = studentGrades
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
            : null

        const classesForStudent = studentEnrollments
          .map((enrollment) =>
            classMap.get(enrollment.class_id)
          )
          .filter(
            (item): item is ClassRow =>
              Boolean(item)
          )

        return {
          student_id: student.id,
          student_name: student.student_name,
          grade_level: student.grade_level,
          school_name: student.school_name,
          status: student.status,
          class_count: classesForStudent.length,

          classes: classesForStudent.map((item) => ({
            id: item.id,
            class_name: item.class_name,
            subject: item.subject,
            schedule_day: item.schedule_day,
            schedule_start: item.schedule_start,
            schedule_end: item.schedule_end,
            status: item.status,
          })),

          average_score: averageScore,
          total_grades: totalGrades,
          passed_count: validScores.filter(
            (score) => score >= 70
          ).length,
          below_count: validScores.filter(
            (score) => score < 70
          ).length,
        }
      })
      .sort((a, b) =>
        a.student_name.localeCompare(
          b.student_name,
          "id"
        )
      )

    // ---------------------------------------------------------
    // 8. Summary global
    // ---------------------------------------------------------
    const allScores = gradeRows
      .map((item) => item.score)
      .filter(
        (score): score is number =>
          typeof score === "number" &&
          Number.isFinite(score)
      )

    const totalGrades = allScores.length

    const averageScore =
      totalGrades > 0
        ? Number(
            (
              allScores.reduce(
                (sum, score) => sum + score,
                0
              ) / totalGrades
            ).toFixed(2)
          )
        : 0

    const passedCount = allScores.filter(
      (score) => score >= 70
    ).length

    const belowCount = allScores.filter(
      (score) => score < 70
    ).length

    // ---------------------------------------------------------
    // 9. Summary per class
    // ---------------------------------------------------------
    const classResponse = tutorClasses.map((item) => {
      const classEnrollments = activeEnrollments.filter(
        (enrollment) =>
          enrollment.class_id === item.id
      )

      const classEnrollmentIds = new Set(
        classEnrollments.map(
          (enrollment) => enrollment.id
        )
      )

      const classGrades = gradeRows.filter((grade) =>
        classEnrollmentIds.has(
          grade.enrollment_id
        )
      )

      const classScores = classGrades
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
        id: item.id,
        class_name: item.class_name,
        subject: item.subject,
        schedule_day: item.schedule_day,
        schedule_start: item.schedule_start,
        schedule_end: item.schedule_end,
        status: item.status,
        student_count: classEnrollments.length,
        grade_count: classScores.length,
        average_score: classAverage,
      }
    })

    return NextResponse.json({
      tutor: {
        id: user.id,
        full_name: profile.full_name,
      },

      summary: {
        total_students: studentResponse.length,
        total_grades: totalGrades,
        average_score: averageScore,
        passed_count: passedCount,
        below_count: belowCount,
      },

      classes: classResponse,
      students: studentResponse,
    })
  } catch (error) {
    console.error("Tutor grades API error:", error)

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