import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

type RouteContext = {
  params: Promise<{
    id: string
  }>
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
    } = await getOwnedBill(supabase, user.id, id)

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
    console.error("Parent finance detail GET error:", error)

    return NextResponse.json(
      { error: "Terjadi kesalahan pada server." },
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
    } = await getOwnedBill(supabase, user.id, id)

    if (billErrorResponse || !bill || !student) {
      return billErrorResponse
    }

    const paymentStatus = bill.payment_status.toUpperCase()

    if (paymentStatus === "PAID") {
      return NextResponse.json(
        { error: "Tagihan ini sudah lunas." },
        { status: 400 },
      )
    }

    const amount = Number(bill.amount)

    if (!Number.isFinite(amount)) {
      return NextResponse.json(
        { error: "Nominal tagihan tidak valid." },
        { status: 400 },
      )
    }

    if (amount < 1000 || amount > 1000000) {
      return NextResponse.json(
        { error: "Nominal tagihan harus antara Rp1.000 dan Rp1.000.000." },
        { status: 400 },
      )
    }

    const serverKey = process.env.MIDTRANS_SERVER_KEY

    if (!serverKey) {
      console.error("MIDTRANS_SERVER_KEY belum dikonfigurasi.")

      return NextResponse.json(
        { error: "Konfigurasi pembayaran belum tersedia." },
        { status: 500 },
      )
    }

    /**
     * Kalau Snap Token masih ada, kita gunakan kembali.
     * Ini mencegah Parent membuat transaksi baru berkali-kali.
     */
    if (bill.snap_token) {
      return NextResponse.json({
        snap_token: bill.snap_token,
        order_id: bill.order_id,
        redirect_url: `https://app.sandbox.midtrans.com/snap/v4/redirection/${bill.snap_token}`,
      })
    }

    const authHeader = `Basic ${Buffer.from(`${serverKey}:`).toString(
      "base64",
    )}`

    const midtransResponse = await fetch(
      "https://app.sandbox.midtrans.com/snap/v1/transactions",
      {
        method: "POST",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          transaction_details: {
            order_id: bill.order_id,
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
            first_name: student.student_name,
          },

          callbacks: {
            finish: `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/dashboard/parent/finance/${bill.id}`,
          },
        }),
      },
    )

    const midtransData = await midtransResponse.json()

    if (!midtransResponse.ok || !midtransData.token) {
      console.error("Midtrans Snap error:", midtransData)

      return NextResponse.json(
        {
          error:
            midtransData.status_message ||
            "Gagal membuat transaksi pembayaran.",
        },
        { status: 502 },
      )
    }

    const { error: updateError } = await supabase
      .from("spp_bills")
      .update({
        snap_token: midtransData.token,
        updated_at: new Date().toISOString(),
      })
      .eq("id", bill.id)
      .eq("student_id", student.id)

    if (updateError) {
      console.error("Save Snap token error:", updateError)

      return NextResponse.json(
        { error: "Transaksi berhasil dibuat, tetapi token gagal disimpan." },
        { status: 500 },
      )
    }

    return NextResponse.json({
      snap_token: midtransData.token,
      order_id: bill.order_id,
      redirect_url: `https://app.sandbox.midtrans.com/snap/v4/redirection/${midtransData.token}`,
    })
  } catch (error) {
    console.error("Parent finance payment POST error:", error)

    return NextResponse.json(
      { error: "Terjadi kesalahan saat membuat pembayaran." },
      { status: 500 },
    )
  }
}