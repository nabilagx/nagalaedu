import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type AttendanceRow = {
  enrollment_id: string
  status: string
}

type GradeRow = {
  enrollment_id: string
  score: number | null
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
        { error: 'Unauthorized.' },
        { status: 401 },
      )
    }

    // Pastikan akun adalah Parent
    const { data: profile, error: profileError } =
      await supabase
        .from('profiles')
        .select('id, full_name, role_id')
        .eq('id', user.id)
        .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Profil orang tua tidak ditemukan.' },
        { status: 404 },
      )
    }

    if (profile.role_id !== 3) {
      return NextResponse.json(
        { error: 'Akses hanya untuk akun orang tua.' },
        { status: 403 },
      )
    }

    /*
     * ============================================================
     * AMBIL ANAK
     *
     * SECURITY:
     * parent_id HARUS sama dengan auth.uid()
     * ============================================================
     */

    const { data: students, error: studentsError } =
      await supabase
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
        .eq('parent_id', user.id)
        .order('student_name', { ascending: true })

    if (studentsError) {
      console.error('Parent children error:', studentsError)

      return NextResponse.json(
        { error: 'Gagal mengambil data anak.' },
        { status: 500 },
      )
    }

    const studentRows = students ?? []

    if (studentRows.length === 0) {
      return NextResponse.json({
        children: [],
      })
    }

    const studentIds = studentRows.map(
      (student) => student.id,
    )

    /*
     * ============================================================
     * ENROLLMENTS
     * ============================================================
     */

    const { data: enrollments, error: enrollmentError } =
      await supabase
        .from('class_enrollments')
        .select(
          `
            id,
            class_id,
            student_id,
            status
          `,
        )
        .in('student_id', studentIds)

    if (enrollmentError) {
      console.error(
        'Parent enrollment error:',
        enrollmentError,
      )

      return NextResponse.json(
        { error: 'Gagal mengambil data kelas.' },
        { status: 500 },
      )
    }

    const enrollmentRows = enrollments ?? []

    const activeEnrollments = enrollmentRows.filter(
      (item) => item.status === 'ACTIVE',
    )

    const enrollmentIds = activeEnrollments.map(
      (item) => item.id,
    )

    /*
     * ============================================================
     * ATTENDANCE
     * ============================================================
     */

    let attendanceRows: AttendanceRow[] = []

    if (enrollmentIds.length > 0) {
      const { data: attendance, error: attendanceError } =
        await supabase
          .from('student_attendance')
          .select(
            `
              enrollment_id,
              status
            `,
          )
          .in('enrollment_id', enrollmentIds)

      if (attendanceError) {
        console.error(
          'Parent attendance error:',
          attendanceError,
        )

        return NextResponse.json(
          { error: 'Gagal mengambil data kehadiran.' },
          { status: 500 },
        )
      }

      attendanceRows = attendance ?? []
    }

    /*
     * ============================================================
     * GRADES
     * ============================================================
     */

    let gradeRows: GradeRow[] = []

    if (enrollmentIds.length > 0) {
      const { data: grades, error: gradesError } =
        await supabase
          .from('grades')
          .select(
            `
              enrollment_id,
              score
            `,
          )
          .in('enrollment_id', enrollmentIds)

      if (gradesError) {
        console.error(
          'Parent grades error:',
          gradesError,
        )

        return NextResponse.json(
          { error: 'Gagal mengambil data nilai.' },
          { status: 500 },
        )
      }

      gradeRows = grades ?? []
    }

    /*
     * ============================================================
     * HASIL PER ANAK
     * ============================================================
     */

    const children = studentRows.map((student) => {
      const studentEnrollments =
        activeEnrollments.filter(
          (item) =>
            item.student_id === student.id,
        )

      const studentEnrollmentIds =
        studentEnrollments.map(
          (item) => item.id,
        )

      const attendance =
        attendanceRows.filter((item) =>
          studentEnrollmentIds.includes(
            item.enrollment_id,
          ),
        )

      const grades =
        gradeRows.filter((item) =>
          studentEnrollmentIds.includes(
            item.enrollment_id,
          ),
        )

      const hadir = attendance.filter(
        (item) => item.status === 'HADIR',
      ).length

      const alpha = attendance.filter(
        (item) => item.status === 'ALPHA',
      ).length

      const attendanceRate =
        attendance.length > 0
          ? Number(
              (
                (hadir / attendance.length) *
                100
              ).toFixed(1),
            )
          : 0

      const scores = grades
        .map((item) => Number(item.score))
        .filter((score) =>
          Number.isFinite(score),
        )

      const averageScore =
        scores.length > 0
          ? Number(
              (
                scores.reduce(
                  (sum, score) =>
                    sum + score,
                  0,
                ) / scores.length
              ).toFixed(1),
            )
          : 0

      return {
        id: student.id,
        student_name: student.student_name,
        grade_level: student.grade_level,
        school_name: student.school_name,
        phone_number: student.phone_number,
        status: student.status,

        academic: {
          class_count:
            studentEnrollments.length,
          attendance_rate:
            attendanceRate,
          average_score:
            averageScore,
          total_grades:
            scores.length,
          needs_attention:
            attendanceRate < 80 ||
            averageScore < 70 ||
            alpha > 0,
        },
      }
    })

    return NextResponse.json({
      children,
    })
  } catch (error) {
    console.error(
      'Parent children unexpected error:',
      error,
    )

    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server.' },
      { status: 500 },
    )
  }
}