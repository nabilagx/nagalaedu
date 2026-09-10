import { NextRequest, NextResponse } from 'next/server'

import { requireFounder } from '@/lib/auth/requireFounder'
import { createAdminClient } from '@/lib/supabase/admin'

const MIN_BILL_AMOUNT = 1_000
const MAX_BILL_AMOUNT = 1_000_000

function getCurrentMonthStart() {
  const now = new Date()

  return new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      1,
    ),
  )
}

function normalizeMonthPeriod(value: unknown) {
  if (typeof value !== 'string') return null

  const match = /^(\d{4})-(\d{2})$/.exec(value)

  if (!match) return null

  const year = Number(match[1])
  const month = Number(match[2])

  if (month < 1 || month > 12) return null

  return new Date(Date.UTC(year, month - 1, 1))
}

function isCurrentMonth(date: Date) {
  const current = getCurrentMonthStart()

  return (
    date.getUTCFullYear() === current.getUTCFullYear() &&
    date.getUTCMonth() === current.getUTCMonth()
  )
}

function generateOrderId() {
  const timestamp = Date.now()
  const random = Math.random()
    .toString(36)
    .substring(2, 8)
    .toUpperCase()

  return `NGL-SPP-${timestamp}-${random}`
}

// GET
export async function GET(request: NextRequest) {
  const auth = await requireFounder()

  if (!auth.authorized) {
    return auth.response
  }

  const admin = createAdminClient()

  const { searchParams } = new URL(request.url)

  const search = searchParams.get('search')?.trim() ?? ''
  const status = searchParams.get('status')?.trim() ?? ''
  const month = searchParams.get('month')?.trim() ?? ''

  let billQuery = admin
    .from('spp_bills')
    .select(`
      id,
      student_id,
      order_id,
      month_period,
      amount,
      payment_status,
      snap_token,
      paid_at,
      created_at
    `)
    .order('month_period', { ascending: false })
    .order('created_at', { ascending: false })

  if (status) {
    billQuery = billQuery.eq('payment_status', status)
  }

  if (month) {
    const monthDate = normalizeMonthPeriod(month)

    if (monthDate) {
      const nextMonth = new Date(monthDate)
      nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1)

      billQuery = billQuery
        .gte('month_period', monthDate.toISOString())
        .lt('month_period', nextMonth.toISOString())
    }
  }

  const { data: bills, error: billsError } = await billQuery

  if (billsError) {
    console.error('GET FINANCE BILLS ERROR:', billsError)

    return NextResponse.json(
      {
        error: 'Gagal mengambil data tagihan.',
      },
      { status: 500 },
    )
  }

  const studentIds = [
    ...new Set(
      (bills ?? [])
        .map((bill) => bill.student_id)
        .filter(Boolean),
    ),
  ]

  let students: Array<{
    id: string
    student_name: string
    grade_level: string | null
    school_name: string | null
    parent_id: string | null
  }> = []

  if (studentIds.length > 0) {
    const { data, error } = await admin
      .from('students')
      .select(`
        id,
        student_name,
        grade_level,
        school_name,
        parent_id
      `)
      .in('id', studentIds)

    if (error) {
      console.error('GET FINANCE STUDENTS ERROR:', error)

      return NextResponse.json(
        {
          error: 'Gagal mengambil data siswa.',
        },
        { status: 500 },
      )
    }

    students = data ?? []
  }

  const studentMap = new Map(
    students.map((student) => [student.id, student]),
  )

  let filteredBills = (bills ?? []).map((bill) => ({
    ...bill,
    student: studentMap.get(bill.student_id) ?? null,
  }))

  if (search) {
    const keyword = search.toLowerCase()

    filteredBills = filteredBills.filter((bill) => {
      const studentName =
        bill.student?.student_name?.toLowerCase() ?? ''

      const orderId =
        bill.order_id?.toLowerCase() ?? ''

      return (
        studentName.includes(keyword) ||
        orderId.includes(keyword)
      )
    })
  }

  const totalBills = filteredBills.length

  const paidBills = filteredBills.filter(
    (bill) => bill.payment_status === 'PAID',
  )

  const pendingBills = filteredBills.filter(
    (bill) => bill.payment_status === 'PENDING',
  )

  const unpaidAmount = filteredBills
    .filter((bill) => bill.payment_status !== 'PAID')
    .reduce((total, bill) => total + Number(bill.amount), 0)

  const paidAmount = paidBills.reduce(
    (total, bill) => total + Number(bill.amount),
    0,
  )

  return NextResponse.json({
    summary: {
      totalBills,
      paidBills: paidBills.length,
      pendingBills: pendingBills.length,
      paidAmount,
      unpaidAmount,
    },
    bills: filteredBills,
  })
}

