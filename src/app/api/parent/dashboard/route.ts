import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type AttendanceRow = {
  enrollment_id: string
  status: string
}

type GradeRow = {
  enrollment_id: string
  subject: string | null
  score: number | null
}

export async function GET() {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError) {
      console.error('Parent dashboard auth error:', authError)
      return NextResponse.json(
        { error: 'Gagal memverifikasi sesi.' },
        { status: 401 },
      )
    }

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized.' },
        { status: 401 },
      )
    }

    /*
     * ============================================================
     * 1. PROFILE PARENT
     * ============================================================
     */

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name, phone_number, role_id')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('Parent profile error:', profileError)

      return NextResponse.json(
        { error: 'Profil orang tua tidak ditemukan.' },
        { status: 404 },
      )
    }

    // Parent role diasumsikan role_id = 3
    if (profile.role_id !== 3) {
      return NextResponse.json(
        { error: 'Akses hanya untuk akun orang tua.' },
        { status: 403 },
      )
    }

    /*
     * ============================================================
     * 2. AMBIL ANAK MILIK PARENT
     *
     * students.parent_id -> profiles.id
     * ============================================================
     */

    const { data: students, error: studentsError } = await supabase
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
      console.error('Parent students error:', studentsError)

      return NextResponse.json(
        { error: 'Gagal mengambil data anak.' },
        { status: 500 },
      )
    }

    const studentRows = students ?? []

    if (studentRows.length === 0) {
      return NextResponse.json({
        parent: {
          id: profile.id,
          full_name: profile.full_name,
          phone_number: profile.phone_number,
        },
        summary: {
          total_children: 0,
          attendance_rate: 0,
          average_score: 0,
          unpaid_bills: 0,
          unpaid_amount: 0,
        },
        children: [],
        finance: [],
      })
    }

    const studentIds = studentRows.map((student) => student.id)

    /*
     * ============================================================
     * 3. CLASS ENROLLMENTS
     * ============================================================
     */

    const { data: enrollments, error: enrollmentError } = await supabase
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
      console.error('Parent enrollments error:', enrollmentError)

      return NextResponse.json(
        { error: 'Gagal mengambil data kelas anak.' },
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

    const classIds = [
      ...new Set(
        activeEnrollments.map((item) => item.class_id),
      ),
    ]

    /*
     * ============================================================
     * 4. CLASSES
     * ============================================================
     */

    let classes: Array<{
      id: string
      class_name: string
      subject: string
      status: string
    }> = []

    if (classIds.length > 0) {
      const { data: classData, error: classError } = await supabase
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
        console.error('Parent classes error:', classError)

        return NextResponse.json(
          { error: 'Gagal mengambil data kelas.' },
          { status: 500 },
        )
      }

      classes = classData ?? []
    }

    /*
     * ============================================================
     * 5. ATTENDANCE
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
     * 6. GRADES
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
              subject,
              score
            `,
          )
          .in('enrollment_id', enrollmentIds)

      if (gradesError) {
        console.error('Parent grades error:', gradesError)

        return NextResponse.json(
          { error: 'Gagal mengambil data nilai.' },
          { status: 500 },
        )
      }

      gradeRows = grades ?? []
    }

    /*
     * ============================================================
     * 7. SPP BULAN BERJALAN
     * ============================================================
     */

    const now = new Date()

    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')

    const currentMonth = `${year}-${month}-01`

    const nextMonthDate = new Date(
      year,
      now.getMonth() + 1,
      1,
    )

    const nextMonth = `${nextMonthDate.getFullYear()}-${String(
      nextMonthDate.getMonth() + 1,
    ).padStart(2, '0')}-01`

    const { data: bills, error: billsError } = await supabase
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
      .in('student_id', studentIds)
      .gte('month_period', currentMonth)
      .lt('month_period', nextMonth)
      .order('month_period', { ascending: false })

    if (billsError) {
      console.error('Parent bills error:', billsError)

      return NextResponse.json(
        { error: 'Gagal mengambil data tagihan SPP.' },
        { status: 500 },
      )
    }

    const financeRows = bills ?? []

    /*
     * ============================================================
     * 8. MAP DATA PER ANAK
     * ============================================================
     */

    const children = studentRows.map((student) => {
      const studentEnrollments = activeEnrollments.filter(
        (item) => item.student_id === student.id,
      )

      const studentEnrollmentIds = studentEnrollments.map(
        (item) => item.id,
      )

      const studentAttendance = attendanceRows.filter((item) =>
        studentEnrollmentIds.includes(item.enrollment_id),
      )

      const studentGrades = gradeRows.filter((item) =>
        studentEnrollmentIds.includes(item.enrollment_id),
      )

      const hadir = studentAttendance.filter(
        (item) => item.status === 'HADIR',
      ).length

      const alpha = studentAttendance.filter(
        (item) => item.status === 'ALPHA',
      ).length

      const izin = studentAttendance.filter(
        (item) => item.status === 'IZIN',
      ).length

      const sakit = studentAttendance.filter(
        (item) => item.status === 'SAKIT',
      ).length

      const attendanceRate =
        studentAttendance.length > 0
          ? Number(
              ((hadir / studentAttendance.length) * 100).toFixed(
                1,
              ),
            )
          : 0

      const validScores = studentGrades
        .map((item) => Number(item.score))
        .filter((score) => Number.isFinite(score))

      const averageScore =
        validScores.length > 0
          ? Number(
              (
                validScores.reduce(
                  (sum, score) => sum + score,
                  0,
                ) / validScores.length
              ).toFixed(1),
            )
          : 0

      const studentClasses = studentEnrollments
        .map((enrollment) =>
          classes.find(
            (item) => item.id === enrollment.class_id,
          ),
        )
        .filter(Boolean)
        .map((item) => ({
          id: item!.id,
          class_name: item!.class_name,
          subject: item!.subject,
          status: item!.status,
        }))

      const bill = financeRows.find(
        (item) => item.student_id === student.id,
      )

      return {
        id: student.id,
        student_name: student.student_name,
        grade_level: student.grade_level,
        school_name: student.school_name,
        status: student.status,

        academic: {
          class_count: studentClasses.length,
          attendance_rate: attendanceRate,
          average_score: averageScore,
          total_grades: validScores.length,
          needs_attention:
            attendanceRate < 80 ||
            averageScore < 70 ||
            alpha > 0,
        },

        attendance: {
          total: studentAttendance.length,
          hadir,
          izin,
          sakit,
          alpha,
        },

        classes: studentClasses,

        finance: bill
          ? {
              id: bill.id,
              order_id: bill.order_id,
              month_period: bill.month_period,
              amount: Number(bill.amount),
              payment_status: bill.payment_status,
              paid_at: bill.paid_at,
            }
          : null,
      }
    })

    /*
     * ============================================================
     * 9. SUMMARY
     * ============================================================
     */

    const totalAttendance = attendanceRows.length

    const totalHadir = attendanceRows.filter(
      (item) => item.status === 'HADIR',
    ).length

    const attendanceRate =
      totalAttendance > 0
        ? Number(
            ((totalHadir / totalAttendance) * 100).toFixed(1),
          )
        : 0

    const allScores = gradeRows
      .map((item) => Number(item.score))
      .filter((score) => Number.isFinite(score))

    const averageScore =
      allScores.length > 0
        ? Number(
            (
              allScores.reduce(
                (sum, score) => sum + score,
                0,
              ) / allScores.length
            ).toFixed(1),
          )
        : 0

    const unpaidBills = financeRows.filter(
      (bill) =>
        bill.payment_status !== 'PAID',
    )

    const unpaidAmount = unpaidBills.reduce(
      (sum, bill) => sum + Number(bill.amount),
      0,
    )

    /*
     * ============================================================
     * 10. RESPONSE
     * ============================================================
     */

    return NextResponse.json({
      parent: {
        id: profile.id,
        full_name: profile.full_name,
        phone_number: profile.phone_number,
      },

      summary: {
        total_children: studentRows.length,
        attendance_rate: attendanceRate,
        average_score: averageScore,
        unpaid_bills: unpaidBills.length,
        unpaid_amount: unpaidAmount,
      },

      children,

      finance: financeRows.map((bill) => {
        const student = studentRows.find(
          (item) => item.id === bill.student_id,
        )

        return {
          id: bill.id,
          student_id: bill.student_id,
          student_name:
            student?.student_name ?? 'Siswa',
          month_period: bill.month_period,
          amount: Number(bill.amount),
          payment_status: bill.payment_status,
          paid_at: bill.paid_at,
          order_id: bill.order_id,
        }
      }),
    })
  } catch (error) {
    console.error('Parent dashboard unexpected error:', error)

    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server.' },
      { status: 500 },
    )
  }
}