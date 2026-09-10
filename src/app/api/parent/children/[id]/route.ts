import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type Params = {
  params: Promise<{
    id: string
  }>
}

export async function GET(
  _request: Request,
  { params }: Params,
) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json(
        { error: 'ID anak tidak valid.' },
        { status: 400 },
      )
    }

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

    /*
     * ============================================================
     * PROFILE PARENT
     * ============================================================
     */

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
     * SECURITY CHECK
     *
     * ID URL + parent_id user login
     * ============================================================
     */

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
            created_at
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

    /*
     * ============================================================
     * ENROLLMENT
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
        .eq('student_id', student.id)

    if (enrollmentError) {
      console.error(
        'Enrollment detail error:',
        enrollmentError,
      )

      return NextResponse.json(
        { error: 'Gagal mengambil data kelas.' },
        { status: 500 },
      )
    }

    const enrollmentRows =
      enrollments ?? []

    const activeEnrollments =
      enrollmentRows.filter(
        (item) => item.status === 'ACTIVE',
      )

    const enrollmentIds =
      activeEnrollments.map(
        (item) => item.id,
      )

    const classIds = [
      ...new Set(
        activeEnrollments.map(
          (item) => item.class_id,
        ),
      ),
    ]

    /*
     * ============================================================
     * CLASSES
     * ============================================================
     */

    let classes: Array<{
      id: string
      class_name: string
      subject: string
      status: string
    }> = []

    if (classIds.length > 0) {
      const { data: classData, error: classError } =
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
        console.error(
          'Classes detail error:',
          classError,
        )

        return NextResponse.json(
          { error: 'Gagal mengambil data kelas.' },
          { status: 500 },
        )
      }

      classes = classData ?? []
    }

    /*
     * ============================================================
     * ATTENDANCE
     * ============================================================
     */

    let attendanceRows: Array<{
      enrollment_id: string
      status: string
    }> = []

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
          'Attendance detail error:',
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

    let gradeRows: Array<{
      enrollment_id: string
      subject: string | null
      score: number | null
    }> = []

    if (enrollmentIds.length > 0) {
      const { data: grades, error: gradesError } =
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

      if (gradesError) {
        console.error(
          'Grades detail error:',
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
     * SPP BULAN BERJALAN
     * ============================================================
     */

    const now = new Date()

    const year = now.getFullYear()
    const month = now.getMonth()

    const currentMonth = `${year}-${String(
      month + 1,
    ).padStart(2, '0')}-01`

    const nextMonthDate = new Date(
      year,
      month + 1,
      1,
    )

    const nextMonth = `${nextMonthDate.getFullYear()}-${String(
      nextMonthDate.getMonth() + 1,
    ).padStart(2, '0')}-01`

    const { data: bills, error: billsError } =
      await supabase
        .from('spp_bills')
        .select(
          `
            id,
            student_id,
            order_id,
            month_period,
            amount,
            payment_status,
            paid_at
          `,
        )
        .eq('student_id', student.id)
        .gte('month_period', currentMonth)
        .lt('month_period', nextMonth)
        .order('month_period', {
          ascending: false,
        })

    if (billsError) {
      console.error(
        'Bills detail error:',
        billsError,
      )

      return NextResponse.json(
        { error: 'Gagal mengambil data SPP.' },
        { status: 500 },
      )
    }

    /*
     * ============================================================
     * PERHITUNGAN AKADEMIK
     * ============================================================
     */

    const hadir = attendanceRows.filter(
      (item) => item.status === 'HADIR',
    ).length

    const izin = attendanceRows.filter(
      (item) => item.status === 'IZIN',
    ).length

    const sakit = attendanceRows.filter(
      (item) => item.status === 'SAKIT',
    ).length

    const alpha = attendanceRows.filter(
      (item) => item.status === 'ALPHA',
    ).length

    const attendanceRate =
      attendanceRows.length > 0
        ? Number(
            (
              (hadir /
                attendanceRows.length) *
              100
            ).toFixed(1),
          )
        : 0

    const scores = gradeRows
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

    /*
     * ============================================================
     * FORMAT KELAS
     * ============================================================
     */

    const formattedClasses =
      activeEnrollments.map(
        (enrollment) => {
          const classData = classes.find(
            (item) =>
              item.id ===
              enrollment.class_id,
          )

          return {
            enrollment_id:
              enrollment.id,
            class_id:
              enrollment.class_id,
            class_name:
              classData?.class_name ??
              'Kelas',
            subject:
              classData?.subject ??
              '-',
            status:
              classData?.status ??
              enrollment.status,
          }
        },
      )

    /*
     * ============================================================
     * RESPONSE
     * ============================================================
     */

    return NextResponse.json({
      parent: {
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
        status:
          student.status,
        created_at:
          student.created_at,
      },

      academic: {
        class_count:
          formattedClasses.length,
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

      attendance: {
        total:
          attendanceRows.length,
        hadir,
        izin,
        sakit,
        alpha,
        attendance_rate:
          attendanceRate,
      },

      classes:
        formattedClasses,

      grades:
        gradeRows.map((grade) => {
          const enrollment =
            activeEnrollments.find(
              (item) =>
                item.id ===
                grade.enrollment_id,
            )

          const classData =
            classes.find(
              (item) =>
                item.id ===
                enrollment?.class_id,
            )

          return {
            enrollment_id:
              grade.enrollment_id,
            subject:
              grade.subject ??
              classData?.subject ??
              '-',
            score:
              grade.score,
          }
        }),

      finance:
        (bills ?? []).map(
          (bill) => ({
            id: bill.id,
            order_id:
              bill.order_id,
            month_period:
              bill.month_period,
            amount:
              Number(bill.amount),
            payment_status:
              bill.payment_status,
            paid_at:
              bill.paid_at,
          }),
        ),
    })
  } catch (error) {
    console.error(
      'Parent child detail unexpected error:',
      error,
    )

    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server.' },
      { status: 500 },
    )
  }
}