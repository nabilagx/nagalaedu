import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type Params = {
  params: Promise<{
    id: string
  }>
}

export async function GET(
  _request: NextRequest,
  { params }: Params,
) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json(
        { error: 'ID anak tidak ditemukan.' },
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
        { error: 'Unauthorized' },
        { status: 401 },
      )
    }

    // ============================================
    // 2. VERIFY PARENT ROLE
    // ============================================

    const { data: profile, error: profileError } =
      await supabase
        .from('profiles')
        .select('role_id, full_name')
        .eq('id', user.id)
        .single()

    if (profileError) {
      console.error(profileError)

      return NextResponse.json(
        { error: 'Gagal memverifikasi akun.' },
        { status: 500 },
      )
    }

    if (profile?.role_id !== 3) {
      return NextResponse.json(
        { error: 'Akses ditolak.' },
        { status: 403 },
      )
    }

    // ============================================
    // 3. SECURITY CHECK
    //
    // Parent can ONLY access:
    // students.id === requested id
    // AND
    // students.parent_id === logged-in user
    // ============================================

    const { data: student, error: studentError } =
      await supabase
        .from('students')
        .select(
          `
            id,
            parent_id,
            student_name,
            grade_level,
            school_name,
            phone_number,
            status,
            created_at,
            updated_at
          `,
        )
        .eq('id', id)
        .eq('parent_id', user.id)
        .single()

    if (studentError || !student) {
      return NextResponse.json(
        { error: 'Anak tidak ditemukan.' },
        { status: 404 },
      )
    }

    // ============================================
    // 4. GET ENROLLMENTS
    // ============================================

    const { data: enrollments, error: enrollmentError } =
      await supabase
        .from('class_enrollments')
        .select(
          `
            id,
            class_id,
            status
          `,
        )
        .eq('student_id', student.id)

    if (enrollmentError) {
      console.error(enrollmentError)

      return NextResponse.json(
        { error: 'Gagal mengambil data kelas.' },
        { status: 500 },
      )
    }

    const enrollmentData = enrollments ?? []

    const activeEnrollments =
      enrollmentData.filter(
        (item) => item.status === 'ACTIVE',
      )

    const enrollmentIds =
      enrollmentData.map((item) => item.id)

    const classIds = [
      ...new Set(
        activeEnrollments.map(
          (item) => item.class_id,
        ),
      ),
    ]

    // ============================================
    // 5. GET CLASSES
    // ============================================

    let classes: Array<{
      id: string
      class_name: string
      subject: string
      status: string | null
    }> = []

    if (classIds.length > 0) {
      const { data: classRows, error: classError } =
        await supabase
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
          { error: 'Gagal mengambil data mata pelajaran.' },
          { status: 500 },
        )
      }

      classes = classRows ?? []
    }

    // ============================================
    // 6. GET ATTENDANCE
    // ============================================

    let attendance: Array<{
      enrollment_id: string
      status: string
    }> = []

    if (enrollmentIds.length > 0) {
      const {
        data: attendanceRows,
        error: attendanceError,
      } = await supabase
        .from('student_attendance')
        .select(
          `
            enrollment_id,
            status
          `,
        )
        .in('enrollment_id', enrollmentIds)

      if (attendanceError) {
        console.error(attendanceError)

        return NextResponse.json(
          { error: 'Gagal mengambil data kehadiran.' },
          { status: 500 },
        )
      }

      attendance = attendanceRows ?? []
    }

    // ============================================
    // 7. GET GRADES
    // ============================================

    let grades: Array<{
      enrollment_id: string
      subject: string
      score: number
    }> = []

    if (enrollmentIds.length > 0) {
      const { data: gradeRows, error: gradeError } =
        await supabase
          .from('grades')
          .select(
            `
              enrollment_id,
              subject,
              score
            `,
          )
          .in('enrollment_id', enrollmentIds)

      if (gradeError) {
        console.error(gradeError)

        return NextResponse.json(
          { error: 'Gagal mengambil data nilai.' },
          { status: 500 },
        )
      }

      grades = gradeRows ?? []
    }

    // ============================================
    // 8. ACADEMIC CALCULATION
    // ============================================

    const totalAttendance =
      attendance.length

    const presentCount =
      attendance.filter(
        (item) => item.status === 'HADIR',
      ).length

    const sickCount =
      attendance.filter(
        (item) => item.status === 'SAKIT',
      ).length

    const permissionCount =
      attendance.filter(
        (item) => item.status === 'IZIN',
      ).length

    const alphaCount =
      attendance.filter(
        (item) => item.status === 'ALPHA',
      ).length

    const attendancePercentage =
      totalAttendance > 0
        ? Math.round(
            (presentCount / totalAttendance) * 100,
          )
        : 0

    const averageScore =
      grades.length > 0
        ? Math.round(
            grades.reduce(
              (sum, item) =>
                sum + Number(item.score || 0),
              0,
            ) / grades.length,
          )
        : 0

    const needsAttention =
      attendancePercentage < 80 ||
      averageScore < 70 ||
      alphaCount > 0

    // ============================================
    // 9. CLASS DETAILS
    // ============================================

    const classDetails =
      activeEnrollments.map((enrollment) => {
        const classInfo = classes.find(
          (item) =>
            item.id === enrollment.class_id,
        )

        const classGrades = grades.filter(
          (grade) =>
            grade.enrollment_id ===
            enrollment.id,
        )

        const classAttendance =
          attendance.filter(
            (item) =>
              item.enrollment_id ===
              enrollment.id,
          )

        const classPresent =
          classAttendance.filter(
            (item) =>
              item.status === 'HADIR',
          ).length

        const classAttendancePercentage =
          classAttendance.length > 0
            ? Math.round(
                (classPresent /
                  classAttendance.length) *
                  100,
              )
            : 0

        const classAverage =
          classGrades.length > 0
            ? Math.round(
                classGrades.reduce(
                  (sum, item) =>
                    sum +
                    Number(item.score || 0),
                  0,
                ) / classGrades.length,
              )
            : 0

        return {
          enrollment_id: enrollment.id,
          class_id: enrollment.class_id,
          class_name:
            classInfo?.class_name ??
            'Kelas',
          subject:
            classInfo?.subject ??
            classGrades[0]?.subject ??
            '-',
          status: enrollment.status,

          attendance_percentage:
            classAttendancePercentage,

          average_score: classAverage,

          total_grades: classGrades.length,
        }
      })

    // ============================================
    // 10. RESPONSE
    // ============================================

    return NextResponse.json({
      parent: {
        id: user.id,
        full_name: profile.full_name,
      },

      student: {
        id: student.id,
        student_name: student.student_name,
        grade_level: student.grade_level,
        school_name: student.school_name,
        phone_number: student.phone_number,
        status: student.status,
      },

      academic: {
        active_classes:
          activeEnrollments.length,

        total_grades:
          grades.length,

        average_score:
          averageScore,

        attendance_percentage:
          attendancePercentage,

        total_attendance:
          totalAttendance,

        present_count:
          presentCount,

        sick_count:
          sickCount,

        permission_count:
          permissionCount,

        alpha_count:
          alphaCount,

        needs_attention:
          needsAttention,
      },

      classes: classDetails,

      grades: grades.map((grade) => ({
        enrollment_id:
          grade.enrollment_id,
        subject: grade.subject,
        score: Number(grade.score),
      })),
    })
  } catch (error) {
    console.error(
      'Parent academic detail API error:',
      error,
    )

    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server.' },
      { status: 500 },
    )
  }
}