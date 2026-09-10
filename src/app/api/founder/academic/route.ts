import { NextResponse } from 'next/server'

import { requireFounder } from '@/lib/auth/requireFounder'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: Request) {
  const auth = await requireFounder()

  if (!auth.authorized) {
    return auth.response
  }

  try {
    const admin = createAdminClient()

    const { searchParams } = new URL(request.url)

    const search =
      searchParams.get('search')?.trim().toLowerCase() ?? ''

    const classId =
      searchParams.get('classId') ?? 'ALL'

    const subject =
      searchParams.get('subject') ?? 'ALL'

    const status =
      searchParams.get('status') ?? 'ALL'

    // =========================
    // STUDENTS
    // =========================

    const { data: students, error: studentsError } =
      await admin
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

    const studentList = students ?? []

    // =========================
    // CLASSES
    // =========================

    const { data: classes, error: classesError } =
      await admin
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

    const classList = classes ?? []

    // =========================
    // ENROLLMENTS
    // =========================

    const { data: enrollments, error: enrollmentsError } =
      await admin
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

    const enrollmentList = enrollments ?? []

    const enrollmentIds =
      enrollmentList.map(
        (item) => item.id,
      )

    // =========================
    // ATTENDANCE
    // =========================

    let attendance: Array<{
      enrollment_id: string
      status: string
    }> = []

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

    // =========================
    // GRADES
    // =========================

    let grades: Array<{
      enrollment_id: string
      subject: string
      score: number
    }> = []

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

    // =========================
    // FILTER ENROLLMENTS
    // =========================

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

    // =========================
    // STUDENT METRICS
    // =========================

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

        const studentGrades =
          grades.filter(
            (item) =>
              studentEnrollmentIds.has(
                item.enrollment_id,
              ),
          )

        const averageScore =
          studentGrades.length > 0
            ? Number(
                (
                  studentGrades.reduce(
                    (sum, item) =>
                      sum +
                      Number(item.score),
                    0,
                  ) /
                  studentGrades.length
                ).toFixed(1),
              )
            : 0

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
            studentGrades.length,
          totalClasses:
            activeEnrollments.length,
          attendanceAlpha:
            alphaCount,
          needsAttention,
        }
      })
      .filter((student) => {
        // Search
        const matchesSearch =
          !search ||
          student.studentName
            .toLowerCase()
            .includes(search) ||
          (student.schoolName ?? '')
            .toLowerCase()
            .includes(search)

        // Status
        const matchesStatus =
          status === 'ALL' ||
          student.status === status

        return (
          matchesSearch &&
          matchesStatus
        )
      })

    // =========================
    // SUMMARY
    // =========================

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

    const averageScore =
      allGrades.length > 0
        ? Number(
            (
              allGrades.reduce(
                (sum, item) =>
                  sum +
                  Number(item.score),
                0,
              ) /
              allGrades.length
            ).toFixed(1),
          )
        : 0

    const studentsNeedAttention =
      result.filter(
        (student) =>
          student.needsAttention,
      ).length

    // =========================
    // FILTER OPTIONS
    // =========================

    const filterClasses =
      classList.map((item) => ({
        id: item.id,
        className:
          item.class_name,
      }))

    const subjects = Array.from(
      new Set(
        classList
          .map(
            (item) => item.subject,
          )
          .filter(Boolean),
      ),
    ).sort()

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