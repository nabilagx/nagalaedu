"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  ReceiptText,
  Search,
  WalletCards,
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
  payment_status: string
  snap_token: string | null
  paid_at: string | null
  created_at: string
  updated_at: string
  student: Child | null
}

type FinanceResponse = {
  children: Child[]
  bills: Bill[]
}

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value)
}

function formatMonth(value: string) {
  const date = new Date(`${value}T00:00:00`)

  return new Intl.DateTimeFormat("id-ID", {
    month: "long",
    year: "numeric",
  }).format(date)
}

function getStatus(status: string) {
  const normalized = status.toUpperCase()

  if (normalized === "PAID") {
    return {
      label: "Lunas",
      className: "bg-emerald-50 text-emerald-700 border-emerald-200",
      icon: CheckCircle2,
    }
  }

  if (normalized === "FAILED" || normalized === "EXPIRED") {
    return {
      label: normalized === "FAILED" ? "Gagal" : "Kedaluwarsa",
      className: "bg-red-50 text-red-700 border-red-200",
      icon: XCircle,
    }
  }

  return {
    label: "Belum Dibayar",
    className: "bg-amber-50 text-amber-700 border-amber-200",
    icon: CreditCard,
  }
}

export default function ParentFinancePage() {
  const [data, setData] = useState<FinanceResponse>({
    children: [],
    bills: [],
  })

  const [selectedChild, setSelectedChild] = useState("ALL")
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    async function loadFinance() {
      try {
        setLoading(true)
        setError("")

        const response = await fetch("/api/parent/finance", {
          cache: "no-store",
        })

        const result = await response.json()

        if (!response.ok) {
          throw new Error(result.error || "Gagal memuat tagihan SPP")
        }

        setData({
          children: result.children ?? [],
          bills: result.bills ?? [],
        })
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

    loadFinance()
  }, [])

  const filteredBills = useMemo(() => {
    const keyword = search.trim().toLowerCase()

    return data.bills.filter((bill) => {
      const matchesChild =
        selectedChild === "ALL" || bill.student_id === selectedChild

      const matchesSearch =
        !keyword ||
        bill.student?.student_name.toLowerCase().includes(keyword) ||
        bill.order_id.toLowerCase().includes(keyword) ||
        formatMonth(bill.month_period).toLowerCase().includes(keyword)

      return matchesChild && matchesSearch
    })
  }, [data.bills, selectedChild, search])

  const summary = useMemo(() => {
    const total = data.bills.length

    const paid = data.bills.filter(
      (bill) => bill.payment_status.toUpperCase() === "PAID",
    ).length

    const unpaid = data.bills.filter(
      (bill) => bill.payment_status.toUpperCase() !== "PAID",
    ).length

    const totalAmount = data.bills.reduce(
      (sum, bill) => sum + Number(bill.amount || 0),
      0,
    )

    return {
      total,
      paid,
      unpaid,
      totalAmount,
    }
  }, [data.bills])

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <p className="mb-2 text-sm font-semibold text-[#E53935]">
            KEUANGAN
          </p>

          <h1 className="text-2xl font-bold tracking-tight text-[#111827] sm:text-3xl">
            Tagihan SPP
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Pantau tagihan SPP anak dan lakukan pembayaran dengan aman.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
              <ReceiptText className="h-5 w-5 text-slate-700" />
            </div>

            <p className="text-sm text-slate-500">Total Tagihan</p>
            <p className="mt-1 text-2xl font-bold text-[#111827]">
              {summary.total}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>

            <p className="text-sm text-slate-500">Sudah Lunas</p>
            <p className="mt-1 text-2xl font-bold text-[#111827]">
              {summary.paid}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50">
              <WalletCards className="h-5 w-5 text-amber-600" />
            </div>

            <p className="text-sm text-slate-500">Belum Dibayar</p>
            <p className="mt-1 text-2xl font-bold text-[#111827]">
              {summary.unpaid}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-red-50">
              <CreditCard className="h-5 w-5 text-[#E53935]" />
            </div>

            <p className="text-sm text-slate-500">Total Nilai Tagihan</p>
            <p className="mt-1 text-lg font-bold text-[#111827]">
              {formatRupiah(summary.totalAmount)}
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
                placeholder="Cari nama anak, periode, atau nomor tagihan..."
                className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm outline-none focus:border-[#E53935]"
              />
            </div>
          </div>
        </section>

        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-[#111827]">
              Daftar Tagihan
            </h2>

            <span className="text-sm text-slate-500">
              {filteredBills.length} tagihan
            </span>
          </div>

          {loading ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
              Memuat tagihan...
            </div>
          ) : filteredBills.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
              <ReceiptText className="mx-auto h-10 w-10 text-slate-300" />

              <h3 className="mt-4 font-semibold text-[#111827]">
                Belum ada tagihan
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Tidak ditemukan tagihan SPP yang sesuai.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredBills.map((bill) => {
                const status = getStatus(bill.payment_status)
                const StatusIcon = status.icon

                return (
                  <div
                    key={bill.id}
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300"
                  >
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                      <div className="flex gap-4">
                        <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#111827] sm:flex">
                          <ReceiptText className="h-5 w-5 text-white" />
                        </div>

                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-bold text-[#111827]">
                              {bill.student?.student_name ?? "Siswa"}
                            </h3>

                            <span
                              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${status.className}`}
                            >
                              <StatusIcon className="h-3.5 w-3.5" />
                              {status.label}
                            </span>
                          </div>

                          <p className="mt-1 text-sm text-slate-500">
                            SPP {formatMonth(bill.month_period)}
                          </p>

                          <p className="mt-2 text-xs text-slate-400">
                            {bill.order_id}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <div className="sm:text-right">
                          <p className="text-xs text-slate-500">Jumlah</p>

                          <p className="text-lg font-bold text-[#111827]">
                            {formatRupiah(Number(bill.amount))}
                          </p>

                          {bill.paid_at && (
                            <p className="mt-1 text-xs text-emerald-600">
                              Dibayar{" "}
                              {new Intl.DateTimeFormat("id-ID", {
                                dateStyle: "medium",
                              }).format(new Date(bill.paid_at))}
                            </p>
                          )}
                        </div>

                        <Link
                          href={`/dashboard/parent/finance/${bill.id}`}
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