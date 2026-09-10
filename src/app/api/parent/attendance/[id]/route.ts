import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type Params = {
  params: Promise<{
    id: string
  }>
}

type AttendanceRecord = {
  enrollment_id: string
  status: string
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
        {
          error:
            'Gagal memverifikasi akun.',
        },
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
    // 3. CRITICAL SECURITY CHECK
    //
    // Parent can only access their own child.
    // ============================================

    const { data: student, error: studentError } =
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

    const enrollmentData =
      enrollments ?? []

    const enrollmentIds =
      enrollmentData.map(
        (item) => item.id,
      )

    const activeEnrollments =
      enrollmentData.filter(
        (item) => item.status === 'ACTIVE',
      )

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
      const {
        data: classRows,
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
              'Gagal mengambil data mata pelajaran.',
          },
          { status: 500 },
        )
      }

      classes = classRows ?? []
    }

    // ============================================
    // 6. GET ATTENDANCE
    // ============================================

    let attendance: AttendanceRecord[] =
      []

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
        .in(
          'enrollment_id',
          enrollmentIds,
        )

      if (attendanceError) {
        console.error(attendanceError)

        return NextResponse.json(
          {
            error:
              'Gagal mengambil data kehadiran.',
          },
          { status: 500 },
        )
      }

      attendance =
        (attendanceRows ??
          []) as AttendanceRecord[]
    }

    // ============================================
    // 7. OVERALL STATISTICS
    // ============================================

    const total =
      attendance.length

    const hadir =
      attendance.filter(
        (item) => item.status === 'HADIR',
      ).length

    const sakit =
      attendance.filter(
        (item) => item.status === 'SAKIT',
      ).length

    const izin =
      attendance.filter(
        (item) => item.status === 'IZIN',
      ).length

    const alpha =
      attendance.filter(
        (item) => item.status === 'ALPHA',
      ).length

    const percentage =
      total > 0
        ? Math.round(
            (hadir / total) * 100,
          )
        : 0

    // ============================================
    // 8. PER CLASS
    // ============================================

    const classPerformance =
      activeEnrollments.map(
        (enrollment) => {
          const classInfo =
            classes.find(
              (item) =>
                item.id ===
                enrollment.class_id,
            )

          const classAttendance =
            attendance.filter(
              (item) =>
                item.enrollment_id ===
                enrollment.id,
            )

          const classTotal =
            classAttendance.length

          const classHadir =
            classAttendance.filter(
              (item) =>
                item.status ===
                'HADIR',
            ).length

          const classSakit =
            classAttendance.filter(
              (item) =>
                item.status ===
                'SAKIT',
            ).length

          const classIzin =
            classAttendance.filter(
              (item) =>
                item.status ===
                'IZIN',
            ).length

          const classAlpha =
            classAttendance.filter(
              (item) =>
                item.status ===
                'ALPHA',
            ).length

          const classPercentage =
            classTotal > 0
              ? Math.round(
                  (classHadir /
                    classTotal) *
                    100,
                )
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
              classInfo?.subject ?? '-',

            attendance: {
              total: classTotal,
              hadir: classHadir,
              sakit: classSakit,
              izin: classIzin,
              alpha: classAlpha,
              percentage:
                classPercentage,
            },
          }
        },
      )

    // ============================================
    // 9. RESPONSE
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
        status:
          student.status,
      },

      attendance: {
        total,
        hadir,
        sakit,
        izin,
        alpha,
        percentage,
        needs_attention:
          percentage < 80 ||
          alpha > 0,
      },

      classes:
        classPerformance,
    })
  } catch (error) {
    console.error(
      'Parent attendance detail API error:',
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