import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

type MidtransSnapResponse = {
  token?: string
  redirect_url?: string
  status_code?: string
  status_message?: string
  error_messages?: string[]
}

async function getAuthenticatedParent() {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return {
      supabase,
      user: null,
      errorResponse: NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      ),
    }
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role_id")
    .eq("id", user.id)
    .single()

  if (profileError || !profile) {
    return {
      supabase,
      user: null,
      errorResponse: NextResponse.json(
        { error: "Profil pengguna tidak ditemukan." },
        { status: 404 },
      ),
    }
  }

  if (profile.role_id !== 3) {
    return {
      supabase,
      user: null,
      errorResponse: NextResponse.json(
        { error: "Akses hanya untuk Parent." },
        { status: 403 },
      ),
    }
  }

  return {
    supabase,
    user,
    errorResponse: null,
  }
}

async function getOwnedBill(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  billId: string,
) {
  const { data: bill, error: billError } = await supabase
    .from("spp_bills")
    .select(`
      id,
      student_id,
      order_id,
      month_period,
      amount,
      payment_status,
      snap_token,
      paid_at,
      created_at,
      updated_at
    `)
    .eq("id", billId)
    .single()

  if (billError || !bill) {
    return {
      bill: null,
      student: null,
      errorResponse: NextResponse.json(
        { error: "Tagihan tidak ditemukan." },
        { status: 404 },
      ),
    }
  }

  const { data: student, error: studentError } = await supabase
    .from("students")
    .select(`
      id,
      student_name,
      grade_level,
      school_name
    `)
    .eq("id", bill.student_id)
    .eq("parent_id", userId)
    .single()

  if (studentError || !student) {
    return {
      bill: null,
      student: null,
      errorResponse: NextResponse.json(
        { error: "Anda tidak memiliki akses ke tagihan ini." },
        { status: 403 },
      ),
    }
  }

  return {
    bill,
    student,
    errorResponse: null,
  }
}

function getMidtransBaseUrl() {
  return process.env.MIDTRANS_IS_PRODUCTION === "true"
    ? "https://app.midtrans.com"
    : "https://app.sandbox.midtrans.com"
}

function getAppUrl() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim()

  if (!appUrl) {
    throw new Error("NEXT_PUBLIC_APP_URL belum dikonfigurasi.")
  }

  return appUrl.replace(/\/+$/, "")
}

/**
 * Generate order ID baru.
 *
 * Format:
 * NGL-SPP-{timestamp}-{random}
 *
 * Random suffix digunakan supaya sangat kecil kemungkinan
 * terjadi collision ketika request dibuat hampir bersamaan.
 */
function generateOrderId() {
  const timestamp = Date.now()

  const random = Math.random()
    .toString(36)
    .substring(2, 8)
    .toUpperCase()

  return `NGL-SPP-${timestamp}-${random}`
}

export async function GET(
  _request: Request,
  context: RouteContext,
) {
  try {
    const { id } = await context.params

    const {
      supabase,
      user,
      errorResponse,
    } = await getAuthenticatedParent()

    if (errorResponse || !user) {
      return errorResponse
    }

    const {
      bill,
      student,
      errorResponse: billErrorResponse,
    } = await getOwnedBill(
      supabase,
      user.id,
      id,
    )

    if (billErrorResponse || !bill) {
      return billErrorResponse
    }

    return NextResponse.json({
      bill: {
        ...bill,
        student,
      },
    })
  } catch (error) {
    console.error(
      "Parent finance detail GET error:",
      error,
    )

    return NextResponse.json(
      {
        error: "Terjadi kesalahan pada server.",
      },
      { status: 500 },
    )
  }
}

