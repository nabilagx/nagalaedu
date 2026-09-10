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

    const { searchParams } =
      new URL(request.url)

    const search =
      searchParams
        .get('search')
        ?.trim()
        .toLowerCase() ?? ''

    const status =
      searchParams.get('status') ?? 'ALL'

    // =========================
    // TUTOR ROLE
    // =========================

    const {
      data: tutorRole,
      error: roleError,
    } = await admin
      .from('roles')
      .select('id, role_name')
      .eq('role_name', 'Tutor')
      .maybeSingle()

    if (roleError) {
      console.error(
        'TUTOR ROLE ERROR:',
        roleError,
      )

      return NextResponse.json(
        {
          error:
            'Gagal mengambil role Tutor.',
        },
        { status: 500 },
      )
    }

    if (!tutorRole) {
      return NextResponse.json(
        {
          error:
            'Role Tutor tidak ditemukan.',
        },
        { status: 404 },
      )
    }

    // =========================
    // TUTORS
    // =========================

    const {
      data: tutors,
      error: tutorsError,
    } = await admin
      .from('profiles')
      .select(
        `
        id,
        full_name,
        phone_number
        `,
      )
      .eq('role_id', tutorRole.id)
      .order('full_name', {
        ascending: true,
      })

    if (tutorsError) {
      console.error(
        'TUTORS ERROR:',
        tutorsError,
      )

      return NextResponse.json(
        {
          error:
            'Gagal mengambil data tutor.',
        },
        { status: 500 },
      )
    }

    const tutorList = tutors ?? []

    // =========================
    // CLASSES
    // =========================

    const tutorIds =
      tutorList.map(
        (tutor) => tutor.id,
      )

    let classList: Array<{
      id: string
      tutor_id: string
      class_name: string
      subject: string
      status: string
    }> = []

    if (tutorIds.length > 0) {
      const {
        data,
        error,
      } = await admin
        .from('classes')
        .select(
          `
          id,
          tutor_id,
          class_name,
          subject,
          status
          `,
        )
        .in(
          'tutor_id',
          tutorIds,
        )

      if (error) {
        console.error(
          'TUTOR CLASSES ERROR:',
          error,
        )

        return NextResponse.json(
          {
            error:
              'Gagal mengambil data kelas tutor.',
          },
          { status: 500 },
        )
      }

      classList = data ?? []
    }

    // =========================
    // ENROLLMENTS
    // =========================

    const classIds =
      classList.map(
        (item) => item.id,
      )

    let enrollments: Array<{
      id: string
      class_id: string
      student_id: string
      status: string
    }> = []

    if (classIds.length > 0) {
      const {
        data,
        error,
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
        .in(
          'class_id',
          classIds,
        )

      if (error) {
        console.error(
          'TUTOR ENROLLMENTS ERROR:',
          error,
        )

        return NextResponse.json(
          {
            error:
              'Gagal mengambil enrollment tutor.',
          },
          { status: 500 },
        )
      }

      enrollments = data ?? []
    }

    const enrollmentIds =
      enrollments.map(
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
          'TUTOR ATTENDANCE ERROR:',
          error,
        )

        return NextResponse.json(
          {
            error:
              'Gagal mengambil data absensi tutor.',
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
          score
          `,
        )
        .in(
          'enrollment_id',
          enrollmentIds,
        )

      if (error) {
        console.error(
          'TUTOR GRADES ERROR:',
          error,
        )

        return NextResponse.json(
          {
            error:
              'Gagal mengambil data nilai tutor.',
          },
          { status: 500 },
        )
      }

      grades = data ?? []
    }

    // =========================
    // MODULES
    // =========================

    let modules: Array<{
      id: string
      class_id: string
      tutor_id: string
    }> = []

    if (classIds.length > 0) {
      const {
        data,
        error,
      } = await admin
        .from('learning_modules')
        .select(
          `
          id,
          class_id,
          tutor_id
          `,
        )
        .in(
          'class_id',
          classIds,
        )

      if (error) {
        console.error(
          'TUTOR MODULES ERROR:',
          error,
        )

        return NextResponse.json(
          {
            error:
              'Gagal mengambil data modul pembelajaran.',
          },
          { status: 500 },
        )
      }

      modules = data ?? []
    }

    // =========================
    // RESULT
    // =========================

    const result = tutorList.map(
      (tutor) => {
        const tutorClasses =
          classList.filter(
            (item) =>
              item.tutor_id ===
              tutor.id,
          )

        const tutorClassIds =
          new Set(
            tutorClasses.map(
              (item) => item.id,
            ),
          )

        const tutorEnrollments =
          enrollments.filter(
            (item) =>
              tutorClassIds.has(
                item.class_id,
              ),
          )

        const activeEnrollments =
          tutorEnrollments.filter(
            (item) =>
              item.status ===
              'ACTIVE',
          )

        const activeStudentIds =
          new Set(
            activeEnrollments.map(
              (item) =>
                item.student_id,
            ),
          )

        const tutorEnrollmentIds =
          new Set(
            tutorEnrollments.map(
              (item) => item.id,
            ),
          )

        const tutorAttendance =
          attendance.filter(
            (item) =>
              tutorEnrollmentIds.has(
                item.enrollment_id,
              ),
          )

        const hadirCount =
          tutorAttendance.filter(
            (item) =>
              item.status ===
              'HADIR',
          ).length

        const attendanceRate =
          tutorAttendance.length > 0
            ? Math.round(
                (hadirCount /
                  tutorAttendance.length) *
                  100,
              )
            : 0

        const tutorGrades =
          grades.filter(
            (item) =>
              tutorEnrollmentIds.has(
                item.enrollment_id,
              ),
          )

        const gradeAverage =
          tutorGrades.length > 0
            ? Number(
                (
                  tutorGrades.reduce(
                    (sum, item) =>
                      sum +
                      Number(
                        item.score,
                      ),
                    0,
                  ) /
                  tutorGrades.length
                ).toFixed(2),
              )
            : 0

        const tutorModules =
          modules.filter(
            (item) =>
              item.tutor_id ===
              tutor.id,
          )

        const activeClasses =
          tutorClasses.filter(
            (item) =>
              item.status ===
              'ACTIVE',
          ).length

        const activityStatus =
          activeClasses > 0
            ? 'AKTIF'
            : 'TIDAK_AKTIF'

        return {
          id: tutor.id,
          fullName:
            tutor.full_name ?? '-',
          phoneNumber:
            tutor.phone_number ?? '-',
          totalClasses:
            tutorClasses.length,
          activeClasses,
          totalActiveStudents:
            activeStudentIds.size,
          attendanceRate,
          gradeAverage,
          totalGrades:
            tutorGrades.length,
          totalModules:
            tutorModules.length,
          activityStatus,
        }
      },
    )

    // =========================
    // FILTER
    // =========================

    const filteredTutors =
      result.filter(
        (tutor) => {
          const matchesSearch =
            !search ||
            tutor.fullName
              .toLowerCase()
              .includes(search) ||
            tutor.phoneNumber
              .toLowerCase()
              .includes(search)

          const matchesStatus =
            status === 'ALL' ||
            tutor.activityStatus ===
              status

          return (
            matchesSearch &&
            matchesStatus
          )
        },
      )

    const allActiveStudentIds =
      new Set<string>()

    enrollments
      .filter(
        (item) =>
          item.status === 'ACTIVE',
      )
      .forEach((item) => {
        allActiveStudentIds.add(
          item.student_id,
        )
      })

    const totalActiveTutors =
      result.filter(
        (tutor) =>
          tutor.activityStatus ===
          'AKTIF',
      ).length

    return NextResponse.json({
      summary: {
        totalTutors:
          result.length,
        activeTutors:
          totalActiveTutors,
        totalClasses:
          classList.length,
        totalActiveStudents:
          allActiveStudentIds.size,
      },

      tutors: filteredTutors,
    })
  } catch (error) {
    console.error(
      'FOUNDER TUTOR MONITORING ERROR:',
      error,
    )

    return NextResponse.json(
      {
        error:
          'Terjadi kesalahan saat mengambil monitoring tutor.',
      },
      { status: 500 },
    )
  }
}