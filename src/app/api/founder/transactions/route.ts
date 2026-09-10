import { NextRequest, NextResponse } from 'next/server'

import { requireFounder } from '@/lib/auth/requireFounder'
import { createAdminClient } from '@/lib/supabase/admin'

type PaymentTransaction = {
  id: string
  spp_bill_id: string
  transaction_id: string | null
  transaction_status: string | null
  payment_type: string | null
  gross_amount: number | string | null
  transaction_time: string | null
  settlement_time: string | null
  signature_verified: boolean | null
  created_at: string
}

type SppBill = {
  id: string
  student_id: string
  order_id: string
  month_period: string
  amount: number | string
  payment_status: string
  paid_at: string | null
}

type Student = {
  id: string
  student_name: string
  grade_level: string | null
  school_name: string | null
}

function normalizePaymentType(
  paymentType: string | null,
) {
  if (!paymentType) return '-'

  const map: Record<string, string> = {
    bank_transfer: 'Bank Transfer',
    bca_va: 'BCA Virtual Account',
    bni_va: 'BNI Virtual Account',
    bri_va: 'BRI Virtual Account',
    permata_va: 'Permata Virtual Account',
    credit_card: 'Kartu Kredit',
    gopay: 'GoPay',
    shopeepay: 'ShopeePay',
    qris: 'QRIS',
    cstore: 'Convenience Store',
    echannel: 'E-Channel',
  }

  return map[paymentType] ?? paymentType
}

function getCurrentMonth() {
  const now = new Date()

  return `${now.getUTCFullYear()}-${String(
    now.getUTCMonth() + 1,
  ).padStart(2, '0')}-01`
}

function getNextMonth() {
  const now = new Date()

  return new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth() + 1,
      1,
    ),
  )
}

