import {
  NextRequest,
  NextResponse,
} from 'next/server'

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

type EnrollmentRow = {
  id: string
  class_id: string
  student_id: string
  enrolled_at: string | null
  ended_at: string | null
  status: string
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

type AttendanceRow = {
  id: string
  enrollment_id: string
  attendance_date: string
  status: string
  notes: string | null
}

type GradeRow = {
  id: string
  enrollment_id: string
  subject: string | null
  assessment_name: string
  score: number
  feedback_notes: string | null
  created_at: string
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function GET(
  request: NextRequest,
  context: {
    params: Promise<{ id: string }>
  },
) {
  const auth = await requireFounder()

  if (!auth.authorized) {
    return auth.response
  }

  try {
    const { id } = await context.params

    // ==========================================
    // VALIDASI UUID
    // ==========================================

    if (!id || !UUID_REGEX.test(id)) {
      return NextResponse.json(
        {
          error:
            'ID siswa tidak valid.',
        },
        { status: 400 },
      )
    }

    const admin = createAdminClient()

    // ==========================================
    // SISWA
    // ==========================================

    const {
      data: student,
      error: studentError,
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
      .eq('id', id)
      .maybeSingle()

    if (studentError) {
      console.error(
        'GET ACADEMIC DETAIL STUDENT ERROR:',
        studentError,
      )

      return NextResponse.json(
        {
          error:
            'Gagal mengambil data siswa.',
        },
        { status: 500 },
      )
    }

    if (!student) {
      return NextResponse.json(
        {
          error:
            'Siswa tidak ditemukan.',
        },
        { status: 404 },
      )
    }

    const studentRow =
      student as StudentRow

    // ==========================================
    // ENROLLMENTS
    // ==========================================

    const {
      data: enrollments,
      error: enrollmentError,
    } = await admin
      .from('class_enrollments')
      .select(
        `
        id,
        class_id,
        student_id,
        enrolled_at,
        ended_at,
        status
        `,
      )
      .eq('student_id', id)
      .order('enrolled_at', {
        ascending: false,
      })

    if (enrollmentError) {
      console.error(
        'GET ACADEMIC DETAIL ENROLLMENT ERROR:',
        enrollmentError,
      )

      return NextResponse.json(
        {
          error:
            'Gagal mengambil data kelas siswa.',
        },
        { status: 500 },
      )
    }

    const enrollmentRows: EnrollmentRow[] =
      enrollments ?? []

    const classIds = [
      ...new Set(
        enrollmentRows.map(
          (item) => item.class_id,
        ),
      ),
    ]

    // ==========================================
    // CLASSES
    // ==========================================

    let classes: ClassRow[] = []

    if (classIds.length > 0) {
      const {
        data: classData,
        error,
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
        .in('id', classIds)

      if (error) {
        console.error(
          'GET ACADEMIC DETAIL CLASSES ERROR:',
          error,
        )

        return NextResponse.json(
          {
            error:
              'Gagal mengambil data kelas.',
          },
          { status: 500 },
        )
      }

      classes = classData ?? []
    }

    const classMap = new Map<
      string,
      ClassRow
    >(
      classes.map((item) => [
        item.id,
        item,
      ]),
    )

    // ==========================================
    // ATTENDANCE
    // ==========================================

    const enrollmentIds =
      enrollmentRows.map(
        (item) => item.id,
      )

    let attendance: AttendanceRow[] = []

    if (enrollmentIds.length > 0) {
      const {
        data,
        error,
      } = await admin
        .from('student_attendance')
        .select(
          `
          id,
          enrollment_id,
          attendance_date,
          status,
          notes
          `,
        )
        .in(
          'enrollment_id',
          enrollmentIds,
        )
        .order('attendance_date', {
          ascending: false,
        })

      if (error) {
        console.error(
          'GET ACADEMIC DETAIL ATTENDANCE ERROR:',
          error,
        )

        return NextResponse.json(
          {
            error:
              'Gagal mengambil data kehadiran.',
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
          'GET ACADEMIC DETAIL GRADES ERROR:',
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
    // RINGKASAN ABSENSI
    // ==========================================

    const attendanceSummary = {
      hadir: 0,
      izin: 0,
      sakit: 0,
      alpha: 0,
    }

    for (const item of attendance) {
      switch (item.status) {
        case 'HADIR':
          attendanceSummary.hadir++
          break

        case 'IZIN':
          attendanceSummary.izin++
          break

        case 'SAKIT':
          attendanceSummary.sakit++
          break

        case 'ALPHA':
          attendanceSummary.alpha++
          break

        default:
          break
      }
    }

    const totalAttendance =
      attendanceSummary.hadir +
      attendanceSummary.izin +
      attendanceSummary.sakit +
      attendanceSummary.alpha

    const attendancePercentage =
      totalAttendance > 0
        ? (attendanceSummary.hadir /
            totalAttendance) *
          100
        : 0

    // ==========================================
    // RINGKASAN NILAI
    // ==========================================

    const scoreValues = grades
      .map((item) =>
        Number(item.score),
      )
      .filter((score) =>
        Number.isFinite(score),
      )

    const averageScore =
      scoreValues.length > 0
        ? scoreValues.reduce(
            (sum, score) =>
              sum + score,
            0,
          ) / scoreValues.length
        : 0

    // ==========================================
    // ENROLLMENTS RESPONSE
    // ==========================================

    const formattedEnrollments =
      enrollmentRows.map(
        (enrollment) => {
          const classData =
            classMap.get(
              enrollment.class_id,
            )

          return {
            id: enrollment.id,
            status: enrollment.status,
            enrolledAt:
              enrollment.enrolled_at,
            endedAt:
              enrollment.ended_at,

            class: classData
              ? {
                  id: classData.id,
                  className:
                    classData.class_name,
                  subject:
                    classData.subject,
                  description:
                    classData.description,
                  scheduleDay:
                    classData.schedule_day,
                  scheduleStart:
                    classData.schedule_start,
                  scheduleEnd:
                    classData.schedule_end,
                  status:
                    classData.status,
                }
              : null,
          }
        },
      )

    // ==========================================
    // ATTENDANCE RESPONSE
    // ==========================================

    const formattedAttendance =
      attendance.map((item) => {
        const enrollment =
          enrollmentRows.find(
            (enrollment) =>
              enrollment.id ===
              item.enrollment_id,
          )

        const classData =
          enrollment
            ? classMap.get(
                enrollment.class_id,
              )
            : null

        return {
          id: item.id,
          date: item.attendance_date,
          status: item.status,
          notes: item.notes,
          className:
            classData?.class_name ??
            '-',
          subject:
            classData?.subject ?? '-',
        }
      })

    // ==========================================
    // GRADES RESPONSE
    // ==========================================

    const formattedGrades =
      grades.map((item) => {
        const enrollment =
          enrollmentRows.find(
            (enrollment) =>
              enrollment.id ===
              item.enrollment_id,
          )

        const classData =
          enrollment
            ? classMap.get(
                enrollment.class_id,
              )
            : null

        return {
          id: item.id,

          subject:
            item.subject ??
            classData?.subject ??
            '-',

          assessmentName:
            item.assessment_name,

          score: Number(item.score),

          feedbackNotes:
            item.feedback_notes,

          createdAt:
            item.created_at,
        }
      })

    // ==========================================
    // RESPONSE
    // ==========================================

    return NextResponse.json({
      student: {
        id: studentRow.id,
        studentName:
          studentRow.student_name,
        gradeLevel:
          studentRow.grade_level,
        schoolName:
          studentRow.school_name,
        phoneNumber:
          studentRow.phone_number,
        status:
          studentRow.status,
      },

      summary: {
        attendance: {
          ...attendanceSummary,
          percentage: Number(
            attendancePercentage.toFixed(
              1,
            ),
          ),
        },

        averageScore: Number(
          averageScore.toFixed(1),
        ),

        totalGrades:
          scoreValues.length,

        totalClasses:
          formattedEnrollments.length,
      },

      enrollments:
        formattedEnrollments,

      attendance:
        formattedAttendance,

      grades:
        formattedGrades,
    })
  } catch (error) {
    console.error(
      'GET ACADEMIC DETAIL UNEXPECTED ERROR:',
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