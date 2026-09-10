import { NextResponse } from 'next/server'

import { requireFounder } from '@/lib/auth/requireFounder'
import { createAdminClient } from '@/lib/supabase/admin'

type Params = {
  params: Promise<{
    id: string
  }>
}

export async function GET(
  _request: Request,
  { params }: Params
) {
  const auth = await requireFounder()

  if (!auth.authorized) {
    return auth.response
  }

  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json(
        {
          error:
            'ID tutor tidak valid.',
        },
        {
          status: 400,
        }
      )
    }

    const admin =
      createAdminClient()

    /*
     * =========================
     * TUTOR
     * =========================
     */
    const {
      data: tutor,
      error: tutorError,
    } = await admin
      .from('profiles')
      .select(`
        id,
        full_name,
        phone_number
      `)
      .eq('id', id)
      .eq('role_id', 2)
      .maybeSingle()

    if (tutorError) {
      console.error(
        'GET TUTOR DETAIL PROFILE ERROR:',
        tutorError
      )

      return NextResponse.json(
        {
          error:
            'Gagal mengambil profil tutor.',
        },
        {
          status: 500,
        }
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
        }
      )
    }

    /*
     * =========================
     * CLASSES
     * =========================
     */
    const {
      data: classes,
      error: classesError,
    } = await admin
      .from('classes')
      .select(`
        id,
        class_name,
        subject,
        description,
        schedule_day,
        schedule_start,
        schedule_end,
        status
      `)
      .eq('tutor_id', id)
      .order('class_name', {
        ascending: true,
      })

    if (classesError) {
      console.error(
        'GET TUTOR DETAIL CLASSES ERROR:',
        classesError
      )

      return NextResponse.json(
        {
          error:
            'Gagal mengambil kelas tutor.',
        },
        {
          status: 500,
        }
      )
    }

    const classRows =
      classes ?? []

    const classIds =
      classRows.map(
        (item) => item.id
      )

    /*
     * =========================
     * ENROLLMENTS
     * =========================
     */
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
        .select(`
          id,
          class_id,
          student_id,
          status
        `)
        .in(
          'class_id',
          classIds
        )

      if (error) {
        console.error(
          'GET TUTOR DETAIL ENROLLMENTS ERROR:',
          error
        )

        return NextResponse.json(
          {
            error:
              'Gagal mengambil data siswa tutor.',
          },
          {
            status: 500,
          }
        )
      }

      enrollments =
        data ?? []
    }

    const activeEnrollments =
      enrollments.filter(
        (item) =>
          item.status === 'ACTIVE'
      )

    const enrollmentIds =
      activeEnrollments.map(
        (item) => item.id
      )

    /*
     * =========================
     * STUDENTS
     * =========================
     */
    const studentIds = [
      ...new Set(
        activeEnrollments.map(
          (item) =>
            item.student_id
        )
      ),
    ]

    let students: Array<{
      id: string
      student_name: string
      grade_level: string | null
      school_name: string | null
      status: string
    }> = []

    if (studentIds.length > 0) {
      const {
        data,
        error,
      } = await admin
        .from('students')
        .select(`
          id,
          student_name,
          grade_level,
          school_name,
          status
        `)
        .in(
          'id',
          studentIds
        )
        .order('student_name', {
          ascending: true,
        })

      if (error) {
        console.error(
          'GET TUTOR DETAIL STUDENTS ERROR:',
          error
        )

        return NextResponse.json(
          {
            error:
              'Gagal mengambil data siswa.',
          },
          {
            status: 500,
          }
        )
      }

      students =
        data ?? []
    }

    /*
     * =========================
     * ATTENDANCE
     * =========================
     */
    let attendance: Array<{
      enrollment_id: string
      status: string
      attendance_date: string
    }> = []

    if (enrollmentIds.length > 0) {
      const {
        data,
        error,
      } = await admin
        .from('student_attendance')
        .select(`
          enrollment_id,
          status,
          attendance_date
        `)
        .in(
          'enrollment_id',
          enrollmentIds
        )
        .order(
          'attendance_date',
          {
            ascending: false,
          }
        )

      if (error) {
        console.error(
          'GET TUTOR DETAIL ATTENDANCE ERROR:',
          error
        )

        return NextResponse.json(
          {
            error:
              'Gagal mengambil data kehadiran.',
          },
          {
            status: 500,
          }
        )
      }

      attendance =
        data ?? []
    }

    /*
     * =========================
     * GRADES
     * =========================
     */
    let grades: Array<{
      id: string
      enrollment_id: string
      subject: string
      assessment_name: string
      score: number | string
      feedback_notes: string | null
      created_at: string
    }> = []

    if (enrollmentIds.length > 0) {
      const {
        data,
        error,
      } = await admin
        .from('grades')
        .select(`
          id,
          enrollment_id,
          subject,
          assessment_name,
          score,
          feedback_notes,
          created_at
        `)
        .in(
          'enrollment_id',
          enrollmentIds
        )
        .order('created_at', {
          ascending: false,
        })

      if (error) {
        console.error(
          'GET TUTOR DETAIL GRADES ERROR:',
          error
        )

        return NextResponse.json(
          {
            error:
              'Gagal mengambil data nilai.',
          },
          {
            status: 500,
          }
        )
      }

      grades =
        data ?? []
    }

    /*
     * =========================
     * MODULES
     * =========================
     */
    const {
      data: modules,
      error: modulesError,
    } = await admin
      .from('learning_modules')
      .select(`
        id,
        class_id,
        title,
        description,
        file_url,
        created_at
      `)
      .eq('tutor_id', id)
      .order('created_at', {
        ascending: false,
      })

    if (modulesError) {
      console.error(
        'GET TUTOR DETAIL MODULES ERROR:',
        modulesError
      )

      return NextResponse.json(
        {
          error:
            'Gagal mengambil data modul.',
        },
        {
          status: 500,
        }
      )
    }

    /*
     * =========================
     * STATISTIK
     * =========================
     */
    const hadir =
      attendance.filter(
        (item) =>
          item.status === 'HADIR'
      ).length

    const izin =
      attendance.filter(
        (item) =>
          item.status === 'IZIN'
      ).length

    const sakit =
      attendance.filter(
        (item) =>
          item.status === 'SAKIT'
      ).length

    const alpha =
      attendance.filter(
        (item) =>
          item.status === 'ALPHA'
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
            ).toFixed(1)
          )
        : 0

    const averageScore =
      grades.length > 0
        ? Number(
            (
              grades.reduce(
                (sum, item) =>
                  sum +
                  Number(
                    item.score
                  ),
                0
              ) /
                grades.length
            ).toFixed(1)
          )
        : 0

    /*
     * =========================
     * RESPONSE
     * =========================
     */

    const classesWithStudents =
      classRows.map(
        (classItem) => {
          const classEnrollments =
            activeEnrollments.filter(
              (item) =>
                item.class_id ===
                classItem.id
            )

          const classStudentIds =
            classEnrollments.map(
              (item) =>
                item.student_id
            )

          const classStudents =
            students.filter(
              (student) =>
                classStudentIds.includes(
                  student.id
                )
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
                })
              ),
          }
        }
      )

    return NextResponse.json({
      tutor: {
        id: tutor.id,
        fullName:
          tutor.full_name,
        phoneNumber:
          tutor.phone_number,
        status:
          classRows.some(
            (item) =>
              item.status ===
              'ACTIVE'
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
              'ACTIVE'
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
          grades.length,

        totalModules:
          modules?.length ?? 0,
      },

      classes:
        classesWithStudents,

      recentAttendance:
        attendance.slice(0, 20).map(
          (item) => {
            const enrollment =
              activeEnrollments.find(
                (enrollmentItem) =>
                  enrollmentItem.id ===
                  item.enrollment_id
              )

            const student =
              students.find(
                (studentItem) =>
                  studentItem.id ===
                  enrollment?.student_id
              )

            const classItem =
              classRows.find(
                (classRow) =>
                  classRow.id ===
                  enrollment?.class_id
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
          }
        ),

      recentGrades:
        grades.slice(0, 20).map(
          (item) => {
            const enrollment =
              activeEnrollments.find(
                (enrollmentItem) =>
                  enrollmentItem.id ===
                  item.enrollment_id
              )

            const student =
              students.find(
                (studentItem) =>
                  studentItem.id ===
                  enrollment?.student_id
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
          }
        ),

      modules:
        (modules ?? []).slice(0, 20).map(
          (item) => {
            const classItem =
              classRows.find(
                (classRow) =>
                  classRow.id ===
                  item.class_id
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
          }
        ),
    })
  } catch (error) {
    console.error(
      'GET FOUNDER TUTOR DETAIL ERROR:',
      error
    )

    return NextResponse.json(
      {
        error:
          'Terjadi kesalahan pada server.',
      },
      {
        status: 500,
      }
    )
  }
}
