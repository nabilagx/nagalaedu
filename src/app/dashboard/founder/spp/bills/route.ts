import { NextResponse } from "next/server"
import crypto from "crypto"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // 1. Pastikan user sudah login
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized." },
        { status: 401 }
      )
    }

    // 2. Pastikan user adalah Founder
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role_id")
      .eq("id", user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "Profil pengguna tidak ditemukan." },
        { status: 403 }
      )
    }

    if (profile.role_id !== 1) {
      return NextResponse.json(
        { error: "Hanya Founder yang dapat membuat tagihan." },
        { status: 403 }
      )
    }

    // 3. Ambil data dari request
    const body = await request.json()

    const studentId = body.studentId
    const monthPeriod = body.monthPeriod
    const amount = Number(body.amount)

    // 4. Validasi input
    if (!studentId || typeof studentId !== "string") {
      return NextResponse.json(
        { error: "Siswa wajib dipilih." },
        { status: 400 }
      )
    }

    if (!monthPeriod || typeof monthPeriod !== "string") {
      return NextResponse.json(
        { error: "Periode tagihan wajib diisi." },
        { status: 400 }
      )
    }

    if (!/^\d{4}-\d{2}-01$/.test(monthPeriod)) {
      return NextResponse.json(
        {
          error:
            "Format periode tidak valid. Gunakan format YYYY-MM-01.",
        },
        { status: 400 }
      )
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { error: "Nominal tagihan harus lebih dari Rp0." },
        { status: 400 }
      )
    }

    // 5. Pastikan siswa aktif
    const { data: student, error: studentError } = await supabase
      .from("students")
      .select("id, student_name, status")
      .eq("id", studentId)
      .single()

    if (studentError || !student) {
      return NextResponse.json(
        { error: "Siswa tidak ditemukan." },
        { status: 404 }
      )
    }

    if (student.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "Siswa tidak aktif dan tidak dapat dibuatkan tagihan." },
        { status: 400 }
      )
    }

    // 6. Cek apakah siswa sudah memiliki tagihan pada bulan tersebut
    const { data: existingBill, error: existingBillError } =
      await supabase
        .from("spp_bills")
        .select("id, payment_status")
        .eq("student_id", studentId)
        .eq("month_period", monthPeriod)
        .maybeSingle()

    if (existingBillError) {
      console.error(existingBillError)

      return NextResponse.json(
        { error: "Gagal memeriksa tagihan yang sudah ada." },
        { status: 500 }
      )
    }

    if (existingBill) {
      return NextResponse.json(
        {
          error:
            "Tagihan untuk siswa dan periode tersebut sudah ada.",
        },
        { status: 409 }
      )
    }

    // 7. Generate Order ID unik
    const randomId = crypto
      .randomUUID()
      .replace(/-/g, "")
      .slice(0, 12)
      .toUpperCase()

    const orderId = `SPP-${monthPeriod.slice(0, 7).replace("-", "")}-${randomId}`

    // 8. Buat tagihan
    const { data: bill, error: insertError } = await supabase
      .from("spp_bills")
      .insert({
        student_id: studentId,
        order_id: orderId,
        month_period: monthPeriod,
        amount,
        payment_status: "PENDING",
      })
      .select(
        `
        id,
        order_id,
        month_period,
        amount,
        payment_status,
        paid_at,
        created_at
        `
      )
      .single()

    if (insertError) {
      console.error(insertError)

      // Kemungkinan race condition / unique constraint
      if (insertError.code === "23505") {
        return NextResponse.json(
          {
            error:
              "Tagihan untuk siswa dan periode tersebut sudah ada.",
          },
          { status: 409 }
        )
      }

      return NextResponse.json(
        { error: "Gagal membuat tagihan." },
        { status: 500 }
      )
    }

    // 9. Berhasil
    return NextResponse.json(
      {
        message: "Tagihan berhasil dibuat.",
        bill,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Create SPP bill error:", error)

    return NextResponse.json(
      { error: "Terjadi kesalahan pada server." },
      { status: 500 }
    )
  }
}