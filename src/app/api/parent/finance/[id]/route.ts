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

    if (billErrorResponse || !bill || !student) {
      return (
        billErrorResponse ??
        NextResponse.json(
          {
            error: "Tagihan atau data siswa tidak ditemukan.",
          },
          { status: 404 },
        )
      )
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
      return (
        billErrorResponse ??
        NextResponse.json(
          {
            error: "Tagihan atau data siswa tidak ditemukan.",
          },
          { status: 404 },
        )
      )
    }

    /*
     * Setelah guard di atas, buat konstanta non-null.
     * Ini mencegah TypeScript menganggap bill/student
     * masih mungkin null di dalam nested function.
     */
    const currentBill = bill
    const currentStudent = student

    /*
     * ============================================================
     * 1. VALIDASI STATUS PEMBAYARAN
     * ============================================================
     */

    const paymentStatus = String(
      currentBill.payment_status,
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

    const amount = Number(currentBill.amount)

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
     * 3. MIDTRANS SERVER KEY
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
     * 4. APP URL
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
     * 5. REUSE SNAP TOKEN
     * ============================================================
     *
     * Jika Snap Token masih ada, jangan membuat transaksi
     * Midtrans baru.
     */

    if (currentBill.snap_token) {
      console.log(
        "Reusing existing Midtrans Snap token:",
        {
          bill_id: currentBill.id,
          order_id: currentBill.order_id,
        },
      )

      return NextResponse.json({
        snap_token: currentBill.snap_token,
        order_id: currentBill.order_id,
        redirect_url:
          `${midtransBaseUrl}/snap/v4/redirection/${currentBill.snap_token}`,
      })
    }

    /*
     * ============================================================
     * 6. MIDTRANS AUTH
     * ============================================================
     */

    const authHeader = `Basic ${Buffer.from(
      `${serverKey}:`,
    ).toString("base64")}`

    const finishUrl =
      `${appUrl}/dashboard/parent/finance/${currentBill.id}`

    /*
     * ============================================================
     * 7. ORDER ID
     * ============================================================
     *
     * Coba gunakan order_id yang sudah tersimpan.
     *
     * Kalau kosong, generate baru.
     */

    let orderId =
      currentBill.order_id ||
      generateOrderId()

    /*
     * ============================================================
     * 8. FUNCTION CREATE MIDTRANS TRANSACTION
     * ============================================================
     */

    async function createMidtransTransaction(
      currentOrderId: string,
    ) {
      console.log(
        "Creating Midtrans transaction:",
        {
          bill_id: currentBill.id,
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

      let response: Response

try {
  console.log("MIDTRANS FETCH START:", {
    url: `${midtransBaseUrl}/snap/v1/transactions`,
    order_id: currentOrderId,
    amount,
  })

  response = await fetch(
    `${midtransBaseUrl}/snap/v1/transactions`,
    {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        transaction_details: {
          order_id: currentOrderId,
          gross_amount: amount,
        },

        item_details: [
          {
            id: currentBill.id,
            price: amount,
            quantity: 1,
            name: `SPP ${currentStudent.student_name}`,
          },
        ],

        customer_details: {
          first_name: currentStudent.student_name,
        },

        callbacks: {
          finish: finishUrl,
          unfinish: finishUrl,
          error: finishUrl,
        },
      }),
    },
  )

  console.log("MIDTRANS FETCH RESPONSE:", {
    status: response.status,
    statusText: response.statusText,
    ok: response.ok,
  })
} catch (fetchError) {
  console.error("MIDTRANS FETCH FAILED:", fetchError)

  throw fetchError
}

      let data: MidtransSnapResponse | null

      try {
        data =
          (await response.json()) as MidtransSnapResponse
      } catch (parseError) {
        console.error(
          "Midtrans response JSON parse error:",
          parseError,
        )

        data = null
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
     * Jika Midtrans mengatakan order_id sudah pernah digunakan,
     * buat order_id baru dan retry SATU KALI.
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
        "Midtrans rejected duplicate order_id. Retrying:",
        {
          bill_id: currentBill.id,
          old_order_id: oldOrderId,
          new_order_id: orderId,
        },
      )

      midtransResult =
        await createMidtransTransaction(
          orderId,
        )
    }

    /*
     * ============================================================
     * 11. VALIDASI RESPONSE MIDTRANS
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
          bill_id: currentBill.id,
          order_id: orderId,
          status:
            midtransResponse.status,
          data: midtransData,
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
        .eq("id", currentBill.id)
        .eq(
          "student_id",
          currentStudent.id,
        )

    if (updateError) {
      console.error(
        "Save Midtrans transaction data error:",
        updateError,
      )

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
     * 13. SUCCESS
     * ============================================================
     */

    console.log(
      "Midtrans transaction created successfully:",
      {
        bill_id: currentBill.id,
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