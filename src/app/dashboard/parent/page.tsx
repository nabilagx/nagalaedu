'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  CalendarCheck,
  CheckCircle2,
  GraduationCap,
  Loader2,
  RefreshCw,
  UsersRound,
  Wallet,
} from 'lucide-react'

type Child = {
  id: string
  student_name: string
  grade_level: string
  school_name: string | null
  status: string

  academic: {
    class_count: number
    attendance_rate: number
    average_score: number
    total_grades: number
    needs_attention: boolean
  }

  attendance: {
    total: number
    hadir: number
    izin: number
    sakit: number
    alpha: number
  }

  classes: Array<{
    id: string
    class_name: string
    subject: string
    status: string
  }>

  finance: {
    id: string
    order_id: string
    month_period: string
    amount: number
    payment_status: string
    paid_at: string | null
  } | null
}

type Finance = {
  id: string
  student_id: string
  student_name: string
  month_period: string
  amount: number
  payment_status: string
  paid_at: string | null
  order_id: string
}

type DashboardData = {
  parent: {
    id: string
    full_name: string
    phone_number: string | null
  }

  summary: {
    total_children: number
    attendance_rate: number
    average_score: number
    unpaid_bills: number
    unpaid_amount: number
  }

  children: Child[]
  finance: Finance[]
}

function formatRupiah(value: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value)
}

function formatMonth(value: string) {
  return new Intl.DateTimeFormat('id-ID', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(`${value}T00:00:00`))
}

function paymentLabel(status: string) {
  switch (status) {
    case 'PAID':
      return 'Lunas'
    case 'PENDING':
      return 'Menunggu Pembayaran'
    case 'FAILED':
      return 'Gagal'
    case 'EXPIRED':
      return 'Kedaluwarsa'
    case 'CANCELLED':
      return 'Dibatalkan'
    default:
      return status
  }
}

