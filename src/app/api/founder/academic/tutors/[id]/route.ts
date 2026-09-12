import {
  NextRequest,
  NextResponse,
} from 'next/server'

import { requireFounder } from '@/lib/auth/requireFounder'
import { createAdminClient } from '@/lib/supabase/admin'

type Params = {
  params: Promise<{
    id: string
  }>
}

type TutorRow = {
  id: string
  full_name: string | null
  phone_number: string | null
}

type ClassRow = {
  id: string
  class_name: string
  subject: string
  description: string | null
  schedule_day: string
  schedule_start: string
  schedule_end: string
  status: string
}

type EnrollmentRow = {
  id: string
  class_id: string
  student_id: string
  status: string
}

type StudentRow = {
  id: string
  student_name: string
  grade_level: string | null
  school_name: string | null
  status: string
}

type AttendanceRow = {
  enrollment_id: string
  status: string
  attendance_date: string
}

type GradeRow = {
  id: string
  enrollment_id: string
  subject: string
  assessment_name: string
  score: number | string
  feedback_notes: string | null
  created_at: string
}

type ModuleRow = {
  id: string
  class_id: string
  title: string
  description: string | null
  file_url: string | null
  created_at: string
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function GET(
  _request: NextRequest,
  { params }: Params,
) {
  const auth = await requireFounder()

  if (!auth.authorized) {
    return auth.response
  }

  try {
    const { id } = await params

    // ==========================================
    // VALIDASI UUID
    // ==========================================

    if (!id || !UUID_REGEX.test(id)) {
      return NextResponse.json(
        {
          error:
            'ID tutor tidak valid.',
        },
        {
          status: 400,
        },
      )
    }

    const admin =
      createAdminClient()

    // ==========================================
    // TUTOR
    // ==========================================

    const {
      data: tutor,
      error: tutorError,
    } = await admin
      .from('profiles')
      .select(
        `
        id,
        full_name,
        phone_number
        `,
      )
      .eq('id', id)
      .eq('role_id', 2)
      .maybeSingle()

    if (tutorError) {
      console.error(
        'GET TUTOR DETAIL PROFILE ERROR:',
        tutorError,
      )

      return NextResponse.json(
        {
          error:
            'Gagal mengambil profil tutor.',
        },
        {
          status: 500,
        },
      )
    }

    if (!tutor) {
      return NextResponse.json(
        {
          error:
            'Tutor tidak ditemukan.',
        },
        {
          status: 404,
        },
      )
    }

    const tutorRow =
      tutor as TutorRow

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
        description,
        schedule_day,
        schedule_start,
        schedule_end,
        status
        `,
      )
      .eq('tutor_id', id)
      .order('class_name', {
        ascending: true,
      })

    if (classesError) {
      console.error(
        'GET TUTOR DETAIL CLASSES ERROR:',
        classesError,
      )

      return NextResponse.json(
        {
          error:
            'Gagal mengambil kelas tutor.',
        },
        {
          status: 500,
        },
      )
    }

    const classRows: ClassRow[] =
      classes ?? []

    const classIds =
      classRows.map(
        (item) => item.id,
      )

    // ==========================================
    // ENROLLMENTS
    // ==========================================

    let enrollments: EnrollmentRow[] =
      []

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
          'GET TUTOR DETAIL ENROLLMENTS ERROR:',
          error,
        )

        return NextResponse.json(
          {
            error:
              'Gagal mengambil data siswa tutor.',
          },
          {
            status: 500,
          },
        )
      }

      enrollments = data ?? []
    }

    // ==========================================
    // ACTIVE ENROLLMENTS
    // ==========================================

    const activeEnrollments =
      enrollments.filter(
        (item) =>
          item.status === 'ACTIVE',
      )

    const enrollmentIds =
      activeEnrollments.map(
        (item) => item.id,
      )

    // ==========================================
    // STUDENTS
    // ==========================================

    const studentIds = [
      ...new Set(
        activeEnrollments.map(
          (item) =>
            item.student_id,
        ),
      ),
    ]

    let students: StudentRow[] =
      []

    if (studentIds.length > 0) {
      const {
        data,
        error,
      } = await admin
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
        .in(
          'id',
          studentIds,
        )
        .order('student_name', {
          ascending: true,
        })

      if (error) {
        console.error(
          'GET TUTOR DETAIL STUDENTS ERROR:',
          error,
        )

        return NextResponse.json(
          {
            error:
              'Gagal mengambil data siswa.',
          },
          {
            status: 500,
          },
        )
      }

      students = data ?? []
    }

    // ==========================================
    // ATTENDANCE
    // ==========================================

    let attendance: AttendanceRow[] =
      []

    if (enrollmentIds.length > 0) {
      const {
        data,
        error,
      } = await admin
        .from('student_attendance')
        .select(
          `
          enrollment_id,
          status,
          attendance_date
          `,
        )
        .in(
          'enrollment_id',
          enrollmentIds,
        )
        .order(
          'attendance_date',
          {
            ascending: false,
          },
        )

      if (error) {
        console.error(
          'GET TUTOR DETAIL ATTENDANCE ERROR:',
          error,
        )

        return NextResponse.json(
          {
            error:
              'Gagal mengambil data kehadiran.',
          },
          {
            status: 500,
          },
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
          id,
          enrollment_id,
          subject,
          assessment_name,
          score,
          feedback_notes,
          created_at
          `,
        )
        .in(
          'enrollment_id',
          enrollmentIds,
        )
        .order('created_at', {
          ascending: false,
        })

      if (error) {
        console.error(
          'GET TUTOR DETAIL GRADES ERROR:',
          error,
        )

        return NextResponse.json(
          {
            error:
              'Gagal mengambil data nilai.',
          },
          {
            status: 500,
          },
        )
      }

      grades = data ?? []
    }

    // ==========================================
    // MODULES
    // ==========================================

    const {
      data: modules,
      error: modulesError,
    } = await admin
      .from('learning_modules')
      .select(
        `
        id,
        class_id,
        title,
        description,
        file_url,
        created_at
        `,
      )
      .eq('tutor_id', id)
      .order('created_at', {
        ascending: false,
      })

    if (modulesError) {
      console.error(
        'GET TUTOR DETAIL MODULES ERROR:',
        modulesError,
      )

      return NextResponse.json(
        {
          error:
            'Gagal mengambil data modul.',
        },
        {
          status: 500,
        },
      )
    }

    const moduleRows: ModuleRow[] =
      modules ?? []

    // ==========================================
    // STATISTIK ABSENSI
    // ==========================================

    const hadir =
      attendance.filter(
        (item) =>
          item.status === 'HADIR',
      ).length

    const izin =
      attendance.filter(
        (item) =>
          item.status === 'IZIN',
      ).length

    const sakit =
      attendance.filter(
        (item) =>
          item.status === 'SAKIT',
      ).length

    const alpha =
      attendance.filter(
        (item) =>
          item.status === 'ALPHA',
      ).length

    const totalAttendance =
      attendance.length

    const attendancePercentage =
      totalAttendance > 0
        ? Number(
            (
              (hadir /
                totalAttendance) *
              100
            ).toFixed(1),
          )
        : 0

    // ==========================================
    // STATISTIK NILAI
    // ==========================================

    const validGradeValues =
      grades
        .map((item) =>
          Number(item.score),
        )
        .filter(
          (score) =>
            Number.isFinite(score),
        )

    const averageScore =
      validGradeValues.length > 0
        ? Number(
            (
              validGradeValues.reduce(
                (sum, score) =>
                  sum + score,
                0,
              ) /
              validGradeValues.length
            ).toFixed(1),
          )
        : 0

    // ==========================================
    // CLASSES WITH STUDENTS
    // ==========================================

    const classesWithStudents =
      classRows.map(
        (classItem) => {
          const classEnrollments =
            activeEnrollments.filter(
              (item) =>
                item.class_id ===
                classItem.id,
            )

          const classStudentIds =
            classEnrollments.map(
              (item) =>
                item.student_id,
            )

          const classStudents =
            students.filter(
              (student) =>
                classStudentIds.includes(
                  student.id,
                ),
            )

          return {
            id: classItem.id,

            className:
              classItem.class_name,

            subject:
              classItem.subject,

            description:
              classItem.description,

            scheduleDay:
              classItem.schedule_day,

            scheduleStart:
              classItem.schedule_start,

            scheduleEnd:
              classItem.schedule_end,

            status:
              classItem.status,

            totalStudents:
              classStudents.length,

            students:
              classStudents.map(
                (student) => ({
                  id: student.id,

                  studentName:
                    student.student_name,

                  gradeLevel:
                    student.grade_level,

                  schoolName:
                    student.school_name,

                  status:
                    student.status,
                }),
              ),
          }
        },
      )

    // ==========================================
    // RECENT ATTENDANCE
    // ==========================================

    const recentAttendance =
      attendance
        .slice(0, 20)
        .map((item) => {
          const enrollment =
            activeEnrollments.find(
              (enrollmentItem) =>
                enrollmentItem.id ===
                item.enrollment_id,
            )

          const student =
            students.find(
              (studentItem) =>
                studentItem.id ===
                enrollment?.student_id,
            )

          const classItem =
            classRows.find(
              (classRow) =>
                classRow.id ===
                enrollment?.class_id,
            )

          return {
            id:
              item.enrollment_id +
              item.attendance_date,

            date:
              item.attendance_date,

            status:
              item.status,

            studentName:
              student?.student_name ??
              '-',

            className:
              classItem?.class_name ??
              '-',

            subject:
              classItem?.subject ??
              '-',
          }
        })

    // ==========================================
    // RECENT GRADES
    // ==========================================

    const recentGrades =
      grades
        .slice(0, 20)
        .map((item) => {
          const enrollment =
            activeEnrollments.find(
              (enrollmentItem) =>
                enrollmentItem.id ===
                item.enrollment_id,
            )

          const student =
            students.find(
              (studentItem) =>
                studentItem.id ===
                enrollment?.student_id,
            )

          return {
            id: item.id,

            studentName:
              student?.student_name ??
              '-',

            subject:
              item.subject,

            assessmentName:
              item.assessment_name,

            score:
              Number(item.score),

            feedbackNotes:
              item.feedback_notes,

            createdAt:
              item.created_at,
          }
        })

    // ==========================================
    // MODULE RESPONSE
    // ==========================================

    const formattedModules =
      moduleRows
        .slice(0, 20)
        .map((item) => {
          const classItem =
            classRows.find(
              (classRow) =>
                classRow.id ===
                item.class_id,
            )

          return {
            id: item.id,

            title:
              item.title,

            description:
              item.description,

            fileUrl:
              item.file_url,

            className:
              classItem?.class_name ??
              '-',

            subject:
              classItem?.subject ??
              '-',

            createdAt:
              item.created_at,
          }
        })

    // ==========================================
    // RESPONSE
    // ==========================================

    return NextResponse.json({
      tutor: {
        id: tutorRow.id,

        fullName:
          tutorRow.full_name,

        phoneNumber:
          tutorRow.phone_number,

        status:
          classRows.some(
            (item) =>
              item.status ===
              'ACTIVE',
          )
            ? 'AKTIF'
            : 'TIDAK_AKTIF',
      },

      summary: {
        totalClasses:
          classRows.length,

        activeClasses:
          classRows.filter(
            (item) =>
              item.status ===
              'ACTIVE',
          ).length,

        totalStudents:
          studentIds.length,

        attendance: {
          hadir,
          izin,
          sakit,
          alpha,
          percentage:
            attendancePercentage,
        },

        averageScore,

        totalGrades:
          validGradeValues.length,

        totalModules:
          moduleRows.length,
      },

      classes:
        classesWithStudents,

      recentAttendance,

      recentGrades,

      modules:
        formattedModules,
    })
  } catch (error) {
    console.error(
      'GET FOUNDER TUTOR DETAIL ERROR:',
      error,
    )

    return NextResponse.json(
      {
        error:
          'Terjadi kesalahan pada server.',
      },
      {
        status: 500,
      },
    )
  }
}