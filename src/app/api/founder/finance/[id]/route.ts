import { NextRequest, NextResponse } from 'next/server'

import { requireFounder } from '@/lib/auth/requireFounder'
import { createAdminClient } from '@/lib/supabase/admin'

const MIN_BILL_AMOUNT = 1_000
const MAX_BILL_AMOUNT = 1_000_000

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const MONTH_REGEX = /^(\d{4})-(0[1-9]|1[0-2])$/

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

  const jakartaParts = new Intl.DateTimeFormat(
    'en-US',
    {
      timeZone: 'Asia/Jakarta',
      year: 'numeric',
      month: '2-digit',
    },
  ).formatToParts(now)

  const year = Number(
    jakartaParts.find(
      (part) => part.type === 'year',
    )?.value,
  )

  const month = Number(
    jakartaParts.find(
      (part) => part.type === 'month',
    )?.value,
  )

  return new Date(
    Date.UTC(
      year,
      month - 1,
      1,
    ),
  )
}

function normalizeMonthPeriod(
  value: unknown,
) {
  if (typeof value !== 'string') {
    return null
  }

  const match =
    MONTH_REGEX.exec(value)

  if (!match) {
    return null
  }

  const year = Number(match[1])
  const month = Number(match[2])

  return new Date(
    Date.UTC(
      year,
      month - 1,
      1,
    ),
  )
}

function isCurrentMonth(
  date: Date,
) {
  const current =
    getCurrentMonthStart()

  return (
    date.getUTCFullYear() ===
      current.getUTCFullYear() &&
    date.getUTCMonth() ===
      current.getUTCMonth()
  )
}

async function getId(
  context: {
    params: Promise<{
      id: string
    }>
  },
) {
  const { id } =
    await context.params

  return id.trim()
}

/* =========================================================
   GET DETAIL
========================================================= */

