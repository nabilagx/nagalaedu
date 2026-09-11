import crypto from "crypto"
import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

type MidtransNotification = {
  order_id?: string
  transaction_id?: string
  transaction_status?: string
  fraud_status?: string
  status_code?: string
  gross_amount?: string | number
  signature_key?: string
  payment_type?: string
  transaction_time?: string
  settlement_time?: string | null
  [key: string]: unknown
}

function verifyMidtransSignature(
  orderId: string,
  statusCode: string,
  grossAmount: string,
  serverKey: string,
  receivedSignature: string,
) {
  const signatureString =
    orderId +
    statusCode +
    grossAmount +
    serverKey

  const expectedSignature = crypto
    .createHash("sha512")
    .update(signatureString)
    .digest("hex")

  if (!receivedSignature) {
    return false
  }

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, "utf8"),
      Buffer.from(receivedSignature, "utf8"),
    )
  } catch {
    return false
  }
}

function mapBillStatus(
  transactionStatus: string,
  fraudStatus: string,
) {
  const status = transactionStatus.toLowerCase()
  const fraud = fraudStatus.toLowerCase()

  if (status === "settlement") {
    return "PAID"
  }

  if (
    status === "capture" &&
    fraud === "accept"
  ) {
    return "PAID"
  }

  if (status === "pending") {
    return "PENDING"
  }

  if (status === "expire") {
    return "EXPIRED"
  }

  if (
    status === "cancel" ||
    status === "deny"
  ) {
    return "CANCELLED"
  }

  if (status === "failure") {
    return "FAILED"
  }

  return null
}

