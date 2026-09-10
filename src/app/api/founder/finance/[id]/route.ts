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

// GET
export async function GET(
  request: NextRequest,
  context: {
    params: Promise<{
      id: string
    }>
  },
) {
  const auth = await requireFounder()

  if (!auth.authorized) {
    return auth.response
  }

  const { id } = await context.params

  const admin = createAdminClient()

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
      snap_token,
      paid_at,
      created_at
    `)
    .eq('id', id)
    .maybeSingle()

  if (billError) {
    console.error('GET FINANCE DETAIL ERROR:', billError)

    return NextResponse.json(
      {
        error: 'Gagal mengambil detail tagihan.',
      },
      { status: 500 },
    )
  }

  if (!bill) {
    return NextResponse.json(
      {
        error: 'Tagihan tidak ditemukan.',
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
      school_name,
      phone_number,
      status,
      parent_id
    `)
    .eq('id', bill.student_id)
    .maybeSingle()

  if (studentError) {
    console.error(
      'GET FINANCE DETAIL STUDENT ERROR:',
      studentError,
    )

    return NextResponse.json(
      {
        error: 'Gagal mengambil data siswa.',
      },
      { status: 500 },
    )
  }

  let parent = null

  if (student?.parent_id) {
    const {
      data: parentData,
      error: parentError,
    } = await admin
      .from('profiles')
      .select(`
        id,
        full_name,
        phone_number
      `)
      .eq('id', student.parent_id)
      .maybeSingle()

    if (parentError) {
      console.error(
        'GET FINANCE DETAIL PARENT ERROR:',
        parentError,
      )

      return NextResponse.json(
        {
          error: 'Gagal mengambil data orang tua.',
        },
        { status: 500 },
      )
    }

    parent = parentData
  }

  const {
    data: transactions,
    error: transactionError,
  } = await admin
    .from('payment_transactions')
    .select(`
      id,
      transaction_id,
      transaction_status,
      payment_type,
      gross_amount,
      transaction_time,
      settlement_time,
      signature_verified,
      created_at
    `)
    .eq('spp_bill_id', id)
    .order('created_at', { ascending: false })

  if (transactionError) {
    console.error(
      'GET FINANCE TRANSACTIONS ERROR:',
      transactionError,
    )

    return NextResponse.json(
      {
        error: 'Gagal mengambil riwayat transaksi.',
      },
      { status: 500 },
    )
  }

  return NextResponse.json({
    bill,
    student,
    parent,
    transactions: transactions ?? [],
  })
}

