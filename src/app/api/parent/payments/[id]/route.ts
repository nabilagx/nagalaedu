import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

export async function GET(
  _request: Request,
  context: RouteContext,
) {
  try {
    const { id } = await context.params

    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      )
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role_id")
      .eq("id", user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "Profil pengguna tidak ditemukan." },
        { status: 404 },
      )
    }

    if (profile.role_id !== 3) {
      return NextResponse.json(
        { error: "Akses hanya untuk Parent." },
        { status: 403 },
      )
    }

    const { data: transaction, error: transactionError } = await supabase
      .from("payment_transactions")
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
      .eq("id", id)
      .single()

    if (transactionError || !transaction) {
      return NextResponse.json(
        { error: "Transaksi tidak ditemukan." },
        { status: 404 },
      )
    }

    const { data: bill, error: billError } = await supabase
      .from("spp_bills")
      .select(`
        id,
        student_id,
        order_id,
        month_period,
        amount,
        payment_status,
        paid_at
      `)
      .eq("id", transaction.spp_bill_id)
      .single()

    if (billError || !bill) {
      return NextResponse.json(
        { error: "Tagihan terkait tidak ditemukan." },
        { status: 404 },
      )
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
      .eq("parent_id", user.id)
      .single()

    if (studentError || !student) {
      return NextResponse.json(
        { error: "Anda tidak memiliki akses ke transaksi ini." },
        { status: 403 },
      )
    }

    return NextResponse.json({
      payment: {
        ...transaction,
        bill: {
          ...bill,
          student,
        },
      },
    })
  } catch (error) {
    console.error("Parent payment detail GET error:", error)

    return NextResponse.json(
      { error: "Terjadi kesalahan pada server." },
      { status: 500 },
    )
  }
}