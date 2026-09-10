import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type Student = {
  id: string
  student_name: string
  grade_level: string | null
  school_name: string | null
  status: string | null
}

type Enrollment = {
  id: string
  student_id: string
  class_id: string
  status: string | null
}

type ClassData = {
  id: string
  class_name: string
  subject: string
  status: string | null
}

type Attendance = {
  enrollment_id: string
  status: string
}

type Grade = {
  enrollment_id: string
  subject: string
  score: number
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
        .select('role_id')
        .eq('id', user.id)
        .single()

    if (profileError) {
      console.error(profileError)

      return NextResponse.json(
        { error: 'Gagal memverifikasi akun.' },
        { status: 500 },
      )
    }

    // Parent = role_id 3
    if (profile?.role_id !== 3) {
      return NextResponse.json(
        { error: 'Akses ditolak.' },
        { status: 403 },
      )
    }

    // ============================================
    // 3. GET OWN CHILDREN ONLY
    // ============================================

    const { data: students, error: studentsError } =
      await supabase
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
        .order('student_name', { ascending: true })

    if (studentsError) {
      console.error(studentsError)

      return NextResponse.json(
        { error: 'Gagal mengambil data anak.' },
        { status: 500 },
      )
    }

    if (!students || students.length === 0) {
      return NextResponse.json({
        children: [],
      })
    }

    const studentIds = students.map(
      (student: Student) => student.id,
    )

    // ============================================
    // 4. GET ENROLLMENTS
    // ============================================

    const { data: enrollments, error: enrollmentError } =
      await supabase
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
        { error: 'Gagal mengambil data kelas.' },
        { status: 500 },
      )
    }

    const enrollmentData =
      (enrollments ?? []) as Enrollment[]

    const activeEnrollments = enrollmentData.filter(
      (item) => item.status === 'ACTIVE',
    )

    const enrollmentIds = enrollmentData.map(
      (item) => item.id,
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

    let classes: ClassData[] = []

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

      classes = (classRows ?? []) as ClassData[]
    }

    // ============================================
    // 6. GET ATTENDANCE
    // ============================================

    let attendance: Attendance[] = []

    if (enrollmentIds.length > 0) {
      const { data: attendanceRows, error: attendanceError } =
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
        console.error(attendanceError)

        return NextResponse.json(
          { error: 'Gagal mengambil data kehadiran.' },
          { status: 500 },
        )
      }

      attendance = (attendanceRows ?? []) as Attendance[]
    }

    // ============================================
    // 7. GET GRADES
    // ============================================

    let grades: Grade[] = []

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

      grades = (gradeRows ?? []) as Grade[]
    }

    // ============================================
    // 8. BUILD ACADEMIC SUMMARY PER CHILD
    // ============================================

    const children = students.map((student: Student) => {
      const studentEnrollments =
        enrollmentData.filter(
          (item) =>
            item.student_id === student.id &&
            item.status === 'ACTIVE',
        )

      const studentEnrollmentIds =
        studentEnrollments.map(
          (item) => item.id,
        )

      const studentAttendance =
        attendance.filter((item) =>
          studentEnrollmentIds.includes(
            item.enrollment_id,
          ),
        )

      const studentGrades =
        grades.filter((item) =>
          studentEnrollmentIds.includes(
            item.enrollment_id,
          ),
        )

      const totalAttendance =
        studentAttendance.length

      const presentCount =
        studentAttendance.filter(
          (item) => item.status === 'HADIR',
        ).length

      const alphaCount =
        studentAttendance.filter(
          (item) => item.status === 'ALPHA',
        ).length

      const attendancePercentage =
        totalAttendance > 0
          ? Math.round(
              (presentCount / totalAttendance) * 100,
            )
          : 0

      const averageScore =
        studentGrades.length > 0
          ? Math.round(
              studentGrades.reduce(
                (sum, item) =>
                  sum + Number(item.score || 0),
                0,
              ) / studentGrades.length,
            )
          : 0

      const needsAttention =
        attendancePercentage < 80 ||
        averageScore < 70 ||
        alphaCount > 0

      const studentClassIds =
        studentEnrollments.map(
          (item) => item.class_id,
        )

      const studentClasses = classes.filter(
        (item) =>
          studentClassIds.includes(item.id),
      )

      return {
        id: student.id,
        student_name: student.student_name,
        grade_level: student.grade_level,
        school_name: student.school_name,
        status: student.status,

        academic: {
          active_classes: studentClasses.length,
          total_grades: studentGrades.length,
          average_score: averageScore,
          attendance_percentage:
            attendancePercentage,
          total_attendance: totalAttendance,
          present_count: presentCount,
          alpha_count: alphaCount,
          needs_attention: needsAttention,
        },

        classes: studentClasses.map((item) => ({
          id: item.id,
          class_name: item.class_name,
          subject: item.subject,
          status: item.status,
        })),
      }
    })

    // ============================================
    // 9. RESPONSE
    // ============================================

    return NextResponse.json({
      children,
    })
  } catch (error) {
    console.error('Parent academic API error:', error)

    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server.' },
      { status: 500 },
    )
  }
}