export async function POST(request: Request) {
  console.log("========================================")
  console.log("MIDTRANS NOTIFICATION RECEIVED")
  console.log("========================================")

  try {
    const serverKey = process.env.MIDTRANS_SERVER_KEY

    if (!serverKey) {
      console.error(
        "MIDTRANS_SERVER_KEY belum dikonfigurasi.",
      )

      return NextResponse.json(
        {
          error:
            "Konfigurasi Midtrans belum tersedia.",
        },
        { status: 500 },
      )
    }

    let notification: MidtransNotification

    try {
      notification =
        (await request.json()) as MidtransNotification
    } catch (error) {
      console.error(
        "MIDTRANS JSON PARSE ERROR:",
        error,
      )

      return NextResponse.json(
        {
          error:
            "Payload notification tidak valid.",
        },
        { status: 400 },
      )
    }

    console.log(
      "Midtrans notification payload:",
      JSON.stringify(notification, null, 2),
    )

    const orderId =
      typeof notification.order_id === "string"
        ? notification.order_id.trim()
        : ""

    const transactionId =
      typeof notification.transaction_id === "string"
        ? notification.transaction_id.trim()
        : ""

    const transactionStatus =
      typeof notification.transaction_status === "string"
        ? notification.transaction_status.trim()
        : ""

    const fraudStatus =
      typeof notification.fraud_status === "string"
        ? notification.fraud_status.trim()
        : ""

    const statusCode =
      typeof notification.status_code === "string"
        ? notification.status_code.trim()
        : ""

    const signatureKey =
      typeof notification.signature_key === "string"
        ? notification.signature_key.trim()
        : ""

    const paymentType =
      typeof notification.payment_type === "string"
        ? notification.payment_type.trim()
        : null

    const transactionTime =
      typeof notification.transaction_time === "string"
        ? notification.transaction_time
        : null

    const settlementTime =
      typeof notification.settlement_time === "string"
        ? notification.settlement_time
        : null

    const grossAmountRaw =
      notification.gross_amount

    if (
      !orderId ||
      !transactionStatus ||
      !statusCode ||
      grossAmountRaw === undefined ||
      grossAmountRaw === null ||
      !signatureKey
    ) {
      console.error(
        "MIDTRANS NOTIFICATION PAYLOAD TIDAK LENGKAP:",
        {
          orderId,
          transactionId,
          transactionStatus,
          fraudStatus,
          statusCode,
          grossAmountRaw,
          hasSignature: Boolean(signatureKey),
        },
      )

      return NextResponse.json(
        {
          error:
            "Payload notification tidak lengkap.",
        },
        { status: 400 },
      )
    }

    /*
     * Midtrans menggunakan gross_amount dalam bentuk string
     * untuk proses signature.
     */
    const grossAmount = String(
      grossAmountRaw,
    )

    const signatureValid =
      verifyMidtransSignature(
        orderId,
        statusCode,
        grossAmount,
        serverKey,
        signatureKey,
      )

    console.log(
      "Midtrans signature:",
      signatureValid ? "VALID" : "INVALID",
    )

    if (!signatureValid) {
      console.error(
        "MIDTRANS SIGNATURE INVALID:",
        {
          orderId,
          statusCode,
          grossAmount,
        },
      )

      return NextResponse.json(
        {
          error:
            "Signature notification tidak valid.",
        },
        { status: 401 },
      )
    }

    const admin = createAdminClient()

    /*
     * Cari tagihan berdasarkan order_id.
     *
     * order_id adalah penghubung utama antara
     * transaksi Midtrans dan spp_bills.
     */
    const {
      data: bill,
      error: billError,
    } = await admin
      .from("spp_bills")
      .select(`
        id,
        order_id,
        amount,
        payment_status,
        paid_at
      `)
      .eq("order_id", orderId)
      .maybeSingle()

    if (billError) {
      console.error(
        "MIDTRANS BILL LOOKUP ERROR:",
        billError,
      )

      return NextResponse.json(
        {
          error:
            "Gagal mencari tagihan.",
        },
        { status: 500 },
      )
    }

    if (!bill) {
      console.error(
        "MIDTRANS BILL TIDAK DITEMUKAN:",
        orderId,
      )

      /*
       * 404 akan membuat Midtrans menganggap notification
       * belum berhasil diterima sehingga dapat dikirim ulang.
       */
      return NextResponse.json(
        {
          error:
            "Tagihan dengan order_id tersebut tidak ditemukan.",
        },
        { status: 404 },
      )
    }

    console.log("Bill ditemukan:", {
      id: bill.id,
      order_id: bill.order_id,
      amount: bill.amount,
      current_status: bill.payment_status,
    })

    /*
     * Validasi nominal.
     *
     * Jangan pernah mengubah status tagihan jika
     * nominal dari Midtrans berbeda dengan nominal
     * tagihan di database.
     */
    const billAmount = Number(bill.amount)
    const notificationAmount = Number(
      grossAmountRaw,
    )

    if (
      !Number.isFinite(billAmount) ||
      !Number.isFinite(notificationAmount)
    ) {
      console.error(
        "GROSS AMOUNT TIDAK VALID:",
        {
          billAmount,
          notificationAmount,
        },
      )

      return NextResponse.json(
        {
          error:
            "Nominal transaksi tidak valid.",
        },
        { status: 400 },
      )
    }

    if (billAmount !== notificationAmount) {
      console.error(
        "GROSS AMOUNT MISMATCH:",
        {
          orderId,
          billAmount,
          notificationAmount,
        },
      )

      return NextResponse.json(
        {
          error:
            "Nominal transaksi tidak sesuai dengan tagihan.",
        },
        { status: 400 },
      )
    }

    console.log("Gross amount: VALID")

    /*
     * Tentukan status tagihan berdasarkan status Midtrans.
     */
    const newBillStatus = mapBillStatus(
      transactionStatus,
      fraudStatus,
    )

    console.log(
      "Midtrans transaction status:",
      transactionStatus,
    )

    console.log(
      "Fraud status:",
      fraudStatus || "-",
    )

    console.log(
      "New bill status:",
      newBillStatus,
    )

    /*
     * Simpan / update payment_transactions.
     *
     * PENTING:
     * Jangan hanya INSERT.
     *
     * Contoh:
     * 1. Midtrans kirim PENDING
     * 2. row transaction dibuat dengan PENDING
     * 3. beberapa saat kemudian Midtrans kirim SETTLEMENT
     *
     * Jika row lama hanya dibiarkan,
     * payment_transactions akan tetap PENDING.
     *
     * Karena itu row existing juga harus UPDATE.
     */
    let existingTransaction = null

    if (transactionId) {
      const {
        data,
        error: existingTransactionError,
      } = await admin
        .from("payment_transactions")
        .select(`
          id,
          transaction_id,
          transaction_status,
          payment_type,
          gross_amount,
          transaction_time,
          settlement_time,
          signature_verified,
          raw_response,
          created_at
        `)
        .eq("transaction_id", transactionId)
        .maybeSingle()

      if (existingTransactionError) {
        console.error(
          "CHECK EXISTING PAYMENT TRANSACTION ERROR:",
          existingTransactionError,
        )

        return NextResponse.json(
          {
            error:
              "Gagal memeriksa transaksi pembayaran.",
          },
          { status: 500 },
        )
      }

      existingTransaction = data
    }

    const transactionPayload = {
      spp_bill_id: bill.id,
      transaction_id:
        transactionId || null,
      transaction_status:
        transactionStatus || null,
      payment_type:
        paymentType,
      gross_amount:
        notificationAmount,
      transaction_time:
        transactionTime,
      settlement_time:
        settlementTime,
      signature_verified:
        true,
      raw_response:
        notification,
    }

    if (existingTransaction) {
      /*
       * Update transaksi yang sudah ada.
       */
      const {
        error: updateTransactionError,
      } = await admin
        .from("payment_transactions")
        .update({
          transaction_status:
            transactionPayload.transaction_status,
          payment_type:
            transactionPayload.payment_type,
          gross_amount:
            transactionPayload.gross_amount,
          transaction_time:
            transactionPayload.transaction_time,
          settlement_time:
            transactionPayload.settlement_time,
          signature_verified:
            true,
          raw_response:
            transactionPayload.raw_response,
        })
        .eq(
          "id",
          existingTransaction.id,
        )

      if (updateTransactionError) {
        console.error(
          "UPDATE PAYMENT TRANSACTION ERROR:",
          updateTransactionError,
        )

        return NextResponse.json(
          {
            error:
              "Gagal memperbarui transaksi pembayaran.",
          },
          { status: 500 },
        )
      }

      console.log(
        "Payment transaction berhasil diupdate:",
        existingTransaction.id,
      )
    } else {
      /*
       * Belum ada transaksi → INSERT.
       */
      const {
        data: insertedTransaction,
        error: insertTransactionError,
      } = await admin
        .from("payment_transactions")
        .insert(transactionPayload)
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
        .single()

      if (insertTransactionError) {
        /*
         * Bisa terjadi jika notification yang sama masuk
         * hampir bersamaan dan transaction_id UNIQUE.
         *
         * Dalam kasus ini kita coba ambil transaksi existing
         * lalu update statusnya.
         */
        if (
          insertTransactionError.code ===
          "23505"
        ) {
          console.warn(
            "Payment transaction sudah ada. Mencoba update ulang...",
          )

          if (transactionId) {
            const {
              data: duplicatedTransaction,
              error:
                duplicateLookupError,
            } = await admin
              .from("payment_transactions")
              .select("id")
              .eq(
                "transaction_id",
                transactionId,
              )
              .maybeSingle()

            if (duplicateLookupError) {
              console.error(
                "DUPLICATE TRANSACTION LOOKUP ERROR:",
                duplicateLookupError,
              )

              return NextResponse.json(
                {
                  error:
                    "Gagal memeriksa transaksi yang sudah ada.",
                },
                { status: 500 },
              )
            }

            if (duplicatedTransaction) {
              const {
                error:
                  duplicateUpdateError,
              } = await admin
                .from("payment_transactions")
                .update({
                  transaction_status:
                    transactionPayload.transaction_status,
                  payment_type:
                    transactionPayload.payment_type,
                  gross_amount:
                    transactionPayload.gross_amount,
                  transaction_time:
                    transactionPayload.transaction_time,
                  settlement_time:
                    transactionPayload.settlement_time,
                  signature_verified:
                    true,
                  raw_response:
                    transactionPayload.raw_response,
                })
                .eq(
                  "id",
                  duplicatedTransaction.id,
                )

              if (duplicateUpdateError) {
                console.error(
                  "DUPLICATE TRANSACTION UPDATE ERROR:",
                  duplicateUpdateError,
                )

                return NextResponse.json(
                  {
                    error:
                      "Gagal memperbarui transaksi pembayaran.",
                  },
                  { status: 500 },
                )
              }

              console.log(
                "Payment transaction duplicate berhasil diupdate:",
                duplicatedTransaction.id,
              )
            }
          }
        } else {
          console.error(
            "INSERT PAYMENT TRANSACTION ERROR:",
            insertTransactionError,
          )

          return NextResponse.json(
            {
              error:
                "Gagal menyimpan transaksi pembayaran.",
            },
            { status: 500 },
          )
        }
      } else {
        console.log(
          "Payment transaction berhasil disimpan:",
          insertedTransaction,
        )
      }
    }

    /*
     * Kalau status Midtrans tidak termasuk status
     * yang perlu mengubah spp_bills, kita cukup acknowledge
     * notification.
     */
    if (!newBillStatus) {
      console.log(
        "Status Midtrans tidak membutuhkan perubahan spp_bills:",
        transactionStatus,
      )

      return NextResponse.json({
        success: true,
        message:
          "Notification diterima. Tidak ada perubahan status tagihan.",
      })
    }

    /*
     * Jangan pernah menurunkan PAID menjadi status lain.
     *
     * Misalnya:
     * PAID → pending
     *
     * tidak boleh terjadi.
     */
    if (
      String(bill.payment_status).toUpperCase() ===
        "PAID" &&
      newBillStatus !== "PAID"
    ) {
      console.log(
        "Bill sudah PAID. Status tidak diturunkan.",
      )

      return NextResponse.json({
        success: true,
        message:
          "Bill sudah PAID dan tidak diturunkan.",
      })
    }

    const billUpdate: {
      payment_status: string
      updated_at: string
      paid_at?: string | null
    } = {
      payment_status: newBillStatus,
      updated_at: new Date().toISOString(),
    }

    if (newBillStatus === "PAID") {
      billUpdate.paid_at =
        settlementTime ??
        transactionTime ??
        new Date().toISOString()
    }

    /*
     * Update spp_bills sebagai sumber status tagihan.
     */
    const {
      data: updatedBill,
      error: updateBillError,
    } = await admin
      .from("spp_bills")
      .update(billUpdate)
      .eq("id", bill.id)
      .select(`
        id,
        order_id,
        amount,
        payment_status,
        paid_at,
        updated_at
      `)
      .single()

    if (updateBillError) {
      console.error(
        "GAGAL UPDATE BILL:",
        updateBillError,
      )

      return NextResponse.json(
        {
          error:
            "Gagal memperbarui status tagihan.",
        },
        { status: 500 },
      )
    }

    console.log(
      "BILL STATUS BERHASIL DIUPDATE:",
      updatedBill,
    )

    console.log("========================================")
    console.log("MIDTRANS NOTIFICATION SUCCESS")
    console.log("========================================")

    return NextResponse.json({
      success: true,
      message:
        "Notification Midtrans berhasil diproses.",
      bill: updatedBill,
    })
  } catch (error) {
    console.error(
      "MIDTRANS NOTIFICATION ERROR:",
      error,
    )

    return NextResponse.json(
      {
        error:
          "Terjadi kesalahan saat memproses notification Midtrans.",
      },
      { status: 500 },
    )
  }
}