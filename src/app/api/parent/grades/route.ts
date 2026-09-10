import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'

type StudentRow = {
  id: string
  student_name: string
  grade_level: string | null
  school_name: string | null
  status: string | null
}

type EnrollmentRow = {
  id: string
  student_id: string
  class_id: string
  status: string | null
}

type ClassRow = {
  id: string
  class_name: string
  subject: string
  status: string | null
}

type GradeRow = {
  enrollment_id: string
  subject: string
  score: number | null
}

export async function GET() {
  try {
    const supabase = await createClient()

    // ============================================
    // 1. AUTHENTICATION
    // ============================================

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        {
          error: 'Unauthorized',
        },
        { status: 401 },
      )
    }

    // ============================================
    // 2. VERIFY PARENT ROLE
    // ============================================

    const {
      data: profile,
      error: profileError,
    } = await supabase
      .from('profiles')
      .select('role_id, full_name')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      console.error(profileError)

      return NextResponse.json(
        {
          error: 'Gagal memverifikasi akun.',
        },
        { status: 500 },
      )
    }

    if (profile.role_id !== 3) {
      return NextResponse.json(
        {
          error: 'Akses ditolak.',
        },
        { status: 403 },
      )
    }

    // ============================================
    // 3. GET OWN CHILDREN
    // ============================================

    const {
      data: students,
      error: studentError,
    } = await supabase
      .from('students')
      .select(
        `
          id,
          student_name,
          grade_level,
          school_name,
          status
        `,
      )
      .eq('parent_id', user.id)
      .order('student_name', {
        ascending: true,
      })

    if (studentError) {
      console.error(studentError)

      return NextResponse.json(
        {
          error: 'Gagal mengambil data anak.',
        },
        { status: 500 },
      )
    }

    const studentRows =
      (students ?? []) as StudentRow[]

    if (studentRows.length === 0) {
      return NextResponse.json({
        children: [],
      })
    }

    // ============================================
    // 4. GET ENROLLMENTS
    // ============================================

    const studentIds = studentRows.map(
      (student) => student.id,
    )

    const {
      data: enrollments,
      error: enrollmentError,
    } = await supabase
      .from('class_enrollments')
      .select(
        `
          id,
          student_id,
          class_id,
          status
        `,
      )
      .in('student_id', studentIds)

    if (enrollmentError) {
      console.error(enrollmentError)

      return NextResponse.json(
        {
          error: 'Gagal mengambil data kelas.',
        },
        { status: 500 },
      )
    }

    const enrollmentRows =
      (enrollments ?? []) as EnrollmentRow[]

    const enrollmentIds =
      enrollmentRows.map(
        (item) => item.id,
      )

    // ============================================
    // 5. GET CLASSES
    // ============================================

    const classIds = [
      ...new Set(
        enrollmentRows.map(
          (item) => item.class_id,
        ),
      ),
    ]

    let classRows: ClassRow[] = []

    if (classIds.length > 0) {
      const {
        data: classes,
        error: classError,
      } = await supabase
        .from('classes')
        .select(
          `
            id,
            class_name,
            subject,
            status
          `,
        )
        .in('id', classIds)

      if (classError) {
        console.error(classError)

        return NextResponse.json(
          {
            error:
              'Gagal mengambil data kelas.',
          },
          { status: 500 },
        )
      }

      classRows =
        (classes ?? []) as ClassRow[]
    }

    // ============================================
    // 6. GET GRADES
    // ============================================

    let gradeRows: GradeRow[] = []

    if (enrollmentIds.length > 0) {
      const {
        data: grades,
        error: gradeError,
      } = await supabase
        .from('grades')
        .select(
          `
            enrollment_id,
            subject,
            score
          `,
        )
        .in(
          'enrollment_id',
          enrollmentIds,
        )

      if (gradeError) {
        console.error(gradeError)

        return NextResponse.json(
          {
            error:
              'Gagal mengambil data nilai.',
          },
          { status: 500 },
        )
      }

      gradeRows =
        (grades ?? []) as GradeRow[]
    }

    // ============================================
    // 7. BUILD DATA PER CHILD
    // ============================================

    const children = studentRows.map(
      (student) => {
        const studentEnrollments =
          enrollmentRows.filter(
            (item) =>
              item.student_id ===
              student.id,
          )

        const studentEnrollmentIds =
          studentEnrollments.map(
            (item) => item.id,
          )

        const studentGrades =
          gradeRows.filter((item) =>
            studentEnrollmentIds.includes(
              item.enrollment_id,
            ),
          )

        const validScores =
          studentGrades
            .map((item) =>
              Number(item.score),
            )
            .filter(
              (score) =>
                Number.isFinite(score),
            )

        const totalGrades =
          validScores.length

        const averageScore =
          totalGrades > 0
            ? Math.round(
                (validScores.reduce(
                  (sum, score) =>
                    sum + score,
                  0,
                ) /
                  totalGrades) *
                  10,
              ) / 10
            : 0

        const highestScore =
          totalGrades > 0
            ? Math.max(...validScores)
            : 0

        const lowestScore =
          totalGrades > 0
            ? Math.min(...validScores)
            : 0

        const classPerformance =
          studentEnrollments
            .filter(
              (item) =>
                item.status ===
                'ACTIVE',
            )
            .map((enrollment) => {
              const classInfo =
                classRows.find(
                  (item) =>
                    item.id ===
                    enrollment.class_id,
                )

              const enrollmentGrades =
                studentGrades.filter(
                  (item) =>
                    item.enrollment_id ===
                    enrollment.id,
                )

              const scores =
                enrollmentGrades
                  .map((item) =>
                    Number(item.score),
                  )
                  .filter(
                    (score) =>
                      Number.isFinite(
                        score,
                      ),
                  )

              const average =
                scores.length > 0
                  ? Math.round(
                      (scores.reduce(
                        (sum, score) =>
                          sum + score,
                        0,
                      ) /
                        scores.length) *
                        10,
                    ) / 10
                  : 0

              return {
                enrollment_id:
                  enrollment.id,
                class_id:
                  enrollment.class_id,
                class_name:
                  classInfo?.class_name ??
                  'Kelas',
                subject:
                  classInfo?.subject ??
                  '-',
                average,
                total_grades:
                  scores.length,
                scores,
              }
            })

        const needsAttention =
          totalGrades > 0 &&
          averageScore < 70

        return {
          id: student.id,
          student_name:
            student.student_name,
          grade_level:
            student.grade_level,
          school_name:
            student.school_name,
          status: student.status,

          summary: {
            average_score:
              averageScore,
            highest_score:
              highestScore,
            lowest_score:
              lowestScore,
            total_grades:
              totalGrades,
            needs_attention:
              needsAttention,
          },

          classes:
            classPerformance,
        }
      },
    )

    // ============================================
    // 8. RESPONSE
    // ============================================

    return NextResponse.json({
      children,
    })
  } catch (error) {
    console.error(
      'Parent grades API error:',
      error,
    )

    return NextResponse.json(
      {
        error:
          'Terjadi kesalahan pada server.',
      },
      { status: 500 },
    )
  }
}