// POST
export async function POST(request: NextRequest) {
  const auth = await requireFounder()

  if (!auth.authorized) {
    return auth.response
  }

  try {
    const body = await request.json()

    const studentId =
      typeof body.studentId === 'string'
        ? body.studentId.trim()
        : ''

    const amount = Number(body.amount)

    const monthPeriod =
      normalizeMonthPeriod(body.monthPeriod)

    if (!studentId) {
      return NextResponse.json(
        {
          error: 'Siswa wajib dipilih.',
        },
        { status: 400 },
      )
    }

    if (!Number.isFinite(amount)) {
      return NextResponse.json(
        {
          error: 'Nominal tagihan tidak valid.',
        },
        { status: 400 },
      )
    }

    if (!Number.isInteger(amount)) {
      return NextResponse.json(
        {
          error: 'Nominal tagihan harus berupa angka bulat.',
        },
        { status: 400 },
      )
    }

    if (amount < MIN_BILL_AMOUNT) {
      return NextResponse.json(
        {
          error: `Nominal minimal Rp${MIN_BILL_AMOUNT.toLocaleString('id-ID')}.`,
        },
        { status: 400 },
      )
    }

    if (amount > MAX_BILL_AMOUNT) {
      return NextResponse.json(
        {
          error: `Nominal maksimal Rp${MAX_BILL_AMOUNT.toLocaleString('id-ID')} per tagihan.`,
        },
        { status: 400 },
      )
    }

    if (!monthPeriod) {
      return NextResponse.json(
        {
          error: 'Periode tagihan tidak valid.',
        },
        { status: 400 },
      )
    }

    if (!isCurrentMonth(monthPeriod)) {
      return NextResponse.json(
        {
          error:
            'Tagihan hanya dapat dibuat untuk bulan berjalan.',
        },
        { status: 400 },
      )
    }

    const admin = createAdminClient()

    const {
      data: student,
      error: studentError,
    } = await admin
      .from('students')
      .select(`
        id,
        student_name,
        status
      `)
      .eq('id', studentId)
      .maybeSingle()

    if (studentError) {
      console.error(
        'CREATE FINANCE STUDENT ERROR:',
        studentError,
      )

      return NextResponse.json(
        {
          error: 'Gagal memverifikasi siswa.',
        },
        { status: 500 },
      )
    }

    if (!student) {
      return NextResponse.json(
        {
          error: 'Siswa tidak ditemukan.',
        },
        { status: 404 },
      )
    }

    if (student.status !== 'ACTIVE') {
      return NextResponse.json(
        {
          error: 'Tagihan hanya dapat dibuat untuk siswa aktif.',
        },
        { status: 400 },
      )
    }

    const monthStart = monthPeriod.toISOString()

    const {
      data: existingBill,
      error: existingBillError,
    } = await admin
      .from('spp_bills')
      .select(`
        id,
        payment_status,
        amount
      `)
      .eq('student_id', studentId)
      .eq('month_period', monthStart)
      .maybeSingle()

    if (existingBillError) {
      console.error(
        'CHECK EXISTING BILL ERROR:',
        existingBillError,
      )

      return NextResponse.json(
        {
          error: 'Gagal memeriksa tagihan sebelumnya.',
        },
        { status: 500 },
      )
    }

    if (existingBill) {
      return NextResponse.json(
        {
          error:
            'Tagihan untuk siswa tersebut pada bulan berjalan sudah ada.',
          bill: existingBill,
        },
        { status: 409 },
      )
    }

    const orderId = generateOrderId()

    const { data: bill, error: insertError } = await admin
      .from('spp_bills')
      .insert({
        student_id: studentId,
        order_id: orderId,
        month_period: monthStart,
        amount,
        payment_status: 'PENDING',
      })
      .select(`
        id,
        student_id,
        order_id,
        month_period,
        amount,
        payment_status,
        created_at
      `)
      .single()

    if (insertError) {
      console.error(
        'CREATE FINANCE BILL ERROR:',
        insertError,
      )

      if (insertError.code === '23505') {
        return NextResponse.json(
          {
            error:
              'Tagihan untuk siswa tersebut pada bulan berjalan sudah ada.',
          },
          { status: 409 },
        )
      }

      return NextResponse.json(
        {
          error: 'Gagal membuat tagihan.',
        },
        { status: 500 },
      )
    }

    return NextResponse.json(
      {
        message: 'Tagihan berhasil dibuat.',
        bill,
      },
      { status: 201 },
    )
  } catch (error) {
    console.error('POST FINANCE ERROR:', error)

    return NextResponse.json(
      {
        error: 'Format data tidak valid.',
      },
      { status: 400 },
    )
  }
}