import { NextRequest, NextResponse } from 'next/server'

import { requireFounder } from '@/lib/auth/requireFounder'
import { createAdminClient } from '@/lib/supabase/admin'

const MIN_BILL_AMOUNT = 1_000
const MAX_BILL_AMOUNT = 1_000_000

const MAX_SEARCH_LENGTH = 100
const MAX_BILLS = 1000

const PAYMENT_STATUSES = [
  'PENDING',
  'PAID',
  'EXPIRED',
  'CANCELLED',
] as const

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const MONTH_REGEX = /^(\d{4})-(0[1-9]|1[0-2])$/

const CONTROL_CHAR_REGEX = /[\u0000-\u001F\u007F]/

function json(
  body: unknown,
  status = 200,
) {
  return NextResponse.json(body, {
    status,
    headers: {
      'Cache-Control': 'private, no-store',
    },
  })
}

function isPlainObject(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
  )
}

function isValidUUID(value: string) {
  return UUID_REGEX.test(value)
}

function getCurrentMonthStart() {
  const now = new Date()

  const jakartaParts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(now)

  const year = Number(
    jakartaParts.find((part) => part.type === 'year')?.value,
  )

  const month = Number(
    jakartaParts.find((part) => part.type === 'month')?.value,
  )

  return new Date(Date.UTC(year, month - 1, 1))
}

function normalizeMonthPeriod(value: unknown) {
  if (typeof value !== 'string') {
    return null
  }

  const match = MONTH_REGEX.exec(value)

  if (!match) {
    return null
  }

  const year = Number(match[1])
  const month = Number(match[2])

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
  return `NGL-SPP-${Date.now()}-${crypto
    .randomUUID()
    .replace(/-/g, '')
    .slice(0, 12)
    .toUpperCase()}`
}

function validateSearch(value: string) {
  if (value.length > MAX_SEARCH_LENGTH) {
    return 'Pencarian terlalu panjang.'
  }

  if (CONTROL_CHAR_REGEX.test(value)) {
    return 'Pencarian mengandung karakter yang tidak valid.'
  }

  return null
}

function isPaymentStatus(
  value: string,
): value is (typeof PAYMENT_STATUSES)[number] {
  return PAYMENT_STATUSES.includes(
    value as (typeof PAYMENT_STATUSES)[number],
  )
}

/* =========================================================
   GET
========================================================= */

