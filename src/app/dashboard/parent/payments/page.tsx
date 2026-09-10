"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  ArrowRight,
  CheckCircle2,
  CreditCard,
  ReceiptText,
  Search,
  XCircle,
} from "lucide-react"

type Child = {
  id: string
  student_name: string
  grade_level: string | null
}

type Bill = {
  id: string
  student_id: string
  order_id: string
  month_period: string
  amount: number
  payment_status?: string
  paid_at?: string | null
  student: Child | null
}

type Payment = {
  id: string
  spp_bill_id: string
  transaction_id: string
  transaction_status: string
  payment_type: string | null
  gross_amount: number
  transaction_time: string | null
  settlement_time: string | null
  signature_verified: boolean | null
  created_at: string
  bill: Bill | null
}

type ResponseData = {
  children: Child[]
  payments: Payment[]
}

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value)
}

function formatDate(value: string | null) {
  if (!value) return "-"

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
  }).format(new Date(value))
}

function formatMonth(value: string | undefined) {
  if (!value) return "-"

  return new Intl.DateTimeFormat("id-ID", {
    month: "long",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`))
}

function getPaymentStatus(status: string) {
  const normalized = status.toUpperCase()

  if (
    normalized === "SETTLEMENT" ||
    normalized === "CAPTURE" ||
    normalized === "PAID"
  ) {
    return {
      label: "Berhasil",
      className: "border-emerald-200 bg-emerald-50 text-emerald-700",
      icon: CheckCircle2,
    }
  }

  if (
    normalized === "CANCEL" ||
    normalized === "DENY" ||
    normalized === "EXPIRE" ||
    normalized === "FAILED"
  ) {
    return {
      label: "Gagal",
      className: "border-red-200 bg-red-50 text-red-700",
      icon: XCircle,
    }
  }

  return {
    label: "Diproses",
    className: "border-amber-200 bg-amber-50 text-amber-700",
    icon: CreditCard,
  }
}

export default function ParentPaymentsPage() {
  const [data, setData] = useState<ResponseData>({
    children: [],
    payments: [],
  })

  const [selectedChild, setSelectedChild] = useState("ALL")
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    async function loadPayments() {
      try {
        setLoading(true)
        setError("")

        const response = await fetch("/api/parent/payments", {
          cache: "no-store",
        })

        const result = await response.json()

        if (!response.ok) {
          throw new Error(
            result.error || "Gagal memuat riwayat pembayaran.",
          )
        }

        setData({
          children: result.children ?? [],
          payments: result.payments ?? [],
        })
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Terjadi kesalahan saat memuat pembayaran.",
        )
      } finally {
        setLoading(false)
      }
    }

    loadPayments()
  }, [])

  const filteredPayments = useMemo(() => {
    const keyword = search.trim().toLowerCase()

    return data.payments.filter((payment) => {
      const studentId = payment.bill?.student_id

      const matchesChild =
        selectedChild === "ALL" || studentId === selectedChild

      const matchesSearch =
        !keyword ||
        payment.transaction_id.toLowerCase().includes(keyword) ||
        payment.bill?.order_id.toLowerCase().includes(keyword) ||
        payment.bill?.student?.student_name
          .toLowerCase()
          .includes(keyword) ||
        formatMonth(payment.bill?.month_period)
          .toLowerCase()
          .includes(keyword)

      return matchesChild && matchesSearch
    })
  }, [data.payments, selectedChild, search])

  const summary = useMemo(() => {
    const successful = data.payments.filter((payment) => {
      const status = payment.transaction_status.toUpperCase()

      return (
        status === "SETTLEMENT" ||
        status === "CAPTURE" ||
        status === "PAID"
      )
    })

    const totalPaid = successful.reduce(
      (sum, payment) => sum + Number(payment.gross_amount || 0),
      0,
    )

    return {
      total: data.payments.length,
      successful: successful.length,
      totalPaid,
    }
  }, [data.payments])

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <p className="mb-2 text-sm font-semibold text-[#E53935]">
            KEUANGAN
          </p>

          <h1 className="text-2xl font-bold tracking-tight text-[#111827] sm:text-3xl">
            Riwayat Pembayaran
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Lihat seluruh riwayat pembayaran SPP anak.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <section className="mb-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
              <ReceiptText className="h-5 w-5 text-slate-700" />
            </div>

            <p className="text-sm text-slate-500">
              Total Transaksi
            </p>

            <p className="mt-1 text-2xl font-bold text-[#111827]">
              {summary.total}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>

            <p className="text-sm text-slate-500">
              Pembayaran Berhasil
            </p>

            <p className="mt-1 text-2xl font-bold text-[#111827]">
              {summary.successful}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-red-50">
              <CreditCard className="h-5 w-5 text-[#E53935]" />
            </div>

            <p className="text-sm text-slate-500">
              Total Pembayaran Berhasil
            </p>

            <p className="mt-1 text-lg font-bold text-[#111827]">
              {formatRupiah(summary.totalPaid)}
            </p>
          </div>
        </section>

        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-3 md:grid-cols-[220px_1fr]">
            <select
              value={selectedChild}
              onChange={(event) => setSelectedChild(event.target.value)}
              className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-[#E53935]"
            >
              <option value="ALL">Semua Anak</option>

              {data.children.map((child) => (
                <option key={child.id} value={child.id}>
                  {child.student_name}
                </option>
              ))}
            </select>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari transaksi, nomor tagihan, atau nama anak..."
                className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm outline-none focus:border-[#E53935]"
              />
            </div>
          </div>
        </section>

        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-[#111827]">
              Daftar Pembayaran
            </h2>

            <span className="text-sm text-slate-500">
              {filteredPayments.length} transaksi
            </span>
          </div>

          {loading ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
              Memuat riwayat pembayaran...
            </div>
          ) : filteredPayments.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
              <ReceiptText className="mx-auto h-10 w-10 text-slate-300" />

              <h3 className="mt-4 font-semibold text-[#111827]">
                Belum ada pembayaran
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Riwayat pembayaran SPP akan muncul di sini.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredPayments.map((payment) => {
                const status = getPaymentStatus(
                  payment.transaction_status,
                )

                const StatusIcon = status.icon

                return (
                  <div
                    key={payment.id}
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300"
                  >
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                      <div className="flex gap-4">
                        <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#111827] sm:flex">
                          <CreditCard className="h-5 w-5 text-white" />
                        </div>

                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-bold text-[#111827]">
                              {payment.bill?.student?.student_name ??
                                "Siswa"}
                            </h3>

                            <span
                              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${status.className}`}
                            >
                              <StatusIcon className="h-3.5 w-3.5" />
                              {status.label}
                            </span>
                          </div>

                          <p className="mt-1 text-sm text-slate-500">
                            SPP{" "}
                            {formatMonth(
                              payment.bill?.month_period,
                            )}
                          </p>

                          <p className="mt-2 text-xs text-slate-400">
                            {payment.transaction_id}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <div className="sm:text-right">
                          <p className="text-xs text-slate-500">
                            Nominal
                          </p>

                          <p className="text-lg font-bold text-[#111827]">
                            {formatRupiah(
                              Number(payment.gross_amount),
                            )}
                          </p>

                          <p className="mt-1 text-xs text-slate-400">
                            {formatDate(
                              payment.settlement_time ||
                                payment.transaction_time ||
                                payment.created_at,
                            )}
                          </p>
                        </div>

                        <Link
                          href={`/dashboard/parent/payments/${payment.id}`}
                          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#111827] px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
                        >
                          Detail
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}