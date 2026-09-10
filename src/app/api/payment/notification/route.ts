import crypto from 'crypto'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const MIDTRANS_SERVER_KEY =
  process.env.MIDTRANS_SERVER_KEY

function verifySignature({
  orderId,
  statusCode,
  grossAmount,
  signatureKey,
}: {
  orderId: string
  statusCode: string
  grossAmount: string
  signatureKey: string
}) {
  if (!MIDTRANS_SERVER_KEY) {
    return false
  }

  const raw =
    orderId +
    statusCode +
    grossAmount +
    MIDTRANS_SERVER_KEY

  const expectedSignature = crypto
    .createHash('sha512')
    .update(raw)
    .digest('hex')

  if (expectedSignature.length !== signatureKey.length) {
    return false
  }

  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature),
    Buffer.from(signatureKey)
  )
}

export async function POST(request: Request) {
  try {
    console.log('====================================')
    console.log('MIDTRANS NOTIFICATION RECEIVED')
    console.log('====================================')

    if (!MIDTRANS_SERVER_KEY) {
      console.error(
        'MIDTRANS_SERVER_KEY belum dikonfigurasi.'
      )

      return NextResponse.json(
        {
          error:
            'Midtrans Server Key belum dikonfigurasi.',
        },
        { status: 500 }
      )
    }

    // =====================================================
    // 1. READ BODY
    // =====================================================

    const notification = await request.json()

    console.log(
      'Midtrans notification:',
      JSON.stringify(notification, null, 2)
    )

    const {
      order_id,
      transaction_id,
      transaction_status,
      fraud_status,
      status_code,
      gross_amount,
      signature_key,
      payment_type,
      transaction_time,
      settlement_time,
    } = notification

    // =====================================================
    // 2. VALIDATE PAYLOAD
    // =====================================================

    if (
      !order_id ||
      !transaction_id ||
      !transaction_status ||
      !status_code ||
      !gross_amount ||
      !signature_key
    ) {
      console.error(
        'Notification payload tidak lengkap.'
      )

      return NextResponse.json(
        {
          error:
            'Notification payload tidak lengkap.',
        },
        { status: 400 }
      )
    }

    // =====================================================
    // 3. VERIFY SIGNATURE
    // =====================================================

    const validSignature = verifySignature({
      orderId: String(order_id),
      statusCode: String(status_code),
      grossAmount: String(gross_amount),
      signatureKey: String(signature_key),
    })

    if (!validSignature) {
      console.error(
        'INVALID MIDTRANS SIGNATURE',
        {
          order_id,
          transaction_id,
        }
      )

      return NextResponse.json(
        {
          error: 'Invalid signature.',
        },
        { status: 403 }
      )
    }

    console.log(
      'Midtrans signature: VALID'
    )

    // =====================================================
    // 4. ADMIN SUPABASE
    // =====================================================

    const supabase = createAdminClient()

    // =====================================================
    // 5. FIND BILL BY ORDER ID
    // =====================================================

    const {
      data: bill,
      error: billError,
    } = await supabase
      .from('spp_bills')
      .select(
        `
        id,
        order_id,
        amount,
        payment_status,
        paid_at
        `
      )
      .eq('order_id', String(order_id))
      .maybeSingle()

    if (billError) {
      console.error(
        'Gagal mencari bill:',
        billError
      )

      return NextResponse.json(
        {
          error:
            'Gagal mencari tagihan.',
        },
        { status: 500 }
      )
    }

    if (!bill) {
      console.error(
        'BILL TIDAK DITEMUKAN:',
        order_id
      )

      return NextResponse.json(
        {
          error:
            'Tagihan tidak ditemukan.',
        },
        { status: 404 }
      )
    }

    console.log('Bill ditemukan:', {
      billId: bill.id,
      orderId: bill.order_id,
      amount: bill.amount,
      currentStatus: bill.payment_status,
    })

    // =====================================================
    // 6. VERIFY AMOUNT
    // =====================================================

    const notificationAmount =
      Number(gross_amount)

    const billAmount =
      Number(bill.amount)

    if (
      !Number.isFinite(notificationAmount) ||
      !Number.isFinite(billAmount) ||
      notificationAmount !== billAmount
    ) {
      console.error(
        'GROSS AMOUNT MISMATCH',
        {
          order_id,
          notificationAmount,
          billAmount,
        }
      )

      return NextResponse.json(
        {
          error:
            'Nominal transaksi tidak sesuai.',
        },
        { status: 400 }
      )
    }

    console.log(
      'Gross amount: VALID'
    )

    // =====================================================
    // 7. SAVE PAYMENT TRANSACTION
    // =====================================================

    const {
      data: existingTransaction,
      error: existingTransactionError,
    } = await supabase
      .from('payment_transactions')
      .select('id')
      .eq(
        'transaction_id',
        String(transaction_id)
      )
      .maybeSingle()

    if (existingTransactionError) {
      console.error(
        'Gagal mengecek transaction:',
        existingTransactionError
      )

      return NextResponse.json(
        {
          error:
            'Gagal mengecek transaksi.',
        },
        { status: 500 }
      )
    }

    if (!existingTransaction) {
      const {
        error: transactionError,
      } = await supabase
        .from('payment_transactions')
        .insert({
          spp_bill_id: bill.id,
          transaction_id: String(
            transaction_id
          ),
          transaction_status:
            String(transaction_status),
          payment_type:
            payment_type ?? null,
          gross_amount:
            notificationAmount,
          transaction_time:
            transaction_time ?? null,
          settlement_time:
            settlement_time ?? null,
          signature_verified: true,
          raw_response: notification,
        })

      if (transactionError) {
        // Duplicate transaction karena
        // notification dikirim ulang.
        if (
          transactionError.code !== '23505'
        ) {
          console.error(
            'Gagal menyimpan payment transaction:',
            transactionError
          )

          return NextResponse.json(
            {
              error:
                'Gagal menyimpan transaksi pembayaran.',
            },
            { status: 500 }
          )
        }

        console.log(
          'Transaction sudah ada, lanjut.'
        )
      } else {
        console.log(
          'Payment transaction berhasil disimpan.'
        )
      }
    } else {
      console.log(
        'Payment transaction sudah ada.'
      )
    }

    // =====================================================
    // 8. DETERMINE BILL STATUS
    // =====================================================

    let newBillStatus:
      | 'PENDING'
      | 'PAID'
      | 'FAILED'
      | 'EXPIRED'
      | 'CANCELLED'
      | null = null

    if (
      transaction_status === 'settlement'
    ) {
      newBillStatus = 'PAID'
    }

    else if (
      transaction_status === 'capture' &&
      fraud_status === 'accept'
    ) {
      newBillStatus = 'PAID'
    }

    else if (
      transaction_status === 'pending'
    ) {
      newBillStatus = 'PENDING'
    }

    else if (
      transaction_status === 'expire'
    ) {
      newBillStatus = 'EXPIRED'
    }

    else if (
      transaction_status === 'cancel' ||
      transaction_status === 'deny'
    ) {
      newBillStatus = 'CANCELLED'
    }

    else if (
      transaction_status === 'failure'
    ) {
      newBillStatus = 'FAILED'
    }

    console.log(
      'Midtrans transaction status:',
      transaction_status
    )

    console.log(
      'New bill status:',
      newBillStatus
    )

    // =====================================================
    // 9. NEVER DOWNGRADE PAID BILL
    // =====================================================

    if (
      bill.payment_status === 'PAID'
    ) {
      console.log(
        'Bill sudah PAID. Tidak akan diturunkan.'
      )

      return NextResponse.json({
        success: true,
        message:
          'Bill sudah PAID.',
      })
    }

    // =====================================================
    // 10. UPDATE BILL
    // =====================================================

    if (newBillStatus) {
      const updateData: Record<
        string,
        unknown
      > = {
        payment_status:
          newBillStatus,
      }

      if (
        newBillStatus === 'PAID'
      ) {
        updateData.paid_at =
          settlement_time ??
          transaction_time ??
          new Date().toISOString()
      }

      console.log(
        'Updating spp_bills:',
        {
          billId: bill.id,
          updateData,
        }
      )

      const {
        error: updateError,
      } = await supabase
        .from('spp_bills')
        .update(updateData)
        .eq('id', bill.id)

      if (updateError) {
        console.error(
          'GAGAL UPDATE BILL:',
          updateError
        )

        return NextResponse.json(
          {
            error:
              'Gagal memperbarui status tagihan.',
          },
          { status: 500 }
        )
      }

      console.log(
        '===================================='
      )

      console.log(
        'BILL STATUS BERHASIL DIUPDATE'
      )

      console.log(
        `Order: ${order_id}`
      )

      console.log(
        `Status: ${newBillStatus}`
      )

      console.log(
        '===================================='
      )
    }

    // =====================================================
    // 11. SUCCESS
    // =====================================================

    return NextResponse.json({
      success: true,
      message:
        'Notification processed successfully.',
      order_id,
      transaction_id,
      transaction_status,
      bill_status: newBillStatus,
    })
  } catch (error) {
    console.error(
      '===================================='
    )

    console.error(
      'MIDTRANS WEBHOOK ERROR:',
      error
    )

    console.error(
      '===================================='
    )

    return NextResponse.json(
      {
        error:
          'Terjadi kesalahan pada webhook.',
      },
      { status: 500 }
    )
  }
}