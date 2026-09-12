import { NextResponse } from 'next/server'

import { requireFounder } from '@/lib/auth/requireFounder'
import { createAdminClient } from '@/lib/supabase/admin'

type StudentRow = {
  id: string
  student_name: string | null
  grade_level: string | null
  school_name: string | null
  phone_number: string | null
  status: string | null
}

type ClassRow = {
  id: string
  class_name: string
  subject: string
  status: string
}

type EnrollmentRow = {
  id: string
  class_id: string
  student_id: string
  status: string
}

type AttendanceRow = {
  enrollment_id: string
  status: string
}

type GradeRow = {
  enrollment_id: string
  subject: string
  score: number
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const ALLOWED_STATUS = new Set([
  'ALL',
  'ACTIVE',
  'INACTIVE',
])

const MAX_SEARCH_LENGTH = 100

export async function GET(request: Request) {
  const auth = await requireFounder()

  if (!auth.authorized) {
    return auth.response
  }

  try {
    const admin = createAdminClient()
    const { searchParams } = new URL(request.url)

    const rawSearch =
      searchParams.get('search') ?? ''

    if (rawSearch.length > MAX_SEARCH_LENGTH) {
      return NextResponse.json(
        {
          error:
            'Pencarian terlalu panjang.',
        },
        { status: 400 },
      )
    }

    const search =
      rawSearch.trim().toLowerCase()

    const classId =
      searchParams.get('classId')?.trim() ??
      'ALL'

    const subject =
      searchParams.get('subject')?.trim() ??
      'ALL'

    const status =
      searchParams.get('status')?.trim() ??
      'ALL'

    // ==========================================
    // VALIDASI FILTER
    // ==========================================

    if (!ALLOWED_STATUS.has(status)) {
      return NextResponse.json(
        {
          error:
            'Filter status tidak valid.',
        },
        { status: 400 },
      )
    }

    if (
      classId !== 'ALL' &&
      !UUID_REGEX.test(classId)
    ) {
      return NextResponse.json(
        {
          error:
            'ID kelas tidak valid.',
        },
        { status: 400 },
      )
    }

    if (
      subject !== 'ALL' &&
      subject.length > 100
    ) {
      return NextResponse.json(
        {
          error:
            'Filter mata pelajaran tidak valid.',
        },
        { status: 400 },
      )
    }

    // ==========================================
    // STUDENTS
    // ==========================================

    const {
      data: students,
      error: studentsError,
    } = await admin
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
      .order('student_name', {
        ascending: true,
      })

    if (studentsError) {
      console.error(
        'ACADEMIC STUDENTS ERROR:',
        studentsError,
      )

      return NextResponse.json(
        {
          error:
            'Gagal mengambil data siswa.',
        },
        { status: 500 },
      )
    }

    const studentList: StudentRow[] =
      students ?? []

    // ==========================================
    // CLASSES
    // ==========================================

    const {
      data: classes,
      error: classesError,
    } = await admin
      .from('classes')
      .select(
        `
        id,
        class_name,
        subject,
        status
        `,
      )
      .order('class_name', {
        ascending: true,
      })

    if (classesError) {
      console.error(
        'ACADEMIC CLASSES ERROR:',
        classesError,
      )

      return NextResponse.json(
        {
          error:
            'Gagal mengambil data kelas.',
        },
        { status: 500 },
      )
    }

    const classList: ClassRow[] =
      classes ?? []

    // ==========================================
    // VALIDASI CLASS ID TERHADAP DATA DATABASE
    // ==========================================

    if (classId !== 'ALL') {
      const classExists = classList.some(
        (item) => item.id === classId,
      )

      if (!classExists) {
        return NextResponse.json(
          {
            error:
              'Kelas tidak ditemukan.',
          },
          { status: 404 },
        )
      }
    }

    // ==========================================
    // ENROLLMENTS
    // ==========================================

    const {
      data: enrollments,
      error: enrollmentsError,
    } = await admin
      .from('class_enrollments')
      .select(
        `
        id,
        class_id,
        student_id,
        status
        `,
      )

    if (enrollmentsError) {
      console.error(
        'ACADEMIC ENROLLMENTS ERROR:',
        enrollmentsError,
      )

      return NextResponse.json(
        {
          error:
            'Gagal mengambil data enrollment.',
        },
        { status: 500 },
      )
    }

    const enrollmentList: EnrollmentRow[] =
      enrollments ?? []

    const enrollmentIds =
      enrollmentList.map(
        (item) => item.id,
      )

    // ==========================================
    // ATTENDANCE
    // ==========================================

    let attendance: AttendanceRow[] = []

    if (enrollmentIds.length > 0) {
      const {
        data,
        error,
      } = await admin
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

      if (error) {
        console.error(
          'ACADEMIC ATTENDANCE ERROR:',
          error,
        )

        return NextResponse.json(
          {
            error:
              'Gagal mengambil data absensi.',
          },
          { status: 500 },
        )
      }

      attendance = data ?? []
    }

    // ==========================================
    // GRADES
    // ==========================================

    let grades: GradeRow[] = []

    if (enrollmentIds.length > 0) {
      const {
        data,
        error,
      } = await admin
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

      if (error) {
        console.error(
          'ACADEMIC GRADES ERROR:',
          error,
        )

        return NextResponse.json(
          {
            error:
              'Gagal mengambil data nilai.',
          },
          { status: 500 },
        )
      }

      grades = data ?? []
    }

    // ==========================================
    // FILTER ENROLLMENTS
    // ==========================================

    const filteredEnrollments =
      enrollmentList.filter(
        (enrollment) => {
          if (
            classId !== 'ALL' &&
            enrollment.class_id !== classId
          ) {
            return false
          }

          if (subject !== 'ALL') {
            const classItem =
              classList.find(
                (item) =>
                  item.id ===
                  enrollment.class_id,
              )

            if (
              !classItem ||
              classItem.subject !== subject
            ) {
              return false
            }
          }

          return true
        },
      )

    const filteredEnrollmentIds =
      new Set(
        filteredEnrollments.map(
          (item) => item.id,
        ),
      )

    // ==========================================
    // STUDENT METRICS
    // ==========================================

    const result = studentList
      .map((student) => {
        const studentEnrollments =
          filteredEnrollments.filter(
            (item) =>
              item.student_id ===
              student.id,
          )

        const activeEnrollments =
          studentEnrollments.filter(
            (item) =>
              item.status === 'ACTIVE',
          )

        const studentEnrollmentIds =
          new Set(
            studentEnrollments.map(
              (item) => item.id,
            ),
          )

        // ------------------------------
        // ATTENDANCE
        // ------------------------------

        const studentAttendance =
          attendance.filter(
            (item) =>
              studentEnrollmentIds.has(
                item.enrollment_id,
              ),
          )

        const hadirCount =
          studentAttendance.filter(
            (item) =>
              item.status === 'HADIR',
          ).length

        const alphaCount =
          studentAttendance.filter(
            (item) =>
              item.status === 'ALPHA',
          ).length

        const attendancePercentage =
          studentAttendance.length > 0
            ? Number(
                (
                  (hadirCount /
                    studentAttendance.length) *
                  100
                ).toFixed(1),
              )
            : 0

        // ------------------------------
        // GRADES
        // ------------------------------

        const studentGrades =
          grades.filter(
            (item) =>
              studentEnrollmentIds.has(
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

        const averageScore =
          validScores.length > 0
            ? Number(
                (
                  validScores.reduce(
                    (sum, score) =>
                      sum + score,
                    0,
                  ) /
                  validScores.length
                ).toFixed(1),
              )
            : 0

        // ------------------------------
        // ATTENTION FLAG
        // ------------------------------

        const needsAttention =
          attendancePercentage < 80 ||
          averageScore < 70 ||
          alphaCount > 0

        return {
          id: student.id,
          studentName:
            student.student_name ?? '-',
          gradeLevel:
            student.grade_level ?? null,
          schoolName:
            student.school_name ?? null,
          status:
            student.status ?? 'INACTIVE',
          attendancePercentage,
          averageScore,
          totalGrades:
            validScores.length,
          totalClasses:
            activeEnrollments.length,
          attendanceAlpha:
            alphaCount,
          needsAttention,
        }
      })
      .filter((student) => {
        // ------------------------------
        // SEARCH
        // ------------------------------

        const matchesSearch =
          !search ||
          student.studentName
            .toLowerCase()
            .includes(search) ||
          (student.schoolName ?? '')
            .toLowerCase()
            .includes(search)

        // ------------------------------
        // STATUS
        // ------------------------------

        const matchesStatus =
          status === 'ALL' ||
          student.status === status

        return (
          matchesSearch &&
          matchesStatus
        )
      })

    // ==========================================
    // SUMMARY
    // ==========================================

    const totalStudents =
      result.length

    const allAttendance =
      attendance.filter((item) =>
        filteredEnrollmentIds.has(
          item.enrollment_id,
        ),
      )

    const totalHadir =
      allAttendance.filter(
        (item) =>
          item.status === 'HADIR',
      ).length

    const attendancePercentage =
      allAttendance.length > 0
        ? Number(
            (
              (totalHadir /
                allAttendance.length) *
              100
            ).toFixed(1),
          )
        : 0

    const allGrades =
      grades.filter((item) =>
        filteredEnrollmentIds.has(
          item.enrollment_id,
        ),
      )

    const validAllScores =
      allGrades
        .map((item) =>
          Number(item.score),
        )
        .filter(
          (score) =>
            Number.isFinite(score),
        )

    const averageScore =
      validAllScores.length > 0
        ? Number(
            (
              validAllScores.reduce(
                (sum, score) =>
                  sum + score,
                0,
              ) /
              validAllScores.length
            ).toFixed(1),
          )
        : 0

    const studentsNeedAttention =
      result.filter(
        (student) =>
          student.needsAttention,
      ).length

    // ==========================================
    // FILTER OPTIONS
    // ==========================================

    const filterClasses =
      classList.map((item) => ({
        id: item.id,
        className:
          item.class_name,
      }))

    const subjects =
      Array.from(
        new Set(
          classList
            .map(
              (item) => item.subject,
            )
            .filter(Boolean),
        ),
      ).sort()

    // ==========================================
    // RESPONSE
    // ==========================================

    return NextResponse.json({
      summary: {
        totalStudents,
        attendancePercentage,
        averageScore,
        studentsNeedAttention,
      },
      filters: {
        classes: filterClasses,
        subjects,
      },
      students: result,
    })
  } catch (error) {
    console.error(
      'FOUNDER ACADEMIC ERROR:',
      error,
    )

    return NextResponse.json(
      {
        error:
          'Terjadi kesalahan saat mengambil data akademik.',
      },
      { status: 500 },
    )
  }
}