export default function ParentDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

  async function loadDashboard(isRefresh = false) {
    try {
      setError('')

      if (isRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }

      const response = await fetch(
        '/api/parent/dashboard',
        {
          method: 'GET',
          cache: 'no-store',
        },
      )

      const result = await response.json()

      if (!response.ok) {
        throw new Error(
          result?.error ||
            'Gagal mengambil data dashboard.',
        )
      }

      setData(result)
    } catch (err) {
      console.error(err)

      setError(
        err instanceof Error
          ? err.message
          : 'Gagal mengambil data dashboard.',
      )
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadDashboard()
  }, [])

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-[#E53935]" />
          <p className="text-sm text-slate-500">
            Memuat dashboard...
          </p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />

              <div className="flex-1">
                <h2 className="font-bold text-red-900">
                  Dashboard gagal dimuat
                </h2>

                <p className="mt-1 text-sm text-red-700">
                  {error}
                </p>

                <button
                  type="button"
                  onClick={() => loadDashboard()}
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#E53935] px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
                >
                  <RefreshCw className="h-4 w-4" />
                  Coba Lagi
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!data) {
    return null
  }

  const firstName =
    data.parent.full_name?.split(' ')[0] ||
    'Bapak/Ibu'

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">

        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-[#E53935]">
              Portal Orang Tua
            </p>

            <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#111827] sm:text-3xl">
              Selamat datang, {firstName}
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Pantau perkembangan belajar dan pembayaran
              anak Anda.
            </p>
          </div>

          <button
            type="button"
            onClick={() => loadDashboard(true)}
            disabled={refreshing}
            className="inline-flex w-fit items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw
              className={`h-4 w-4 ${
                refreshing ? 'animate-spin' : ''
              }`}
            />
            Refresh
          </button>
        </div>

        {/* Summary */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

          <SummaryCard
            icon={UsersRound}
            label="Anak Terdaftar"
            value={String(data.summary.total_children)}
            description="Anak dalam sistem"
          />

          <SummaryCard
            icon={CalendarCheck}
            label="Kehadiran"
            value={`${data.summary.attendance_rate}%`}
            description="Persentase kehadiran"
          />

          <SummaryCard
            icon={GraduationCap}
            label="Rata-rata Nilai"
            value={
              data.summary.average_score > 0
                ? data.summary.average_score.toFixed(1)
                : '-'
            }
            description="Dari seluruh nilai"
          />

          <SummaryCard
            icon={Wallet}
            label="SPP Belum Lunas"
            value={String(data.summary.unpaid_bills)}
            description={
              data.summary.unpaid_amount > 0
                ? formatRupiah(
                    data.summary.unpaid_amount,
                  )
                : 'Tidak ada tunggakan'
            }
            danger={data.summary.unpaid_bills > 0}
          />

        </div>

        {/* Children */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-[#111827]">
                Anak Saya
              </h2>

              <p className="text-sm text-slate-500">
                Ringkasan perkembangan setiap anak.
              </p>
            </div>

            <Link
              href="/dashboard/parent/children"
              className="hidden items-center gap-1 text-sm font-semibold text-[#E53935] hover:underline sm:flex"
            >
              Lihat semua
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {data.children.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
              <UsersRound className="mx-auto h-10 w-10 text-slate-300" />

              <h3 className="mt-3 font-semibold text-slate-800">
                Belum ada data anak
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Belum ada siswa yang terhubung dengan akun
                orang tua ini.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {data.children.map((child) => (
                <ChildCard
                  key={child.id}
                  child={child}
                />
              ))}
            </div>
          )}
        </section>

        {/* Finance */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-[#111827]">
                SPP Bulan Berjalan
              </h2>

              <p className="text-sm text-slate-500">
                Status tagihan SPP anak Anda.
              </p>
            </div>

            <Link
              href="/dashboard/parent/finance"
              className="hidden items-center gap-1 text-sm font-semibold text-[#E53935] hover:underline sm:flex"
            >
              Lihat tagihan
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {data.finance.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <div className="flex items-center gap-3">
                <Wallet className="h-5 w-5 text-slate-400" />

                <div>
                  <p className="font-semibold text-slate-800">
                    Belum ada tagihan bulan ini
                  </p>

                  <p className="text-sm text-slate-500">
                    Tagihan SPP akan muncul setelah dibuat
                    oleh Founder.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <div className="divide-y divide-slate-100">
                {data.finance.map((bill) => (
                  <div
                    key={bill.id}
                    className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-semibold text-[#111827]">
                        {bill.student_name}
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
                        SPP {formatMonth(bill.month_period)}
                      </p>
                    </div>

                    <div className="flex items-center justify-between gap-4 sm:justify-end">
                      <div className="text-left sm:text-right">
                        <p className="font-bold text-[#111827]">
                          {formatRupiah(bill.amount)}
                        </p>

                        <PaymentStatus
                          status={bill.payment_status}
                        />
                      </div>

                      {bill.payment_status !==
                        'PAID' && (
                        <Link
                          href={`/dashboard/parent/finance/${bill.id}`}
                          className="rounded-lg bg-[#E53935] px-3 py-2 text-sm font-semibold text-white hover:bg-red-700"
                        >
                          Bayar
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

      </div>
    </div>
  )
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  description,
  danger = false,
}: {
  icon: typeof UsersRound
  label: string
  value: string
  description: string
  danger?: boolean
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-xl ${
            danger
              ? 'bg-red-50 text-[#E53935]'
              : 'bg-slate-100 text-[#111827]'
          }`}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>

      <p className="mt-4 text-sm font-medium text-slate-500">
        {label}
      </p>

      <p
        className={`mt-1 text-2xl font-bold ${
          danger ? 'text-[#E53935]' : 'text-[#111827]'
        }`}
      >
        {value}
      </p>

      <p className="mt-1 text-xs text-slate-400">
        {description}
      </p>
    </div>
  )
}

function ChildCard({
  child,
}: {
  child: Child
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

      <div className="border-b border-slate-100 p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#111827] text-white">
              <GraduationCap className="h-6 w-6" />
            </div>

            <div className="min-w-0">
              <h3 className="truncate font-bold text-[#111827]">
                {child.student_name}
              </h3>

              <p className="mt-0.5 text-sm text-slate-500">
                {child.grade_level}
                {child.school_name
                  ? ` • ${child.school_name}`
                  : ''}
              </p>
            </div>
          </div>

          {child.academic.needs_attention && (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-[#E53935]">
              <AlertCircle className="h-3.5 w-3.5" />
              Perlu perhatian
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 divide-x divide-slate-100">
        <div className="p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Kehadiran
          </p>

          <p className="mt-1 text-xl font-bold text-[#111827]">
            {child.academic.attendance_rate}%
          </p>

          <p className="mt-1 text-xs text-slate-500">
            {child.attendance.hadir} hadir
          </p>
        </div>

        <div className="p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Rata-rata Nilai
          </p>

          <p className="mt-1 text-xl font-bold text-[#111827]">
            {child.academic.average_score > 0
              ? child.academic.average_score.toFixed(1)
              : '-'}
          </p>

          <p className="mt-1 text-xs text-slate-500">
            {child.academic.total_grades} nilai
          </p>
        </div>
      </div>

      <div className="border-t border-slate-100 p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-slate-400" />

            <span className="text-sm font-semibold text-slate-700">
              Kelas Aktif
            </span>
          </div>

          <span className="text-sm font-bold text-[#111827]">
            {child.academic.class_count}
          </span>
        </div>

        {child.classes.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {child.classes.slice(0, 3).map((item) => (
              <span
                key={item.id}
                className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-600"
              >
                {item.subject}
              </span>
            ))}

            {child.classes.length > 3 && (
              <span className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-500">
                +{child.classes.length - 3} lainnya
              </span>
            )}
          </div>
        )}
      </div>

      <div className="border-t border-slate-100 bg-slate-50 p-4">
        <Link
          href={`/dashboard/parent/children/${child.id}`}
          className="flex items-center justify-between text-sm font-semibold text-[#E53935] hover:underline"
        >
          <span>Lihat perkembangan anak</span>
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

    </div>
  )
}

function PaymentStatus({
  status,
}: {
  status: string
}) {
  const paid = status === 'PAID'

  return (
    <span
      className={`mt-1 inline-flex items-center gap-1 text-xs font-semibold ${
        paid
          ? 'text-emerald-600'
          : 'text-[#E53935]'
      }`}
    >
      {paid ? (
        <CheckCircle2 className="h-3.5 w-3.5" />
      ) : (
        <AlertCircle className="h-3.5 w-3.5" />
      )}

      {paymentLabel(status)}
    </span>
  )
}