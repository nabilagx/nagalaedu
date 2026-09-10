import { NextRequest, NextResponse } from 'next/server'

import { requireFounder } from '@/lib/auth/requireFounder'
import { createAdminClient } from '@/lib/supabase/admin'

const MAX_RESULTS = 10

export async function GET(request: NextRequest) {
  const auth = await requireFounder()

  if (!auth.authorized) {
    return auth.response
  }

  try {
    const admin = createAdminClient()

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')?.trim() ?? ''

    if (search.length < 2) {
      return NextResponse.json({
        students: [],
      })
    }

    const keyword = `%${search}%`

    // Cari siswa aktif yang memiliki parent.
    const {
      data: students,
      error: studentsError,
    } = await admin
      .from('students')
      .select(`
        id,
        student_name,
        grade_level,
        school_name,
        parent_id
      `)
      .eq('status', 'ACTIVE')
      .not('parent_id', 'is', null)
      .or(
        `student_name.ilike.${keyword},school_name.ilike.${keyword},grade_level.ilike.${keyword}`,
      )
      .order('student_name', {
        ascending: true,
      })
      .limit(MAX_RESULTS)

    if (studentsError) {
      console.error(
        'SEARCH FINANCE STUDENTS ERROR:',
        studentsError,
      )

      return NextResponse.json(
        {
          error: 'Gagal mencari siswa.',
        },
        { status: 500 },
      )
    }

    const studentList = students ?? []

    if (studentList.length === 0) {
      return NextResponse.json({
        students: [],
      })
    }

    const studentIds = studentList.map(
      (student) => student.id,
    )

    // Ambil enrollment aktif siswa.
    const {
      data: enrollments,
      error: enrollmentError,
    } = await admin
      .from('class_enrollments')
      .select(`
        id,
        student_id,
        class_id,
        status
      `)
      .in('student_id', studentIds)
      .eq('status', 'ACTIVE')

    if (enrollmentError) {
      console.error(
        'SEARCH FINANCE ENROLLMENTS ERROR:',
        enrollmentError,
      )

      return NextResponse.json(
        {
          error: 'Gagal mengambil kelas siswa.',
        },
        { status: 500 },
      )
    }

    const enrollmentList = enrollments ?? []

    const classIds = [
      ...new Set(
        enrollmentList
          .map((enrollment) => enrollment.class_id)
          .filter(Boolean),
      ),
    ]

    let classes: Array<{
      id: string
      class_name: string
      subject: string
      status: string
    }> = []

    if (classIds.length > 0) {
      const {
        data: classData,
        error: classError,
      } = await admin
        .from('classes')
        .select(`
          id,
          class_name,
          subject,
          status
        `)
        .in('id', classIds)

      if (classError) {
        console.error(
          'SEARCH FINANCE CLASSES ERROR:',
          classError,
        )

        return NextResponse.json(
          {
            error: 'Gagal mengambil data kelas.',
          },
          { status: 500 },
        )
      }

      classes = classData ?? []
    }

    const classMap = new Map(
      classes.map((item) => [item.id, item]),
    )

    const classesByStudent = new Map<
      string,
      Array<{
        id: string
        class_name: string
        subject: string
        status: string
      }>
    >()

    for (const enrollment of enrollmentList) {
      const classData = classMap.get(
        enrollment.class_id,
      )

      if (!classData) continue

      const existing =
        classesByStudent.get(
          enrollment.student_id,
        ) ?? []

      existing.push(classData)

      classesByStudent.set(
        enrollment.student_id,
        existing,
      )
    }

    // Ambil bulan berjalan.
    const now = new Date()

    const currentMonthStart = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        1,
      ),
    )

    const nextMonthStart = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth() + 1,
        1,
      ),
    )

    // Cek tagihan bulan berjalan.
    const {
      data: existingBills,
      error: billsError,
    } = await admin
      .from('spp_bills')
      .select(`
        id,
        student_id,
        payment_status,
        amount
      `)
      .in('student_id', studentIds)
      .gte(
        'month_period',
        currentMonthStart.toISOString(),
      )
      .lt(
        'month_period',
        nextMonthStart.toISOString(),
      )

    if (billsError) {
      console.error(
        'SEARCH FINANCE BILLS ERROR:',
        billsError,
      )

      return NextResponse.json(
        {
          error: 'Gagal memeriksa tagihan siswa.',
        },
        { status: 500 },
      )
    }

    const billMap = new Map(
      (existingBills ?? []).map((bill) => [
        bill.student_id,
        bill,
      ]),
    )

    const result = studentList.map((student) => {
      const bill = billMap.get(student.id)

      return {
        id: student.id,
        student_name: student.student_name,
        grade_level: student.grade_level,
        school_name: student.school_name,
        parent_id: student.parent_id,
        classes:
          classesByStudent.get(student.id) ?? [],
        current_month_bill: bill
          ? {
              id: bill.id,
              payment_status:
                bill.payment_status,
              amount: Number(bill.amount),
            }
          : null,
      }
    })

    return NextResponse.json({
      students: result,
    })
  } catch (error) {
    console.error(
      'GET FINANCE STUDENT SEARCH ERROR:',
      error,
    )

    return NextResponse.json(
      {
        error: 'Terjadi kesalahan saat mencari siswa.',
      },
      { status: 500 },
    )
  }
}