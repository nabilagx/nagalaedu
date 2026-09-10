"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  BarChart3,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  Download,
  FileText,
  GraduationCap,
  Loader2,
  RefreshCw,
  Users,
  Wallet,
  XCircle,
} from "lucide-react"

type ReportData = {
  period: string

  academic: {
    total_students: number
    active_students: number
    inactive_students: number
    total_classes: number
    total_enrollments: number
    total_tutors?: number
    total_parents?: number
    total_founders?: number
    average_grade: number
    attendance_rate: number
    students_need_attention: number
  }

  attendance: {
    total_records: number
    hadir: number
    izin: number
    sakit: number
    alpha: number
    attendance_rate: number
  }

  finance: {
    total_bills: number
    paid_bills: number
    pending_bills: number
    failed_bills: number
    expired_bills: number
    cancelled_bills: number
    total_billed: number
    total_paid: number
    total_unpaid: number
  }

  transactions: {
    total_transactions: number
    successful_transactions: number
    failed_transactions: number
    pending_transactions: number
    total_amount: number
  }

  payment_methods: Array<{
    payment_type: string
    transaction_count: number
    total_amount: number
  }>

  classes: Array<{
    id: string
    className: string
    subject: string
    status: string
    studentCount: number
    attendanceRate: number
    averageScore: number
  }>

  student_finance: Array<{
    student_id: string
    student_name: string
    grade_level: string
    school_name: string
    payment_status: string
    amount: number
    paid_at: string | null
  }>
}

function safeNumber(value: number | null | undefined) {
  return Number(value) || 0
}

function safeFixed(
  value: number | null | undefined,
  digits = 1,
) {
  return safeNumber(value).toFixed(digits)
}

function formatRupiah(value: number | null | undefined) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(safeNumber(value))
}