// PATCH
export async function PATCH(
  request: NextRequest,
  context: {
    params: Promise<{
      id: string
    }>
  },
) {
  const auth = await requireFounder()

  if (!auth.authorized) {
    return auth.response
  }

  const { id } = await context.params

  try {
    const body = await request.json()

    const admin = createAdminClient()

    const {
      data: currentBill,
      error: currentBillError,
    } = await admin
      .from('spp_bills')
      .select(`
        id,
        student_id,
        month_period,
        amount,
        payment_status
      `)
      .eq('id', id)
      .maybeSingle()

    if (currentBillError) {
      console.error(
        'GET CURRENT BILL ERROR:',
        currentBillError,
      )

      return NextResponse.json(
        {
          error: 'Gagal memeriksa tagihan.',
        },
        { status: 500 },
      )
    }

    if (!currentBill) {
      return NextResponse.json(
        {
          error: 'Tagihan tidak ditemukan.',
        },
        { status: 404 },
      )
    }

    // PAID tidak boleh diedit oleh Founder.
    if (currentBill.payment_status === 'PAID') {
      return NextResponse.json(
        {
          error:
            'Tagihan yang sudah PAID tidak dapat diubah.',
        },
        { status: 400 },
      )
    }

    const updateData: {
      amount?: number
      month_period?: string
    } = {}

    if (body.amount !== undefined) {
      const amount = Number(body.amount)

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
            error:
              'Nominal tagihan harus berupa angka bulat.',
          },
          { status: 400 },
        )
      }

      if (amount < MIN_BILL_AMOUNT) {
        return NextResponse.json(
          {
            error:
              `Nominal minimal Rp${MIN_BILL_AMOUNT.toLocaleString('id-ID')}.`,
          },
          { status: 400 },
        )
      }

      if (amount > MAX_BILL_AMOUNT) {
        return NextResponse.json(
          {
            error:
              `Nominal maksimal Rp${MAX_BILL_AMOUNT.toLocaleString('id-ID')} per tagihan.`,
          },
          { status: 400 },
        )
      }

      updateData.amount = amount
    }

    if (body.monthPeriod !== undefined) {
      const monthPeriod =
        normalizeMonthPeriod(body.monthPeriod)

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
              'Periode tagihan hanya boleh untuk bulan berjalan.',
          },
          { status: 400 },
        )
      }

      const monthStart = monthPeriod.toISOString()

      const {
        data: duplicateBill,
        error: duplicateError,
      } = await admin
        .from('spp_bills')
        .select('id')
        .eq('student_id', currentBill.student_id)
        .eq('month_period', monthStart)
        .neq('id', id)
        .maybeSingle()

      if (duplicateError) {
        console.error(
          'CHECK DUPLICATE BILL ERROR:',
          duplicateError,
        )

        return NextResponse.json(
          {
            error:
              'Gagal memeriksa tagihan duplikat.',
          },
          { status: 500 },
        )
      }

      if (duplicateBill) {
        return NextResponse.json(
          {
            error:
              'Siswa tersebut sudah memiliki tagihan pada bulan tersebut.',
          },
          { status: 409 },
        )
      }

      updateData.month_period = monthStart
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        {
          error: 'Tidak ada data yang dapat diperbarui.',
        },
        { status: 400 },
      )
    }

    const {
      data: updatedBill,
      error: updateError,
    } = await admin
      .from('spp_bills')
      .update(updateData)
      .eq('id', id)
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
      .single()

    if (updateError) {
      console.error(
        'UPDATE FINANCE ERROR:',
        updateError,
      )

      return NextResponse.json(
        {
          error: 'Gagal memperbarui tagihan.',
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      message: 'Tagihan berhasil diperbarui.',
      bill: updatedBill,
    })
  } catch (error) {
    console.error('PATCH FINANCE ERROR:', error)

    return NextResponse.json(
      {
        error: 'Format data tidak valid.',
      },
      { status: 400 },
    )
  }
}

// DELETE
export async function DELETE(
  request: NextRequest,
  context: {
    params: Promise<{
      id: string
    }>
  },
) {
  const auth = await requireFounder()

  if (!auth.authorized) {
    return auth.response
  }

  const { id } = await context.params

  const admin = createAdminClient()

  const {
    data: bill,
    error: billError,
  } = await admin
    .from('spp_bills')
    .select(`
      id,
      payment_status
    `)
    .eq('id', id)
    .maybeSingle()

  if (billError) {
    console.error(
      'DELETE BILL CHECK ERROR:',
      billError,
    )

    return NextResponse.json(
      {
        error: 'Gagal memeriksa tagihan.',
      },
      { status: 500 },
    )
  }

  if (!bill) {
    return NextResponse.json(
      {
        error: 'Tagihan tidak ditemukan.',
      },
      { status: 404 },
    )
  }

  if (bill.payment_status === 'PAID') {
    return NextResponse.json(
      {
        error:
          'Tagihan yang sudah PAID tidak boleh dihapus.',
      },
      { status: 400 },
    )
  }

  const {
    data: transactions,
    error: transactionError,
  } = await admin
    .from('payment_transactions')
    .select('id')
    .eq('spp_bill_id', id)
    .limit(1)

  if (transactionError) {
    console.error(
      'DELETE BILL TRANSACTION CHECK ERROR:',
      transactionError,
    )

    return NextResponse.json(
      {
        error: 'Gagal memeriksa transaksi.',
      },
      { status: 500 },
    )
  }

  if ((transactions ?? []).length > 0) {
    return NextResponse.json(
      {
        error:
          'Tagihan tidak dapat dihapus karena sudah memiliki riwayat transaksi.',
      },
      { status: 400 },
    )
  }

  const { error: deleteError } = await admin
    .from('spp_bills')
    .delete()
    .eq('id', id)

  if (deleteError) {
    console.error(
      'DELETE FINANCE ERROR:',
      deleteError,
    )

    return NextResponse.json(
      {
        error: 'Gagal menghapus tagihan.',
      },
      { status: 500 },
    )
  }

  return NextResponse.json({
    message: 'Tagihan berhasil dihapus.',
  })
}