export async function POST(
  _request: Request,
  context: RouteContext,
) {
  try {
    const { id } = await context.params

    const {
      supabase,
      user,
      errorResponse,
    } = await getAuthenticatedParent()

    if (errorResponse || !user) {
      return errorResponse
    }

    const {
      bill,
      student,
      errorResponse: billErrorResponse,
    } = await getOwnedBill(
      supabase,
      user.id,
      id,
    )

    if (billErrorResponse || !bill || !student) {
      return billErrorResponse
    }

    /*
     * ============================================================
     * 1. VALIDASI STATUS PEMBAYARAN
     * ============================================================
     */

    const paymentStatus = String(
      bill.payment_status,
    ).toUpperCase()

    if (paymentStatus === "PAID") {
      return NextResponse.json(
        {
          error: "Tagihan ini sudah lunas.",
        },
        { status: 400 },
      )
    }

    if (paymentStatus === "CANCELLED") {
      return NextResponse.json(
        {
          error: "Tagihan ini sudah dibatalkan.",
        },
        { status: 400 },
      )
    }

    if (paymentStatus === "EXPIRED") {
      return NextResponse.json(
        {
          error:
            "Tagihan ini sudah kedaluwarsa. Silakan hubungi Founder untuk membuat tagihan baru.",
        },
        { status: 400 },
      )
    }

    /*
     * ============================================================
     * 2. VALIDASI NOMINAL
     * ============================================================
     */

    const amount = Number(bill.amount)

    if (!Number.isFinite(amount)) {
      return NextResponse.json(
        {
          error: "Nominal tagihan tidak valid.",
        },
        { status: 400 },
      )
    }

    if (!Number.isInteger(amount)) {
      return NextResponse.json(
        {
          error:
            "Nominal tagihan harus berupa angka bulat.",
        },
        { status: 400 },
      )
    }

    if (amount < 1000 || amount > 1000000) {
      return NextResponse.json(
        {
          error:
            "Nominal tagihan harus antara Rp1.000 dan Rp1.000.000.",
        },
        { status: 400 },
      )
    }

    /*
     * ============================================================
     * 3. VALIDASI MIDTRANS SERVER KEY
     * ============================================================
     */

    const serverKey =
      process.env.MIDTRANS_SERVER_KEY

    if (!serverKey) {
      console.error(
        "MIDTRANS_SERVER_KEY belum dikonfigurasi.",
      )

      return NextResponse.json(
        {
          error:
            "Konfigurasi pembayaran belum tersedia.",
        },
        { status: 500 },
      )
    }

    /*
     * ============================================================
     * 4. VALIDASI APP URL
     * ============================================================
     */

    let appUrl: string

    try {
      appUrl = getAppUrl()
    } catch (error) {
      console.error(
        "APP URL CONFIG ERROR:",
        error,
      )

      return NextResponse.json(
        {
          error:
            "NEXT_PUBLIC_APP_URL belum dikonfigurasi di environment.",
        },
        { status: 500 },
      )
    }

    const midtransBaseUrl =
      getMidtransBaseUrl()

    /*
     * ============================================================
     * 5. GUNAKAN SNAP TOKEN YANG SUDAH ADA
     * ============================================================
     *
     * Kalau transaksi sebelumnya sudah berhasil dibuat,
     * jangan membuat transaksi Midtrans baru.
     */

    if (bill.snap_token) {
      console.log(
        "Reusing existing Midtrans Snap token:",
        {
          bill_id: bill.id,
          order_id: bill.order_id,
        },
      )

      return NextResponse.json({
        snap_token: bill.snap_token,
        order_id: bill.order_id,
        redirect_url: `${midtransBaseUrl}/snap/v4/redirection/${bill.snap_token}`,
      })
    }

    /*
     * ============================================================
     * 6. AUTH HEADER MIDTRANS
     * ============================================================
     */

    const authHeader = `Basic ${Buffer.from(
      `${serverKey}:`,
    ).toString("base64")}`

    const finishUrl =
      `${appUrl}/dashboard/parent/finance/${bill.id}`

    /*
     * ============================================================
     * 7. TENTUKAN ORDER ID
     * ============================================================
     *
     * Jika order_id lama tersedia, kita coba gunakan.
     *
     * Namun kalau Midtrans menolak karena order_id sudah pernah
     * digunakan, kita generate order_id baru dan retry satu kali.
     */

    let orderId =
      bill.order_id || generateOrderId()

    /*
     * ============================================================
     * 8. FUNCTION UNTUK MEMBUAT TRANSAKSI MIDTRANS
     * ============================================================
     */

    async function createMidtransTransaction(
      currentOrderId: string,
    ) {
      console.log(
        "Creating Midtrans transaction:",
        {
          bill_id: bill.id,
          order_id: currentOrderId,
          amount,
          environment:
            process.env.MIDTRANS_IS_PRODUCTION ===
            "true"
              ? "production"
              : "sandbox",
          finish_url: finishUrl,
        },
      )

      const response = await fetch(
        `${midtransBaseUrl}/snap/v1/transactions`,
        {
          method: "POST",
          headers: {
            Authorization: authHeader,
            "Content-Type":
              "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            transaction_details: {
              order_id: currentOrderId,
              gross_amount: amount,
            },

            item_details: [
              {
                id: bill.id,
                price: amount,
                quantity: 1,
                name: `SPP ${student.student_name}`,
              },
            ],

            customer_details: {
              first_name:
                student.student_name,
            },

            callbacks: {
              finish: finishUrl,
              unfinish: finishUrl,
              error: finishUrl,
            },
          }),
        },
      )

      let data: MidtransSnapResponse

      try {
        data =
          (await response.json()) as MidtransSnapResponse
      } catch (parseError) {
        console.error(
          "Midtrans response JSON parse error:",
          parseError,
        )

        return {
          response,
          data: null,
        }
      }

      return {
        response,
        data,
      }
    }

    /*
     * ============================================================
     * 9. REQUEST PERTAMA KE MIDTRANS
     * ============================================================
     */

    let midtransResult =
      await createMidtransTransaction(
        orderId,
      )

    /*
     * ============================================================
     * 10. HANDLE DUPLICATE ORDER ID
     * ============================================================
     *
     * Kalau order_id sudah pernah digunakan di Midtrans,
     * generate order_id baru lalu retry SATU KALI.
     */

    const duplicateOrderId =
      midtransResult.response.status === 400 &&
      Array.isArray(
        midtransResult.data?.error_messages,
      ) &&
      midtransResult.data.error_messages.some(
        (message) =>
          message.includes(
            "transaction_details.order_id has already been taken",
          ),
      )

    if (duplicateOrderId) {
      const oldOrderId = orderId

      orderId = generateOrderId()

      console.warn(
        "Midtrans rejected duplicate order_id. Retrying with new order_id:",
        {
          old_order_id: oldOrderId,
          new_order_id: orderId,
          bill_id: bill.id,
        },
      )

      midtransResult =
        await createMidtransTransaction(
          orderId,
        )
    }

    /*
     * ============================================================
     * 11. VALIDASI FINAL RESPONSE MIDTRANS
     * ============================================================
     */

    const {
      response: midtransResponse,
      data: midtransData,
    } = midtransResult

    if (
      !midtransResponse.ok ||
      !midtransData?.token
    ) {
      console.error(
        "Midtrans Snap error:",
        {
          status:
            midtransResponse.status,
          data: midtransData,
          bill_id: bill.id,
          order_id: orderId,
        },
      )

      const midtransMessage =
        midtransData?.error_messages?.join(
          ", ",
        ) ||
        midtransData?.status_message ||
        "Gagal membuat transaksi pembayaran."

      return NextResponse.json(
        {
          error: midtransMessage,
        },
        { status: 502 },
      )
    }

    /*
     * ============================================================
     * 12. SIMPAN ORDER ID + SNAP TOKEN
     * ============================================================
     *
     * Penting:
     * order_id ikut disimpan supaya database selalu sinkron
     * dengan transaksi yang benar-benar dibuat di Midtrans.
     */

    const { error: updateError } =
      await supabase
        .from("spp_bills")
        .update({
          order_id: orderId,
          snap_token:
            midtransData.token,
          updated_at:
            new Date().toISOString(),
        })
        .eq("id", bill.id)
        .eq(
          "student_id",
          student.id,
        )

    if (updateError) {
      console.error(
        "Save Midtrans transaction data error:",
        updateError,
      )

      /*
       * Transaksi Midtrans SUDAH berhasil dibuat,
       * tetapi database gagal menyimpan token.
       */
      return NextResponse.json(
        {
          error:
            "Transaksi berhasil dibuat, tetapi data pembayaran gagal disimpan. Silakan hubungi Founder.",
        },
        { status: 500 },
      )
    }

    /*
     * ============================================================
     * 13. RESPONSE KE FRONTEND
     * ============================================================
     */

    console.log(
      "Midtrans transaction created successfully:",
      {
        bill_id: bill.id,
        order_id: orderId,
      },
    )

    return NextResponse.json({
      snap_token: midtransData.token,
      order_id: orderId,
      redirect_url:
        `${midtransBaseUrl}/snap/v4/redirection/${midtransData.token}`,
    })
  } catch (error) {
    console.error(
      "Parent finance payment POST error:",
      error,
    )

    return NextResponse.json(
      {
        error:
          "Terjadi kesalahan saat membuat pembayaran.",
      },
      { status: 500 },
    )
  }
}