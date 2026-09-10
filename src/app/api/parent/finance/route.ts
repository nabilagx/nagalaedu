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
      console.error("Parent finance children error:", childrenError)

      return NextResponse.json(
        { error: "Gagal mengambil data anak." },
        { status: 500 },
      )
    }

    const studentIds = (children ?? []).map((student) => student.id)

    if (studentIds.length === 0) {
      return NextResponse.json({
        children: [],
        bills: [],
      })
    }

    const { data: bills, error: billsError } = await supabase
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
      .in("student_id", studentIds)
      .order("month_period", { ascending: false })
      .order("created_at", { ascending: false })

    if (billsError) {
      console.error("Parent finance bills error:", billsError)

      return NextResponse.json(
        { error: "Gagal mengambil tagihan SPP." },
        { status: 500 },
      )
    }

    const childrenMap = new Map(
      (children ?? []).map((child) => [child.id, child]),
    )

    const billsWithStudent = (bills ?? []).map((bill) => ({
      ...bill,
      student: childrenMap.get(bill.student_id) ?? null,
    }))

    return NextResponse.json({
      children: children ?? [],
      bills: billsWithStudent,
    })
  } catch (error) {
    console.error("Parent finance GET error:", error)

    return NextResponse.json(
      { error: "Terjadi kesalahan pada server." },
      { status: 500 },
    )
  }
}