export async function GET(
  request: NextRequest,
) {
  const auth = await requireFounder()

  if (!auth.authorized) {
    return auth.response
  }

  try {
    const admin = createAdminClient()

    const { searchParams } =
      new URL(request.url)

    const id =
      searchParams.get('id')?.trim() ?? ''

    const search =
      searchParams.get('search')?.trim() ?? ''

    const status =
      searchParams.get('status')?.trim() ?? ''

    const paymentType =
      searchParams
        .get('payment_type')
        ?.trim() ?? ''

    const month =
      searchParams.get('month')?.trim() ?? ''

    const pageParam =
      Number(
        searchParams.get('page') ?? '1',
      )

    const limitParam =
      Number(
        searchParams.get('limit') ?? '20',
      )

    const page =
      Number.isInteger(pageParam) &&
      pageParam > 0
        ? pageParam
        : 1

    const limit =
      Number.isInteger(limitParam) &&
      limitParam > 0 &&
      limitParam <= 100
        ? limitParam
        : 20

    /*
     * ============================================================
     * DETAIL TRANSACTION
     * GET /api/founder/transactions?id=...
     * ============================================================
     */

    if (id) {
      const {
        data: transaction,
        error: transactionError,
      } = await admin
        .from('payment_transactions')
        .select(`
          id,
          spp_bill_id,
          transaction_id,
          transaction_status,
          payment_type,
          gross_amount,
          transaction_time,
          settlement_time,
          signature_verified,
          created_at
        `)
        .eq('id', id)
        .maybeSingle()

      if (transactionError) {
        console.error(
          'GET TRANSACTION DETAIL ERROR:',
          transactionError,
        )

        return NextResponse.json(
          {
            error:
              'Gagal mengambil detail transaksi.',
          },
          { status: 500 },
        )
      }

      if (!transaction) {
        return NextResponse.json(
          {
            error:
              'Transaksi tidak ditemukan.',
          },
          { status: 404 },
        )
      }

      const {
        data: bill,
        error: billError,
      } = await admin
        .from('spp_bills')
        .select(`
          id,
          student_id,
          order_id,
          month_period,
          amount,
          payment_status,
          paid_at
        `)
        .eq(
          'id',
          transaction.spp_bill_id,
        )
        .maybeSingle()

      if (billError) {
        console.error(
          'GET TRANSACTION BILL ERROR:',
          billError,
        )

        return NextResponse.json(
          {
            error:
              'Gagal mengambil data tagihan.',
          },
          { status: 500 },
        )
      }

      if (!bill) {
        return NextResponse.json(
          {
            error:
              'Tagihan transaksi tidak ditemukan.',
          },
          { status: 404 },
        )
      }

      const {
        data: student,
        error: studentError,
      } = await admin
        .from('students')
        .select(`
          id,
          student_name,
          grade_level,
          school_name
        `)
        .eq('id', bill.student_id)
        .maybeSingle()

      if (studentError) {
        console.error(
          'GET TRANSACTION STUDENT ERROR:',
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

      return NextResponse.json({
        transaction: {
          ...transaction,
          payment_type_label:
            normalizePaymentType(
              transaction.payment_type,
            ),
        },
        bill,
        student: student ?? null,
      })
    }

    /*
     * ============================================================
     * LIST TRANSACTIONS
     * ============================================================
     */

    let transactionQuery =
      admin
        .from('payment_transactions')
        .select(`
          id,
          spp_bill_id,
          transaction_id,
          transaction_status,
          payment_type,
          gross_amount,
          transaction_time,
          settlement_time,
          signature_verified,
          created_at
        `)

    if (status) {
      transactionQuery =
        transactionQuery.eq(
          'transaction_status',
          status,
        )
    }

    if (paymentType) {
      transactionQuery =
        transactionQuery.eq(
          'payment_type',
          paymentType,
        )
    }

    const {
      data: transactions,
      error: transactionError,
    } = await transactionQuery
      .order('created_at', {
        ascending: false,
      })
      .limit(500)

    if (transactionError) {
      console.error(
        'GET TRANSACTIONS ERROR:',
        transactionError,
      )

      return NextResponse.json(
        {
          error:
            'Gagal mengambil data transaksi.',
        },
        { status: 500 },
      )
    }

    const transactionList =
      (transactions ??
        []) as PaymentTransaction[]

    if (transactionList.length === 0) {
      return NextResponse.json({
        transactions: [],
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 0,
        },
        summary: {
          totalTransactions: 0,
          successfulTransactions: 0,
          totalAmount: 0,
        },
      })
    }

    const billIds = [
      ...new Set(
        transactionList.map(
          (transaction) =>
            transaction.spp_bill_id,
        ),
      ),
    ]

    /*
     * Ambil semua bill terkait secara terpisah.
     * Tidak menggunakan nested relation.
     */
    const {
      data: bills,
      error: billsError,
    } = await admin
      .from('spp_bills')
      .select(`
        id,
        student_id,
        order_id,
        month_period,
        amount,
        payment_status,
        paid_at
      `)
      .in('id', billIds)

    if (billsError) {
      console.error(
        'GET TRANSACTION BILLS ERROR:',
        billsError,
      )

      return NextResponse.json(
        {
          error:
            'Gagal mengambil data tagihan transaksi.',
        },
        { status: 500 },
      )
    }

    const billList =
      (bills ?? []) as SppBill[]

    const billMap = new Map(
      billList.map((bill) => [
        bill.id,
        bill,
      ]),
    )

    const studentIds = [
      ...new Set(
        billList.map(
          (bill) => bill.student_id,
        ),
      ),
    ]

    let studentList: Student[] = []

    if (studentIds.length > 0) {
      const {
        data: students,
        error: studentsError,
      } = await admin
        .from('students')
        .select(`
          id,
          student_name,
          grade_level,
          school_name
        `)
        .in('id', studentIds)

      if (studentsError) {
        console.error(
          'GET TRANSACTION STUDENTS ERROR:',
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

      studentList =
        (students ?? []) as Student[]
    }

    const studentMap = new Map(
      studentList.map((student) => [
        student.id,
        student,
      ]),
    )

    /*
     * Gabungkan transaction → bill → student
     */
    let merged = transactionList
      .map((transaction) => {
        const bill =
          billMap.get(
            transaction.spp_bill_id,
          )

        const student = bill
          ? studentMap.get(
              bill.student_id,
            )
          : undefined

        return {
          id: transaction.id,
          transaction_id:
            transaction.transaction_id,
          transaction_status:
            transaction.transaction_status,
          payment_type:
            transaction.payment_type,
          payment_type_label:
            normalizePaymentType(
              transaction.payment_type,
            ),
          gross_amount: Number(
            transaction.gross_amount ??
              bill?.amount ??
              0,
          ),
          transaction_time:
            transaction.transaction_time,
          settlement_time:
            transaction.settlement_time,
          signature_verified:
            transaction.signature_verified,
          created_at:
            transaction.created_at,

          bill: bill
            ? {
                id: bill.id,
                order_id:
                  bill.order_id,
                student_id:
                  bill.student_id,
                month_period:
                  bill.month_period,
                amount: Number(
                  bill.amount,
                ),
                payment_status:
                  bill.payment_status,
                paid_at:
                  bill.paid_at,
              }
            : null,

          student: student ?? null,
        }
      })
      .filter(
        (transaction) =>
          transaction.bill !== null,
      )

    /*
     * Search:
     * - nama siswa
     * - order ID
     * - transaction ID
     * - sekolah
     */
    if (search) {
      const keyword =
        search.toLowerCase()

      merged = merged.filter(
        (transaction) => {
          const studentName =
            transaction.student
              ?.student_name ??
            ''

          const schoolName =
            transaction.student
              ?.school_name ??
            ''

          const orderId =
            transaction.bill
              ?.order_id ?? ''

          const transactionId =
            transaction.transaction_id ??
            ''

          return [
            studentName,
            schoolName,
            orderId,
            transactionId,
          ].some((value) =>
            value
              .toLowerCase()
              .includes(keyword),
          )
        },
      )
    }

    /*
     * Filter bulan.
     * Format frontend: YYYY-MM
     */
    if (
      month &&
      /^\d{4}-\d{2}$/.test(month)
    ) {
      merged = merged.filter(
        (transaction) => {
          const period =
            transaction.bill
              ?.month_period

          if (!period) return false

          return period.startsWith(
            month,
          )
        },
      )
    }

    /*
     * Summary
     */
    const totalTransactions =
      merged.length

    const successfulTransactions =
      merged.filter(
        (transaction) =>
          transaction.transaction_status ===
            'settlement' ||
          transaction.transaction_status ===
            'capture',
      ).length

    const totalAmount =
      merged
        .filter(
          (transaction) =>
            transaction.transaction_status ===
              'settlement' ||
            transaction.transaction_status ===
              'capture',
        )
        .reduce(
          (sum, transaction) =>
            sum +
            transaction.gross_amount,
          0,
        )

    /*
     * Pagination dilakukan setelah
     * filter/search.
     */
    const total = merged.length

    const totalPages =
      total === 0
        ? 0
        : Math.ceil(total / limit)

    const safePage =
      totalPages > 0
        ? Math.min(
            page,
            totalPages,
          )
        : 1

    const start =
      (safePage - 1) * limit

    const paginated =
      merged.slice(
        start,
        start + limit,
      )

    return NextResponse.json({
      transactions: paginated,
      pagination: {
        page: safePage,
        limit,
        total,
        totalPages,
      },
      summary: {
        totalTransactions,
        successfulTransactions,
        totalAmount,
      },
    })
  } catch (error) {
    console.error(
      'GET FOUNDER TRANSACTIONS ERROR:',
      error,
    )

    return NextResponse.json(
      {
        error:
          'Terjadi kesalahan saat mengambil transaksi.',
      },
      { status: 500 },
    )
  }
}