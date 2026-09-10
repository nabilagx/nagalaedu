import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const MIDTRANS_SERVER_KEY = process.env.MIDTRANS_SERVER_KEY
const IS_PRODUCTION =
  process.env.MIDTRANS_IS_PRODUCTION === "true"

const MIDTRANS_SNAP_URL = IS_PRODUCTION
  ? "https://app.midtrans.com/snap/v1/transactions"
  : "https://app.sandbox.midtrans.com/snap/v1/transactions"

export async function POST(request: Request) {
  try {
    if (!MIDTRANS_SERVER_KEY) {
      return NextResponse.json(
        { error: "Midtrans Server Key belum dikonfigurasi." },
        { status: 500 }
      )
    }

    const supabase = await createClient()

    // =========================
    // 1. Cek user login
    // =========================

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized." },
        { status: 401 }
      )
    }

    // =========================
    // 2. Cek role Parent
    // =========================

    const { data: profile, error: profileError } =
      await supabase
        .from("profiles")
        .select("role_id, full_name")
        .eq("id", user.id)
        .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "Profil pengguna tidak ditemukan." },
        { status: 403 }
      )
    }

    if (profile.role_id !== 3) {
      return NextResponse.json(
        { error: "Hanya Parent yang dapat melakukan pembayaran." },
        { status: 403 }
      )
    }

    // =========================
    // 3. Ambil billId
    // =========================

    const body = await request.json()
    const billId = body.billId

    if (!billId || typeof billId !== "string") {
      return NextResponse.json(
        { error: "billId wajib diisi." },
        { status: 400 }
      )
    }

    // =========================
    // 4. Ambil tagihan
    // =========================

    const { data: bill, error: billError } = await supabase
      .from("spp_bills")
      .select(
        `
        id,
        student_id,
        order_id,
        month_period,
        amount,
        payment_status,
        snap_token
        `
      )
      .eq("id", billId)
      .single()

    if (billError || !bill) {
      return NextResponse.json(
        { error: "Tagihan tidak ditemukan." },
        { status: 404 }
      )
    }

    // =========================
    // 5. Pastikan Parent memiliki siswa
    // =========================

    const { data: student, error: studentError } =
      await supabase
        .from("students")
        .select(
          `
          id,
          student_name,
          parent_id
          `
        )
        .eq("id", bill.student_id)
        .single()

    if (studentError || !student) {
      return NextResponse.json(
        { error: "Siswa tidak ditemukan." },
        { status: 404 }
      )
    }

    if (student.parent_id !== user.id) {
      return NextResponse.json(
        { error: "Anda tidak memiliki akses ke tagihan ini." },
        { status: 403 }
      )
    }

    // =========================
    // 6. Jangan bayar tagihan lunas
    // =========================

    if (bill.payment_status === "PAID") {
      return NextResponse.json(
        { error: "Tagihan ini sudah lunas." },
        { status: 400 }
      )
    }

    if (
      bill.payment_status === "CANCELLED" ||
      bill.payment_status === "EXPIRED"
    ) {
      return NextResponse.json(
        { error: "Tagihan ini sudah tidak dapat dibayar." },
        { status: 400 }
      )
    }

    // =========================
    // 7. Kalau sudah punya Snap Token
    // =========================

    if (bill.snap_token) {
      return NextResponse.json({
        token: bill.snap_token,
      })
    }

    // =========================
    // 8. Basic Auth Midtrans
    // =========================

    const authHeader =
      "Basic " +
      Buffer.from(`${MIDTRANS_SERVER_KEY}:`).toString("base64")

    // =========================
    // 9. Request Snap Token
    // =========================

    const midtransResponse = await fetch(
      MIDTRANS_SNAP_URL,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader,
        },
        body: JSON.stringify({
          transaction_details: {
            order_id: bill.order_id,
            gross_amount: Number(bill.amount),
          },

          customer_details: {
            first_name: profile.full_name ?? "Parent",
            email: user.email,
          },

          item_details: [
            {
              id: bill.order_id,
              price: Number(bill.amount),
              quantity: 1,
              name: `SPP ${student.student_name} - ${new Date(
                bill.month_period
              ).toLocaleDateString("id-ID", {
                month: "long",
                year: "numeric",
              })}`,
            },
          ],
        }),
      }
    )

    const midtransData = await midtransResponse.json()

    if (!midtransResponse.ok) {
      console.error("Midtrans error:", midtransData)

      return NextResponse.json(
        {
          error:
            midtransData?.error_messages?.join(", ") ||
            "Gagal membuat transaksi Midtrans.",
        },
        { status: 502 }
      )
    }

    if (!midtransData.token) {
      console.error(
        "Midtrans tidak mengembalikan Snap Token:",
        midtransData
      )

      return NextResponse.json(
        { error: "Snap Token tidak diterima dari Midtrans." },
        { status: 502 }
      )
    }

    // =========================
    // 10. Simpan Snap Token
    // =========================

    const { error: updateError } = await supabase
      .from("spp_bills")
      .update({
        snap_token: midtransData.token,
      })
      .eq("id", bill.id)

    if (updateError) {
      console.error(updateError)

      return NextResponse.json(
        { error: "Snap Token berhasil dibuat tetapi gagal disimpan." },
        { status: 500 }
      )
    }

    // =========================
    // 11. Return token
    // =========================

    return NextResponse.json({
      token: midtransData.token,
    })
  } catch (error) {
    console.error("Payment create error:", error)

    return NextResponse.json(
      { error: "Terjadi kesalahan pada server." },
      { status: 500 }
    )
  }
}