"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  Loader2,
  ReceiptText,
  UserRound,
} from "lucide-react"

type Bill = {
  id: string
  student_id: string
  order_id: string
  month_period: string
  amount: number
  payment_status: string
  snap_token: string | null
  paid_at: string | null
  created_at: string
  updated_at: string
  student: {
    id: string
    student_name: string
    grade_level: string | null
    school_name: string | null
  } | null
}

type FinanceResponse = {
  bill: Bill
}

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value)
}

function formatMonth(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    month: "long",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`))
}

export default function ParentFinanceDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params.id

  const [bill, setBill] = useState<Bill | null>(null)
  const [loading, setLoading] = useState(true)
  const [paying, setPaying] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    async function loadBill() {
      try {
        setLoading(true)

        const response = await fetch(`/api/parent/finance/${id}`, {
          cache: "no-store",
        })

        const result = await response.json()

        if (!response.ok) {
          throw new Error(result.error || "Gagal memuat tagihan.")
        }

        setBill((result as FinanceResponse).bill)
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Terjadi kesalahan saat memuat tagihan.",
        )
      } finally {
        setLoading(false)
      }
    }

    if (id) {
      loadBill()
    }
  }, [id])

  async function handlePayment() {
    if (!bill || paying) return

    try {
      setPaying(true)
      setError("")

      const response = await fetch(`/api/parent/finance/${bill.id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Gagal membuat pembayaran.")
      }

      if (result.redirect_url) {
        window.location.href = result.redirect_url
        return
      }

      throw new Error("Link pembayaran tidak tersedia.")
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan saat memproses pembayaran.",
      )
    } finally {
      setPaying(false)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-8">
        <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <Loader2 className="mx-auto h-7 w-7 animate-spin text-[#E53935]" />
          <p className="mt-3 text-sm text-slate-500">
            Memuat detail tagihan...
          </p>
        </div>
      </main>
    )
  }

  if (error && !bill) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-8">
        <div className="mx-auto max-w-3xl">
          <Link
            href="/dashboard/parent/finance"
            className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-[#E53935]"
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali ke Tagihan SPP
          </Link>

          <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
            {error}
          </div>
        </div>
      </main>
    )
  }

  if (!bill) return null

  const isPaid = bill.payment_status.toUpperCase() === "PAID"

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/dashboard/parent/finance"
          className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-[#E53935]"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali ke Tagihan SPP
        </Link>

        <div className="mb-6">
          <p className="text-sm font-semibold text-[#E53935]">
            DETAIL TAGIHAN
          </p>

          <h1 className="mt-1 text-2xl font-bold text-[#111827]">
            SPP {formatMonth(bill.month_period)}
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            {bill.order_id}
          </p>
        </div>

        {error && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="bg-[#111827] p-6 text-white">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-slate-300">Total Tagihan</p>

                <p className="mt-2 text-3xl font-bold">
                  {formatRupiah(Number(bill.amount))}
                </p>
              </div>

              {isPaid ? (
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/20">
                  <CheckCircle2 className="h-6 w-6 text-emerald-300" />
                </div>
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
                  <CreditCard className="h-6 w-6 text-white" />
                </div>
              )}
            </div>
          </div>

          <div className="p-6">
            <div className="mb-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="flex items-center gap-3">
                  <UserRound className="h-5 w-5 text-slate-500" />

                  <div>
                    <p className="text-xs text-slate-500">Nama Anak</p>
                    <p className="font-semibold text-[#111827]">
                      {bill.student?.student_name ?? "-"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="flex items-center gap-3">
                  <CalendarDays className="h-5 w-5 text-slate-500" />

                  <div>
                    <p className="text-xs text-slate-500">Periode</p>
                    <p className="font-semibold text-[#111827]">
                      {formatMonth(bill.month_period)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="divide-y divide-slate-100 rounded-2xl border border-slate-100">
              <div className="flex items-center justify-between gap-4 p-4">
                <span className="text-sm text-slate-500">Status</span>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    isPaid
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-amber-50 text-amber-700"
                  }`}
                >
                  {isPaid ? "Lunas" : "Belum Dibayar"}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4 p-4">
                <span className="text-sm text-slate-500">Nomor Tagihan</span>

                <span className="max-w-[60%] break-all text-right text-sm font-medium text-[#111827]">
                  {bill.order_id}
                </span>
              </div>

              {bill.paid_at && (
                <div className="flex items-center justify-between gap-4 p-4">
                  <span className="text-sm text-slate-500">Tanggal Bayar</span>

                  <span className="text-sm font-medium text-[#111827]">
                    {new Intl.DateTimeFormat("id-ID", {
                      dateStyle: "medium",
                    }).format(new Date(bill.paid_at))}
                  </span>
                </div>
              )}
            </div>

            {!isPaid && (
              <div className="mt-6">
                <button
                  type="button"
                  onClick={handlePayment}
                  disabled={paying}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#E53935] px-5 text-sm font-bold text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {paying ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Menyiapkan Pembayaran...
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-5 w-5" />
                      Bayar dengan Midtrans
                    </>
                  )}
                </button>

                <p className="mt-3 text-center text-xs leading-5 text-slate-400">
                  Pembayaran akan diproses melalui Midtrans. Status lunas
                  diperbarui setelah pembayaran dikonfirmasi oleh sistem.
                </p>
              </div>
            )}

            {isPaid && (
              <div className="mt-6 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />

                <div>
                  <p className="text-sm font-semibold text-emerald-800">
                    Tagihan sudah lunas
                  </p>

                  <p className="mt-1 text-xs text-emerald-700">
                    Pembayaran telah dikonfirmasi oleh sistem.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-5 flex items-center gap-2 text-xs text-slate-400">
          <ReceiptText className="h-4 w-4" />
          Simpan nomor tagihan untuk referensi pembayaran.
        </div>
      </div>
    </main>
  )
}