function formatDate(value: string | null | undefined) {
  if (!value) return "-"

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return "-"

  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

function formatMonth(value: string) {
  if (!value) return "-"

  const date = new Date(`${value}-01T00:00:00`)

  if (Number.isNaN(date.getTime())) return value

  return date.toLocaleDateString("id-ID", {
    month: "long",
    year: "numeric",
  })
}

function statusLabel(status: string) {
  const normalized = String(status || "").toUpperCase()

  switch (normalized) {
    case "PAID":
    case "SETTLEMENT":
    case "CAPTURE":
      return "Lunas"

    case "PENDING":
      return "Menunggu"

    case "FAILED":
      return "Gagal"

    case "EXPIRED":
      return "Kadaluarsa"

    case "CANCELLED":
      return "Dibatalkan"

    case "ACTIVE":
      return "Aktif"

    case "INACTIVE":
      return "Tidak Aktif"

    default:
      return status || "-"
  }
}

function statusClass(status: string) {
  const normalized = String(status || "").toUpperCase()

  if (
    normalized === "PAID" ||
    normalized === "SETTLEMENT" ||
    normalized === "CAPTURE" ||
    normalized === "ACTIVE"
  ) {
    return "bg-emerald-50 text-emerald-700 border-emerald-200"
  }

  if (normalized === "PENDING") {
    return "bg-amber-50 text-amber-700 border-amber-200"
  }

  if (
    normalized === "FAILED" ||
    normalized === "EXPIRED" ||
    normalized === "CANCELLED" ||
    normalized === "INACTIVE"
  ) {
    return "bg-red-50 text-red-700 border-red-200"
  }

  return "bg-gray-50 text-gray-700 border-gray-200"
}

function Card({
  title,
  value,
  icon,
  description,
}: {
  title: string
  value: string
  icon: React.ReactNode
  description?: string
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-gray-500">
            {title}
          </p>

          <p className="mt-2 text-2xl font-bold text-gray-900">
            {value}
          </p>

          {description && (
            <p className="mt-1 text-xs text-gray-500">
              {description}
            </p>
          )}
        </div>

        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gray-900 text-white">
          {icon}
        </div>
      </div>
    </div>
  )
}

export default function FounderReportsPage() {
  const [month, setMonth] = useState(() => {
    const now = new Date()

    return `${now.getFullYear()}-${String(
      now.getMonth() + 1,
    ).padStart(2, "0")}`
  })

  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState("")

  async function loadReport() {
    try {
      setLoading(true)
      setError("")

      const response = await fetch(
        `/api/founder/reports?month=${month}`,
        {
          cache: "no-store",
        },
      )

      const result = await response.json()

      if (!response.ok) {
        throw new Error(
          result?.message ||
            "Gagal mengambil data laporan.",
        )
      }

      setData(result)
    } catch (err) {
      console.error(err)

      setError(
        err instanceof Error
          ? err.message
          : "Gagal mengambil data laporan.",
      )

      setData(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadReport()
  }, [month])

  function handleExportPDF() {
    setExporting(true)

    window.location.href =
      `/api/founder/reports?month=${month}&export=pdf`

    setTimeout(() => {
      setExporting(false)
    }, 3000)
  }

  function handleExportCSV() {
    window.location.href =
      `/api/founder/reports?month=${month}&export=csv`
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">

        {/* HEADER */}
        <div className="mb-6">
          <Link
            href="/dashboard/founder"
            className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-gray-500 transition hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali ke Dashboard
          </Link>

          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-900 text-white">
                  <FileText className="h-6 w-6" />
                </div>

                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    Laporan
                  </h1>

                  <p className="text-sm text-gray-500">
                    Rekap akademik, kehadiran, dan keuangan NAGALA Education
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleExportCSV}
                disabled={loading || !data}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Download className="h-4 w-4" />
                Export CSV
              </button>

              <button
                type="button"
                onClick={handleExportPDF}
                disabled={loading || !data || exporting}
                className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {exporting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}

                {exporting
                  ? "Membuat PDF..."
                  : "Export PDF"}
              </button>
            </div>
          </div>
        </div>

        {/* FILTER */}
        <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label
                htmlFor="report-month"
                className="mb-1.5 block text-sm font-semibold text-gray-700"
              >
                Periode Laporan
              </label>

              <div className="relative">
                <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />

                <input
                  id="report-month"
                  type="month"
                  value={month}
                  onChange={(event) =>
                    setMonth(event.target.value)
                  }
                  className="w-full rounded-xl border border-gray-300 bg-white py-2.5 pl-10 pr-3 text-sm text-gray-900 outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10 sm:max-w-xs"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={loadReport}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw
                className={`h-4 w-4 ${
                  loading ? "animate-spin" : ""
                }`}
              />
              Refresh
            </button>
          </div>
        </div>

        {/* ERROR */}
        {error && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <div className="flex items-start gap-3">
              <XCircle className="mt-0.5 h-5 w-5 shrink-0" />

              <div>
                <p className="font-semibold">
                  Gagal memuat laporan
                </p>

                <p className="mt-1">
                  {error}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* LOADING */}
        {loading && (
          <div className="flex min-h-[400px] items-center justify-center rounded-2xl border border-gray-200 bg-white">
            <div className="text-center">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-gray-900" />

              <p className="mt-3 text-sm font-medium text-gray-600">
                Menyiapkan laporan...
              </p>
            </div>
          </div>
        )}

        {/* CONTENT */}
        {!loading && data && (
          <div className="space-y-6">

            {/* PERIOD */}
            <div className="rounded-2xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Periode
                  </p>

                  <h2 className="mt-1 text-lg font-bold text-gray-900">
                    Laporan {formatMonth(month)}
                  </h2>
                </div>

                <div className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-semibold text-gray-600">
                  NAGALA EDUCATION
                </div>
              </div>
            </div>

            {/* OVERVIEW */}
            <section>
              <div className="mb-3 flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-gray-700" />

                <h2 className="text-lg font-bold text-gray-900">
                  Ringkasan Utama
                </h2>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Card
                  title="Total Siswa"
                  value={String(
                    safeNumber(
                      data.academic.total_students,
                    ),
                  )}
                  icon={<Users className="h-5 w-5" />}
                  description={`${safeNumber(
                    data.academic.active_students,
                  )} siswa aktif`}
                />

                <Card
                  title="Rata-rata Nilai"
                  value={safeFixed(
                    data.academic.average_grade,
                    1,
                  )}
                  icon={<GraduationCap className="h-5 w-5" />}
                  description="Dari seluruh nilai tersimpan"
                />

                <Card
                  title="Kehadiran"
                  value={`${safeFixed(
                    data.academic.attendance_rate,
                    1,
                  )}%`}
                  icon={<CheckCircle2 className="h-5 w-5" />}
                  description="Persentase kehadiran"
                />

                <Card
                  title="Total Pembayaran"
                  value={formatRupiah(
                    data.finance.total_paid,
                  )}
                  icon={<Wallet className="h-5 w-5" />}
                  description={`${safeNumber(
                    data.transactions.successful_transactions,
                  )} transaksi berhasil`}
                />
              </div>
            </section>

            {/* ACADEMIC */}
            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100">
                  <BookOpen className="h-5 w-5 text-gray-700" />
                </div>

                <div>
                  <h2 className="font-bold text-gray-900">
                    Akademik
                  </h2>

                  <p className="text-sm text-gray-500">
                    Ringkasan kondisi akademik siswa
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl bg-gray-50 p-4">
                  <p className="text-xs text-gray-500">
                    Siswa Aktif
                  </p>

                  <p className="mt-1 text-xl font-bold text-gray-900">
                    {safeNumber(
                      data.academic.active_students,
                    )}
                  </p>
                </div>

                <div className="rounded-xl bg-gray-50 p-4">
                  <p className="text-xs text-gray-500">
                    Siswa Tidak Aktif
                  </p>

                  <p className="mt-1 text-xl font-bold text-gray-900">
                    {safeNumber(
                      data.academic.inactive_students,
                    )}
                  </p>
                </div>

                <div className="rounded-xl bg-gray-50 p-4">
                  <p className="text-xs text-gray-500">
                    Total Kelas
                  </p>

                  <p className="mt-1 text-xl font-bold text-gray-900">
                    {safeNumber(
                      data.academic.total_classes,
                    )}
                  </p>
                </div>

                <div className="rounded-xl bg-gray-50 p-4">
                  <p className="text-xs text-gray-500">
                    Perlu Perhatian
                  </p>

                  <p className="mt-1 text-xl font-bold text-red-600">
                    {safeNumber(
                      data.academic.students_need_attention,
                    )}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <div className="rounded-xl border border-gray-200 p-4">
                  <p className="text-xs text-gray-500">
                    Rata-rata Nilai
                  </p>

                  <p className="mt-1 text-xl font-bold">
                    {safeFixed(
                      data.academic.average_grade,
                      1,
                    )}
                  </p>
                </div>

                <div className="rounded-xl border border-gray-200 p-4">
                  <p className="text-xs text-gray-500">
                    Kehadiran
                  </p>

                  <p className="mt-1 text-xl font-bold">
                    {safeFixed(
                      data.academic.attendance_rate,
                      1,
                    )}
                    %
                  </p>
                </div>

                <div className="rounded-xl border border-gray-200 p-4">
                  <p className="text-xs text-gray-500">
                    Total Enrollment
                  </p>

                  <p className="mt-1 text-xl font-bold">
                    {safeNumber(
                      data.academic.total_enrollments,
                    )}
                  </p>
                </div>
              </div>
            </section>

            {/* ATTENDANCE */}
            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100">
                  <CalendarDays className="h-5 w-5 text-gray-700" />
                </div>

                <div>
                  <h2 className="font-bold text-gray-900">
                    Kehadiran
                  </h2>

                  <p className="text-sm text-gray-500">
                    Rekap seluruh catatan kehadiran
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                <div className="rounded-xl border border-gray-200 p-4">
                  <p className="text-xs text-gray-500">
                    Total
                  </p>

                  <p className="mt-1 text-xl font-bold">
                    {safeNumber(
                      data.attendance.total_records,
                    )}
                  </p>
                </div>

                <div className="rounded-xl bg-emerald-50 p-4">
                  <p className="text-xs text-emerald-700">
                    Hadir
                  </p>

                  <p className="mt-1 text-xl font-bold text-emerald-700">
                    {safeNumber(
                      data.attendance.hadir,
                    )}
                  </p>
                </div>

                <div className="rounded-xl bg-blue-50 p-4">
                  <p className="text-xs text-blue-700">
                    Izin
                  </p>

                  <p className="mt-1 text-xl font-bold text-blue-700">
                    {safeNumber(
                      data.attendance.izin,
                    )}
                  </p>
                </div>

                <div className="rounded-xl bg-amber-50 p-4">
                  <p className="text-xs text-amber-700">
                    Sakit
                  </p>

                  <p className="mt-1 text-xl font-bold text-amber-700">
                    {safeNumber(
                      data.attendance.sakit,
                    )}
                  </p>
                </div>

                <div className="rounded-xl bg-red-50 p-4">
                  <p className="text-xs text-red-700">
                    Alpha
                  </p>

                  <p className="mt-1 text-xl font-bold text-red-700">
                    {safeNumber(
                      data.attendance.alpha,
                    )}
                  </p>
                </div>
              </div>

              <div className="mt-5">
                <div className="mb-2 flex justify-between text-sm">
                  <span className="font-medium text-gray-600">
                    Tingkat Kehadiran
                  </span>

                  <span className="font-bold text-gray-900">
                    {safeFixed(
                      data.attendance.attendance_rate,
                      1,
                    )}
                    %
                  </span>
                </div>

                <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full bg-gray-900 transition-all"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.max(
                          0,
                          safeNumber(
                            data.attendance
                              .attendance_rate,
                          ),
                        ),
                      )}%`,
                    }}
                  />
                </div>
              </div>
            </section>

            {/* FINANCE */}
            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100">
                  <Wallet className="h-5 w-5 text-gray-700" />
                </div>

                <div>
                  <h2 className="font-bold text-gray-900">
                    Keuangan
                  </h2>

                  <p className="text-sm text-gray-500">
                    Rekap tagihan SPP dan pembayaran
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border border-gray-200 p-4">
                  <p className="text-xs text-gray-500">
                    Total Tagihan
                  </p>

                  <p className="mt-1 text-xl font-bold">
                    {safeNumber(
                      data.finance.total_bills,
                    )}
                  </p>

                  <p className="mt-1 text-xs text-gray-500">
                    {formatRupiah(
                      data.finance.total_billed,
                    )}
                  </p>
                </div>

                <div className="rounded-xl bg-emerald-50 p-4">
                  <p className="text-xs text-emerald-700">
                    Lunas
                  </p>

                  <p className="mt-1 text-xl font-bold text-emerald-700">
                    {safeNumber(
                      data.finance.paid_bills,
                    )}
                  </p>

                  <p className="mt-1 text-xs text-emerald-700">
                    {formatRupiah(
                      data.finance.total_paid,
                    )}
                  </p>
                </div>

                <div className="rounded-xl bg-amber-50 p-4">
                  <p className="text-xs text-amber-700">
                    Menunggu
                  </p>

                  <p className="mt-1 text-xl font-bold text-amber-700">
                    {safeNumber(
                      data.finance.pending_bills,
                    )}
                  </p>

                  <p className="mt-1 text-xs text-amber-700">
                    Belum dibayar
                  </p>
                </div>

                <div className="rounded-xl bg-red-50 p-4">
                  <p className="text-xs text-red-700">
                    Belum Lunas
                  </p>

                  <p className="mt-1 text-xl font-bold text-red-700">
                    {formatRupiah(
                      data.finance.total_unpaid,
                    )}
                  </p>
                </div>
              </div>
            </section>

            {/* TRANSACTIONS */}
            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100">
                  <CreditCard className="h-5 w-5 text-gray-700" />
                </div>

                <div>
                  <h2 className="font-bold text-gray-900">
                    Transaksi
                  </h2>

                  <p className="text-sm text-gray-500">
                    Rekap pembayaran yang diproses
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border border-gray-200 p-4">
                  <p className="text-xs text-gray-500">
                    Total Transaksi
                  </p>

                  <p className="mt-1 text-xl font-bold">
                    {safeNumber(
                      data.transactions.total_transactions,
                    )}
                  </p>
                </div>

                <div className="rounded-xl bg-emerald-50 p-4">
                  <p className="text-xs text-emerald-700">
                    Berhasil
                  </p>

                  <p className="mt-1 text-xl font-bold text-emerald-700">
                    {safeNumber(
                      data.transactions
                        .successful_transactions,
                    )}
                  </p>
                </div>

                <div className="rounded-xl bg-red-50 p-4">
                  <p className="text-xs text-red-700">
                    Gagal
                  </p>

                  <p className="mt-1 text-xl font-bold text-red-700">
                    {safeNumber(
                      data.transactions
                        .failed_transactions,
                    )}
                  </p>
                </div>

                <div className="rounded-xl border border-gray-200 p-4">
                  <p className="text-xs text-gray-500">
                    Nilai Transaksi
                  </p>

                  <p className="mt-1 text-xl font-bold">
                    {formatRupiah(
                      data.transactions.total_amount,
                    )}
                  </p>
                </div>
              </div>
            </section>

            {/* PAYMENT METHODS */}
            {data.payment_methods.length > 0 && (
              <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="mb-5">
                  <h2 className="font-bold text-gray-900">
                    Metode Pembayaran
                  </h2>

                  <p className="text-sm text-gray-500">
                    Distribusi transaksi berdasarkan metode pembayaran
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[600px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
                        <th className="px-3 py-3">
                          Metode
                        </th>

                        <th className="px-3 py-3 text-right">
                          Transaksi
                        </th>

                        <th className="px-3 py-3 text-right">
                          Total
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {data.payment_methods.map(
                        (item) => (
                          <tr
                            key={
                              item.payment_type
                            }
                            className="border-b border-gray-100 last:border-0"
                          >
                            <td className="px-3 py-3 font-medium text-gray-900">
                              {item.payment_type ||
                                "Tidak diketahui"}
                            </td>

                            <td className="px-3 py-3 text-right text-gray-600">
                              {safeNumber(
                                item.transaction_count,
                              )}
                            </td>

                            <td className="px-3 py-3 text-right font-semibold text-gray-900">
                              {formatRupiah(
                                item.total_amount,
                              )}
                            </td>
                          </tr>
                        ),
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* CLASS PERFORMANCE */}
            {data.classes.length > 0 && (
              <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="mb-5">
                  <h2 className="font-bold text-gray-900">
                    Performa Kelas
                  </h2>

                  <p className="text-sm text-gray-500">
                    Rekap jumlah siswa, kehadiran, dan nilai
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[850px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
                        <th className="px-3 py-3">
                          Kelas
                        </th>

                        <th className="px-3 py-3">
                          Mata Pelajaran
                        </th>

                        <th className="px-3 py-3">
                          Status
                        </th>

                        <th className="px-3 py-3 text-right">
                          Siswa
                        </th>

                        <th className="px-3 py-3 text-right">
                          Kehadiran
                        </th>

                        <th className="px-3 py-3 text-right">
                          Rata-rata
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {data.classes.map(
                        (item) => (
                          <tr
                            key={item.id}
                            className="border-b border-gray-100 last:border-0"
                          >
                            <td className="px-3 py-3 font-semibold text-gray-900">
                              {item.className ||
                                "-"}
                            </td>

                            <td className="px-3 py-3 text-gray-600">
                              {item.subject ||
                                "-"}
                            </td>

                            <td className="px-3 py-3">
                              <span
                                className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClass(
                                  item.status,
                                )}`}
                              >
                                {statusLabel(
                                  item.status,
                                )}
                              </span>
                            </td>

                            <td className="px-3 py-3 text-right text-gray-600">
                              {safeNumber(
                                item.studentCount,
                              )}
                            </td>

                            <td className="px-3 py-3 text-right font-medium text-gray-900">
                              {safeFixed(
                                item.attendanceRate,
                                1,
                              )}
                              %
                            </td>

                            <td className="px-3 py-3 text-right font-medium text-gray-900">
                              {safeFixed(
                                item.averageScore,
                                1,
                              )}
                            </td>
                          </tr>
                        ),
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* STUDENT FINANCE */}
            {data.student_finance.length > 0 && (
              <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="mb-5">
                  <h2 className="font-bold text-gray-900">
                    Status Pembayaran Siswa
                  </h2>

                  <p className="text-sm text-gray-500">
                    Detail status SPP masing-masing siswa pada periode laporan
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[850px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
                        <th className="px-3 py-3">
                          Siswa
                        </th>

                        <th className="px-3 py-3">
                          Jenjang
                        </th>

                        <th className="px-3 py-3">
                          Sekolah
                        </th>

                        <th className="px-3 py-3">
                          Status
                        </th>

                        <th className="px-3 py-3 text-right">
                          Nominal
                        </th>

                        <th className="px-3 py-3">
                          Dibayar
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {data.student_finance.map(
                        (item) => (
                          <tr
                            key={
                              item.student_id
                            }
                            className="border-b border-gray-100 last:border-0"
                          >
                            <td className="px-3 py-3 font-semibold text-gray-900">
                              {item.student_name ||
                                "-"}
                            </td>

                            <td className="px-3 py-3 text-gray-600">
                              {item.grade_level ||
                                "-"}
                            </td>

                            <td className="px-3 py-3 text-gray-600">
                              {item.school_name ||
                                "-"}
                            </td>

                            <td className="px-3 py-3">
                              <span
                                className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClass(
                                  item.payment_status,
                                )}`}
                              >
                                {statusLabel(
                                  item.payment_status,
                                )}
                              </span>
                            </td>

                            <td className="px-3 py-3 text-right font-medium text-gray-900">
                              {formatRupiah(
                                item.amount,
                              )}
                            </td>

                            <td className="px-3 py-3 text-gray-600">
                              {formatDate(
                                item.paid_at,
                              )}
                            </td>
                          </tr>
                        ),
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* FOOT NOTE */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5 text-sm text-gray-500 shadow-sm">
              <p>
                Laporan ini merupakan rekapitulasi data yang
                tersedia pada sistem NAGALA Education.
                Data akademik menggunakan seluruh data akademik
                yang tersimpan, sedangkan data SPP dan transaksi
                mengikuti periode laporan yang dipilih.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}