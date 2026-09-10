import { NextRequest, NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'

type Params = {
  params: Promise<{
    id: string
  }>
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

export async function GET(
  _request: NextRequest,
  { params }: Params,
) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json(
        {
          error:
            'ID anak tidak ditemukan.',
        },
        { status: 400 },
      )
    }

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
          error:
            'Gagal memverifikasi akun.',
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
    // 3. CRITICAL OWNERSHIP CHECK
    // ============================================

    const {
      data: student,
      error: studentError,
    } = await supabase
      .from('students')
      .select(
        `
          id,
          student_name,
          grade_level,
          school_name,
          phone_number,
          status
        `,
      )
      .eq('id', id)
      .eq('parent_id', user.id)
      .single()

    if (studentError || !student) {
      return NextResponse.json(
        {
          error:
            'Anak tidak ditemukan.',
        },
        { status: 404 },
      )
    }

    // ============================================
    // 4. GET ENROLLMENTS
    // ============================================

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
      .eq('student_id', student.id)

    if (enrollmentError) {
      console.error(enrollmentError)

      return NextResponse.json(
        {
          error:
            'Gagal mengambil data kelas.',
        },
        { status: 500 },
      )
    }

    const enrollmentRows =
      (enrollments ??
        []) as EnrollmentRow[]

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
    // 7. OVERALL STATISTICS
    // ============================================

    const validScores =
      gradeRows
        .map((item) =>
          Number(item.score),
        )
        .filter((score) =>
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

    // ============================================
    // 8. GRADES DETAIL
    // ============================================

    const gradesDetail = gradeRows.map(
      (grade) => {
        const enrollment =
          enrollmentRows.find(
            (item) =>
              item.id ===
              grade.enrollment_id,
          )

        const classInfo =
          classRows.find(
            (item) =>
              item.id ===
              enrollment?.class_id,
          )

        const score =
          Number(grade.score)

        return {
          enrollment_id:
            grade.enrollment_id,
          class_id:
            enrollment?.class_id ??
            null,
          class_name:
            classInfo?.class_name ??
            'Kelas',
          subject:
            grade.subject ||
            classInfo?.subject ||
            '-',
          score: Number.isFinite(score)
            ? score
            : 0,
        }
      },
    )

    // ============================================
    // 9. PER CLASS
    // ============================================

    const classPerformance =
      enrollmentRows
        .filter(
          (item) =>
            item.status === 'ACTIVE',
        )
        .map((enrollment) => {
          const classInfo =
            classRows.find(
              (item) =>
                item.id ===
                enrollment.class_id,
            )

          const grades =
            gradesDetail.filter(
              (item) =>
                item.enrollment_id ===
                enrollment.id,
            )

          const scores =
            grades.map(
              (item) => item.score,
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
          }
        })

    // ============================================
    // 10. SUBJECT SUMMARY
    // ============================================

    const subjectMap =
      new Map<
        string,
        {
          subject: string
          scores: number[]
        }
      >()

    gradesDetail.forEach((grade) => {
      const subject =
        grade.subject || '-'

      const existing =
        subjectMap.get(subject)

      if (existing) {
        existing.scores.push(
          grade.score,
        )
      } else {
        subjectMap.set(subject, {
          subject,
          scores: [grade.score],
        })
      }
    })

    const subjects = Array.from(
      subjectMap.values(),
    ).map((item) => {
      const average =
        item.scores.length > 0
          ? Math.round(
              (item.scores.reduce(
                (sum, score) =>
                  sum + score,
                0,
              ) /
                item.scores.length) *
                10,
            ) / 10
          : 0

      return {
        subject: item.subject,
        average,
        total_grades:
          item.scores.length,
      }
    })

    subjects.sort(
      (a, b) =>
        b.average - a.average,
    )

    // ============================================
    // 11. RESPONSE
    // ============================================

    return NextResponse.json({
      parent: {
        id: user.id,
        full_name:
          profile.full_name,
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
        average_score:
          averageScore,
        highest_score:
          highestScore,
        lowest_score:
          lowestScore,
        total_grades:
          totalGrades,
        needs_attention:
          totalGrades > 0 &&
          averageScore < 70,
      },

      grades:
        gradesDetail,

      classes:
        classPerformance,

      subjects,
    })
  } catch (error) {
    console.error(
      'Parent grades detail API error:',
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