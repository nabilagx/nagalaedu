import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
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

    const { data: children, error: childrenError } = await supabase
      .from("students")
      .select("id, student_name, grade_level")
      .eq("parent_id", user.id)
      .order("student_name", { ascending: true })

    if (childrenError) {
      console.error("Parent payments children error:", childrenError)

      return NextResponse.json(
        { error: "Gagal mengambil data anak." },
        { status: 500 },
      )
    }

    const studentIds = (children ?? []).map((child) => child.id)

    if (studentIds.length === 0) {
      return NextResponse.json({
        children: [],
        payments: [],
      })
    }

    const { data: bills, error: billsError } = await supabase
      .from("spp_bills")
      .select(`
        id,
        student_id,
        order_id,
        month_period,
        amount
      `)
      .in("student_id", studentIds)

    if (billsError) {
      console.error("Parent payments bills error:", billsError)

      return NextResponse.json(
        { error: "Gagal mengambil data tagihan." },
        { status: 500 },
      )
    }

    const billIds = (bills ?? []).map((bill) => bill.id)

    if (billIds.length === 0) {
      return NextResponse.json({
        children: children ?? [],
        payments: [],
      })
    }

    const { data: transactions, error: transactionsError } = await supabase
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
      .in("spp_bill_id", billIds)
      .order("created_at", { ascending: false })

    if (transactionsError) {
      console.error(
        "Parent payments transactions error:",
        transactionsError,
      )

      return NextResponse.json(
        { error: "Gagal mengambil riwayat pembayaran." },
        { status: 500 },
      )
    }

    const billMap = new Map(
      (bills ?? []).map((bill) => [bill.id, bill]),
    )

    const childMap = new Map(
      (children ?? []).map((child) => [child.id, child]),
    )

    const payments = (transactions ?? []).map((transaction) => {
      const bill = billMap.get(transaction.spp_bill_id)

      return {
        ...transaction,
        bill: bill
          ? {
              ...bill,
              student: childMap.get(bill.student_id) ?? null,
            }
          : null,
      }
    })

    return NextResponse.json({
      children: children ?? [],
      payments,
    })
  } catch (error) {
    console.error("Parent payments GET error:", error)

    return NextResponse.json(
      { error: "Terjadi kesalahan pada server." },
      { status: 500 },
    )
  }
}