export async function GET(
  request: NextRequest,
) {
  const auth = await requireFounder()

  if (!auth.authorized) {
    return auth.response
  }

  try {
    const admin = createAdminClient()

    const { searchParams } = new URL(request.url)

    const search =
      searchParams.get('search')?.trim() ?? ''

    const status =
      searchParams.get('status')?.trim() ?? ''

    const month =
      searchParams.get('month')?.trim() ?? ''

    const searchError = validateSearch(search)

    if (searchError) {
      return json(
        {
          error: searchError,
        },
        400,
      )
    }

    if (
      status &&
      !isPaymentStatus(status)
    ) {
      return json(
        {
          error: 'Status pembayaran tidak valid.',
        },
        400,
      )
    }

    let monthDate: Date | null = null

    if (month) {
      monthDate = normalizeMonthPeriod(month)

      if (!monthDate) {
        return json(
          {
            error: 'Format bulan tidak valid.',
          },
          400,
        )
      }
    }

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
      .order('month_period', {
        ascending: false,
      })
      .order('created_at', {
        ascending: false,
      })
      .limit(MAX_BILLS)

    if (status) {
      billQuery = billQuery.eq(
        'payment_status',
        status,
      )
    }

    if (monthDate) {
      const nextMonth = new Date(monthDate)

      nextMonth.setUTCMonth(
        nextMonth.getUTCMonth() + 1,
      )

      billQuery = billQuery
        .gte(
          'month_period',
          monthDate.toISOString(),
        )
        .lt(
          'month_period',
          nextMonth.toISOString(),
        )
    }

    const {
      data: bills,
      error: billsError,
    } = await billQuery

    if (billsError) {
      console.error(
        'GET FINANCE BILLS ERROR:',
        billsError,
      )

      return json(
        {
          error: 'Gagal mengambil data tagihan.',
        },
        500,
      )
    }

    const studentIds = [
      ...new Set(
        (bills ?? [])
          .map((bill) => bill.student_id)
          .filter(
            (id): id is string =>
              typeof id === 'string' &&
              isValidUUID(id),
          ),
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
          parent_id
        `)
        .in('id', studentIds)

      if (error) {
        console.error(
          'GET FINANCE STUDENTS ERROR:',
          error,
        )

        return json(
          {
            error: 'Gagal mengambil data siswa.',
          },
          500,
        )
      }

      students = data ?? []
    }

    const studentMap = new Map(
      students.map((student) => [
        student.id,
        student,
      ]),
    )

    let filteredBills = (bills ?? []).map(
      (bill) => ({
        ...bill,
        student:
          studentMap.get(
            bill.student_id,
          ) ?? null,
      }),
    )

    /*
     * Search dilakukan setelah data student
     * dipetakan agar input user tidak masuk
     * langsung ke expression PostgREST.
     */
    if (search) {
      const keyword =
        search.toLocaleLowerCase('id-ID')

      filteredBills =
        filteredBills.filter((bill) => {
          const studentName =
            bill.student?.student_name
              ?.toLocaleLowerCase('id-ID') ??
            ''

          const orderId =
            bill.order_id
              ?.toLocaleLowerCase('id-ID') ??
            ''

          return (
            studentName.includes(keyword) ||
            orderId.includes(keyword)
          )
        })
    }

    const totalBills =
      filteredBills.length

    const paidBills =
      filteredBills.filter(
        (bill) =>
          bill.payment_status === 'PAID',
      )

    const pendingBills =
      filteredBills.filter(
        (bill) =>
          bill.payment_status === 'PENDING',
      )

    const unpaidAmount =
      filteredBills
        .filter(
          (bill) =>
            bill.payment_status !== 'PAID',
        )
        .reduce(
          (total, bill) =>
            total + Number(bill.amount),
          0,
        )

    const paidAmount =
      paidBills.reduce(
        (total, bill) =>
          total + Number(bill.amount),
        0,
      )

    return json({
      summary: {
        totalBills,
        paidBills: paidBills.length,
        pendingBills: pendingBills.length,
        paidAmount,
        unpaidAmount,
      },
      bills: filteredBills,
    })
  } catch (error) {
    console.error(
      'GET FINANCE ERROR:',
      error,
    )

    return json(
      {
        error: 'Terjadi kesalahan pada server.',
      },
      500,
    )
  }
}

/* =========================================================
   POST
========================================================= */

export async function POST(
  request: NextRequest,
) {
  const auth = await requireFounder()

  if (!auth.authorized) {
    return auth.response
  }

  try {
    const body: unknown =
      await request.json()

    if (!isPlainObject(body)) {
      return json(
        {
          error: 'Format data tidak valid.',
        },
        400,
      )
    }

    const studentId =
      typeof body.studentId === 'string'
        ? body.studentId.trim()
        : ''

    const rawAmount = body.amount

    const monthPeriod =
      normalizeMonthPeriod(
        body.monthPeriod,
      )

    if (
      !studentId ||
      !isValidUUID(studentId)
    ) {
      return json(
        {
          error: 'Siswa tidak valid.',
        },
        400,
      )
    }

    /*
     * Jangan menerima string angka.
     * Frontend memang mengirim number.
     */
    if (
      typeof rawAmount !== 'number' ||
      !Number.isSafeInteger(rawAmount)
    ) {
      return json(
        {
          error:
            'Nominal tagihan harus berupa angka bulat.',
        },
        400,
      )
    }

    const amount = rawAmount

    if (amount < MIN_BILL_AMOUNT) {
      return json(
        {
          error: `Nominal minimal Rp${MIN_BILL_AMOUNT.toLocaleString(
            'id-ID',
          )}.`,
        },
        400,
      )
    }

    if (amount > MAX_BILL_AMOUNT) {
      return json(
        {
          error: `Nominal maksimal Rp${MAX_BILL_AMOUNT.toLocaleString(
            'id-ID',
          )} per tagihan.`,
        },
        400,
      )
    }

    if (!monthPeriod) {
      return json(
        {
          error:
            'Periode tagihan tidak valid.',
        },
        400,
      )
    }

    if (!isCurrentMonth(monthPeriod)) {
      return json(
        {
          error:
            'Tagihan hanya dapat dibuat untuk bulan berjalan.',
        },
        400,
      )
    }

    const admin =
      createAdminClient()

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

      return json(
        {
          error:
            'Gagal memverifikasi siswa.',
        },
        500,
      )
    }

    if (!student) {
      return json(
        {
          error: 'Siswa tidak ditemukan.',
        },
        404,
      )
    }

    if (student.status !== 'ACTIVE') {
      return json(
        {
          error:
            'Tagihan hanya dapat dibuat untuk siswa aktif.',
        },
        400,
      )
    }

    const monthStart =
      monthPeriod.toISOString()

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

      return json(
        {
          error:
            'Gagal memeriksa tagihan sebelumnya.',
        },
        500,
      )
    }

    if (existingBill) {
      return json(
        {
          error:
            'Tagihan untuk siswa tersebut pada bulan berjalan sudah ada.',
          bill: existingBill,
        },
        409,
      )
    }

    const orderId =
      generateOrderId()

    const {
      data: bill,
      error: insertError,
    } = await admin
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

      if (
        insertError.code === '23505'
      ) {
        return json(
          {
            error:
              'Tagihan untuk siswa tersebut pada bulan berjalan sudah ada.',
          },
          409,
        )
      }

      return json(
        {
          error:
            'Gagal membuat tagihan.',
        },
        500,
      )
    }

    return json(
      {
        message:
          'Tagihan berhasil dibuat.',
        bill,
      },
      201,
    )
  } catch (error) {
    console.error(
      'POST FINANCE ERROR:',
      error,
    )

    return json(
      {
        error:
          'Format data tidak valid.',
      },
      400,
    )
  }
}