export async function GET(
  request: NextRequest,
  context: {
    params: Promise<{
      id: string
    }>
  },
) {
  const auth =
    await requireFounder()

  if (!auth.authorized) {
    return auth.response
  }

  const id =
    await getId(context)

  if (!isValidUUID(id)) {
    return json(
      {
        error:
          'ID tagihan tidak valid.',
      },
      400,
    )
  }

  try {
    const admin =
      createAdminClient()

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
        paid_at,
        created_at
      `)
      .eq('id', id)
      .maybeSingle()

    if (billError) {
      console.error(
        'GET FINANCE DETAIL ERROR:',
        billError,
      )

      return json(
        {
          error:
            'Gagal mengambil detail tagihan.',
        },
        500,
      )
    }

    if (!bill) {
      return json(
        {
          error:
            'Tagihan tidak ditemukan.',
        },
        404,
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

      return json(
        {
          error:
            'Gagal mengambil data siswa.',
        },
        500,
      )
    }

    let parent: {
      id: string
      full_name: string | null
      phone_number: string | null
    } | null = null

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

        return json(
          {
            error:
              'Gagal mengambil data orang tua.',
          },
          500,
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
      .order('created_at', {
        ascending: false,
      })

    if (transactionError) {
      console.error(
        'GET FINANCE TRANSACTIONS ERROR:',
        transactionError,
      )

      return json(
        {
          error:
            'Gagal mengambil riwayat transaksi.',
        },
        500,
      )
    }

    return json({
      bill,
      student,
      parent,
      transactions:
        transactions ?? [],
    })
  } catch (error) {
    console.error(
      'GET FINANCE DETAIL UNEXPECTED ERROR:',
      error,
    )

    return json(
      {
        error:
          'Terjadi kesalahan pada server.',
      },
      500,
    )
  }
}

/* =========================================================
   PATCH
========================================================= */

export async function PATCH(
  request: NextRequest,
  context: {
    params: Promise<{
      id: string
    }>
  },
) {
  const auth =
    await requireFounder()

  if (!auth.authorized) {
    return auth.response
  }

  const id =
    await getId(context)

  if (!isValidUUID(id)) {
    return json(
      {
        error:
          'ID tagihan tidak valid.',
      },
      400,
    )
  }

  try {
    const body: unknown =
      await request.json()

    if (!isPlainObject(body)) {
      return json(
        {
          error:
            'Format data tidak valid.',
        },
        400,
      )
    }

    const allowedKeys = [
      'amount',
      'monthPeriod',
    ]

    const bodyKeys =
      Object.keys(body)

    const hasUnknownField =
      bodyKeys.some(
        (key) =>
          !allowedKeys.includes(key),
      )

    if (hasUnknownField) {
      return json(
        {
          error:
            'Terdapat field yang tidak diizinkan.',
        },
        400,
      )
    }

    const admin =
      createAdminClient()

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

      return json(
        {
          error:
            'Gagal memeriksa tagihan.',
        },
        500,
      )
    }

    if (!currentBill) {
      return json(
        {
          error:
            'Tagihan tidak ditemukan.',
        },
        404,
      )
    }

    if (
      currentBill.payment_status ===
      'PAID'
    ) {
      return json(
        {
          error:
            'Tagihan yang sudah PAID tidak dapat diubah.',
        },
        400,
      )
    }

    const updateData: {
      amount?: number
      month_period?: string
    } = {}

    if (
      Object.prototype.hasOwnProperty.call(
        body,
        'amount',
      )
    ) {
      const rawAmount =
        body.amount

      if (
        typeof rawAmount !==
          'number' ||
        !Number.isSafeInteger(
          rawAmount,
        )
      ) {
        return json(
          {
            error:
              'Nominal tagihan harus berupa angka bulat.',
          },
          400,
        )
      }

      if (
        rawAmount <
        MIN_BILL_AMOUNT
      ) {
        return json(
          {
            error: `Nominal minimal Rp${MIN_BILL_AMOUNT.toLocaleString(
              'id-ID',
            )}.`,
          },
          400,
        )
      }

      if (
        rawAmount >
        MAX_BILL_AMOUNT
      ) {
        return json(
          {
            error: `Nominal maksimal Rp${MAX_BILL_AMOUNT.toLocaleString(
              'id-ID',
            )} per tagihan.`,
          },
          400,
        )
      }

      updateData.amount =
        rawAmount
    }

    if (
      Object.prototype.hasOwnProperty.call(
        body,
        'monthPeriod',
      )
    ) {
      const monthPeriod =
        normalizeMonthPeriod(
          body.monthPeriod,
        )

      if (!monthPeriod) {
        return json(
          {
            error:
              'Periode tagihan tidak valid.',
          },
          400,
        )
      }

      if (
        !isCurrentMonth(
          monthPeriod,
        )
      ) {
        return json(
          {
            error:
              'Periode tagihan hanya boleh untuk bulan berjalan.',
          },
          400,
        )
      }

      const monthStart =
        monthPeriod.toISOString()

      const {
        data: duplicateBill,
        error: duplicateError,
      } = await admin
        .from('spp_bills')
        .select('id')
        .eq(
          'student_id',
          currentBill.student_id,
        )
        .eq(
          'month_period',
          monthStart,
        )
        .neq('id', id)
        .maybeSingle()

      if (duplicateError) {
        console.error(
          'CHECK DUPLICATE BILL ERROR:',
          duplicateError,
        )

        return json(
          {
            error:
              'Gagal memeriksa tagihan duplikat.',
          },
          500,
        )
      }

      if (duplicateBill) {
        return json(
          {
            error:
              'Siswa tersebut sudah memiliki tagihan pada bulan tersebut.',
          },
          409,
        )
      }

      updateData.month_period =
        monthStart
    }

    if (
      Object.keys(updateData)
        .length === 0
    ) {
      return json(
        {
          error:
            'Tidak ada data yang dapat diperbarui.',
        },
        400,
      )
    }

    /*
     * payment_status sengaja TIDAK
     * dimasukkan ke updateData.
     *
     * Founder hanya boleh mengubah
     * nominal/periode.
     */
    const {
      data: updatedBill,
      error: updateError,
    } = await admin
      .from('spp_bills')
      .update(updateData)
      .eq('id', id)
      .neq('payment_status', 'PAID')
      .select(`
        id,
        student_id,
        order_id,
        month_period,
        amount,
        payment_status,
        paid_at,
        created_at
      `)
      .maybeSingle()

    if (updateError) {
      console.error(
        'UPDATE FINANCE ERROR:',
        updateError,
      )

      if (
        updateError.code ===
        '23505'
      ) {
        return json(
          {
            error:
              'Siswa tersebut sudah memiliki tagihan pada bulan tersebut.',
          },
          409,
        )
      }

      return json(
        {
          error:
            'Gagal memperbarui tagihan.',
        },
        500,
      )
    }

    /*
     * Jika PAID berubah tepat saat request,
     * conditional update di atas membuat
     * affected row = 0.
     */
    if (!updatedBill) {
      return json(
        {
          error:
            'Tagihan sudah tidak dapat diubah.',
        },
        409,
      )
    }

    return json({
      message:
        'Tagihan berhasil diperbarui.',
      bill: updatedBill,
    })
  } catch (error) {
    console.error(
      'PATCH FINANCE ERROR:',
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

/* =========================================================
   DELETE
========================================================= */

export async function DELETE(
  request: NextRequest,
  context: {
    params: Promise<{
      id: string
    }>
  },
) {
  const auth =
    await requireFounder()

  if (!auth.authorized) {
    return auth.response
  }

  const id =
    await getId(context)

  if (!isValidUUID(id)) {
    return json(
      {
        error:
          'ID tagihan tidak valid.',
      },
      400,
    )
  }

  try {
    const admin =
      createAdminClient()

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

      return json(
        {
          error:
            'Gagal memeriksa tagihan.',
        },
        500,
      )
    }

    if (!bill) {
      return json(
        {
          error:
            'Tagihan tidak ditemukan.',
        },
        404,
      )
    }

    if (
      bill.payment_status ===
      'PAID'
    ) {
      return json(
        {
          error:
            'Tagihan yang sudah PAID tidak boleh dihapus.',
        },
        400,
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

      return json(
        {
          error:
            'Gagal memeriksa transaksi.',
        },
        500,
      )
    }

    if (
      (transactions ?? []).length >
      0
    ) {
      return json(
        {
          error:
            'Tagihan tidak dapat dihapus karena sudah memiliki riwayat transaksi.',
        },
        400,
      )
    }

    /*
     * Kondisi payment_status PAID
     * ditambahkan lagi pada DELETE.
     *
     * Jadi kalau status berubah menjadi
     * PAID tepat sebelum delete, request
     * tidak boleh menghapusnya.
     */
    const {
      data: deletedBill,
      error: deleteError,
    } = await admin
      .from('spp_bills')
      .delete()
      .eq('id', id)
      .neq('payment_status', 'PAID')
      .select('id')
      .maybeSingle()

    if (deleteError) {
      console.error(
        'DELETE FINANCE ERROR:',
        deleteError,
      )

      /*
       * 23503 biasanya FK violation.
       * Artinya ada data transaksi/relation
       * yang masih mereferensikan bill.
       */
      if (
        deleteError.code ===
        '23503'
      ) {
        return json(
          {
            error:
              'Tagihan tidak dapat dihapus karena masih memiliki data terkait.',
          },
          409,
        )
      }

      return json(
        {
          error:
            'Gagal menghapus tagihan.',
        },
        500,
      )
    }

    if (!deletedBill) {
      return json(
        {
          error:
            'Tagihan sudah tidak dapat dihapus.',
        },
        409,
      )
    }

    return json({
      message:
        'Tagihan berhasil dihapus.',
    })
  } catch (error) {
    console.error(
      'DELETE FINANCE ERROR:',
      error,
    )

    return json(
      {
        error:
          'Terjadi kesalahan pada server.',
      },
      500,
    )
  }
}