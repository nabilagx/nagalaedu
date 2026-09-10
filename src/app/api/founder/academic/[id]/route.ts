

import { NextRequest, NextResponse } from 'next/server'

import { requireFounder } from '@/lib/auth/requireFounder'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(
  request: NextRequest,
  context: {
    params: Promise<{ id: string }>
  }
) {
  const auth = await requireFounder()

  if (!auth.authorized) {
    return auth.response
  }

  try {
    const { id } = await context.params

    if (!id) {
      return NextResponse.json(
        {
          error: 'ID siswa tidak valid.',
        },
        { status: 400 }
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
      .select(`
        id,
        student_name,
        grade_level,
        school_name,
        phone_number,
        status
      `)
      .eq('id', id)
      .maybeSingle()

    if (studentError) {
      console.error(
        'GET ACADEMIC DETAIL STUDENT ERROR:',
        studentError
      )

      return NextResponse.json(
        {
          error: 'Gagal mengambil data siswa.',
        },
        { status: 500 }
      )
    }

    if (!student) {
      return NextResponse.json(
        {
          error: 'Siswa tidak ditemukan.',
        },
        { status: 404 }
      )
    }

    // ==========================================
    // ENROLLMENTS
    // ==========================================

    const {
      data: enrollments,
      error: enrollmentError,
    } = await admin
      .from('class_enrollments')
      .select(`
        id,
        class_id,
        student_id,
        enrolled_at,
        ended_at,
        status
      `)
      .eq('student_id', id)
      .order('enrolled_at', {
        ascending: false,
      })

    if (enrollmentError) {
      console.error(
        'GET ACADEMIC DETAIL ENROLLMENT ERROR:',
        enrollmentError
      )

      return NextResponse.json(
        {
          error:
            'Gagal mengambil data kelas siswa.',
        },
        { status: 500 }
      )
    }

    const enrollmentRows =
      enrollments ?? []

    const classIds = [
      ...new Set(
        enrollmentRows.map(
          (item) => item.class_id
        )
      ),
    ]

    // ==========================================
    // CLASSES
    // ==========================================

    let classes: any[] = []

    if (classIds.length > 0) {
      const { data: classData, error } =
        await admin
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
          .in('id', classIds)

      if (error) {
        console.error(
          'GET ACADEMIC DETAIL CLASSES ERROR:',
          error
        )

        return NextResponse.json(
          {
            error: 'Gagal mengambil data kelas.',
          },
          { status: 500 }
        )
      }

      classes = classData ?? []
    }

    const classMap = new Map(
      classes.map((item) => [
        item.id,
        item,
      ])
    )

    // ==========================================
    // ATTENDANCE
    // ==========================================

    const enrollmentIds =
      enrollmentRows.map(
        (item) => item.id
      )

    let attendance: any[] = []

    if (enrollmentIds.length > 0) {
      const { data, error } =
        await admin
          .from('student_attendance')
          .select(`
            id,
            enrollment_id,
            attendance_date,
            status,
            notes
          `)
          .in(
            'enrollment_id',
            enrollmentIds
          )
          .order('attendance_date', {
            ascending: false,
          })

      if (error) {
        console.error(
          'GET ACADEMIC DETAIL ATTENDANCE ERROR:',
          error
        )

        return NextResponse.json(
          {
            error:
              'Gagal mengambil data kehadiran.',
          },
          { status: 500 }
        )
      }

      attendance = data ?? []
    }

    // ==========================================
    // GRADES
    // ==========================================

    let grades: any[] = []

    if (enrollmentIds.length > 0) {
      const { data, error } =
        await admin
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
          'GET ACADEMIC DETAIL GRADES ERROR:',
          error
        )

        return NextResponse.json(
          {
            error: 'Gagal mengambil data nilai.',
          },
          { status: 500 }
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
      if (
        item.status === 'HADIR'
      ) {
        attendanceSummary.hadir++
      }

      if (
        item.status === 'IZIN'
      ) {
        attendanceSummary.izin++
      }

      if (
        item.status === 'SAKIT'
      ) {
        attendanceSummary.sakit++
      }

      if (
        item.status === 'ALPHA'
      ) {
        attendanceSummary.alpha++
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
      .map((item) => Number(item.score))
      .filter(
        (score) => !Number.isNaN(score)
      )

    const averageScore =
      scoreValues.length > 0
        ? scoreValues.reduce(
            (sum, score) =>
              sum + score,
            0
          ) /
          scoreValues.length
        : 0

    // ==========================================
    // RESPONSE
    // ==========================================

    const formattedEnrollments =
      enrollmentRows.map(
        (enrollment) => {
          const classData =
            classMap.get(
              enrollment.class_id
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
        }
      )

    const formattedAttendance =
      attendance.map((item) => {
        const enrollment =
          enrollmentRows.find(
            (enrollment) =>
              enrollment.id ===
              item.enrollment_id
          )

        const classData =
          enrollment
            ? classMap.get(
                enrollment.class_id
              )
            : null

        return {
          id: item.id,
          date:
            item.attendance_date,
          status: item.status,
          notes: item.notes,
          className:
            classData?.class_name ??
            '-',
          subject:
            classData?.subject ?? '-',
        }
      })

    const formattedGrades =
      grades.map((item) => {
        const enrollment =
          enrollmentRows.find(
            (enrollment) =>
              enrollment.id ===
              item.enrollment_id
          )

        const classData =
          enrollment
            ? classMap.get(
                enrollment.class_id
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

    return NextResponse.json({
      student: {
        id: student.id,
        studentName:
          student.student_name,
        gradeLevel:
          student.grade_level,
        schoolName:
          student.school_name,
        phoneNumber:
          student.phone_number,
        status: student.status,
      },

      summary: {
        attendance: {
          ...attendanceSummary,
          percentage: Number(
            attendancePercentage.toFixed(1)
          ),
        },

        averageScore: Number(
          averageScore.toFixed(1)
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
      error
    )

    return NextResponse.json(
      {
        error: 'Terjadi kesalahan pada server.',
      },
      { status: 500 }
    )
  }
}