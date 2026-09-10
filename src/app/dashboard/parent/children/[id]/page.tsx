'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  CalendarCheck,
  CheckCircle2,
  GraduationCap,
  Loader2,
  RefreshCw,
  School,
  Wallet,
} from 'lucide-react'

type ChildDetail = {
  parent: {
    id: string
    full_name: string
  }

  student: {
    id: string
    student_name: string
    grade_level: string
    school_name: string | null
    phone_number: string | null
    status: string
    created_at: string
  }

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
    attendance_rate: number
  }

  classes: Array<{
    enrollment_id: string
    class_id: string
    class_name: string
    subject: string
    status: string
  }>

  grades: Array<{
    enrollment_id: string
    subject: string
    score: number | null
  }>

  finance: Array<{
    id: string
    order_id: string
    month_period: string
    amount: number
    payment_status: string
    paid_at: string | null
  }>
}

function formatRupiah(
  value: number,
) {
  return new Intl.NumberFormat(
    'id-ID',
    {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    },
  ).format(value)
}

function formatMonth(
  value: string,
) {
  return new Intl.DateTimeFormat(
    'id-ID',
    {
      month: 'long',
      year: 'numeric',
    },
  ).format(
    new Date(
      `${value}T00:00:00`,
    ),
  )
}

function paymentLabel(
  status: string,
) {
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

export default function ChildDetailPage() {
  const [data, setData] =
    useState<ChildDetail | null>(
      null,
    )

  const [loading, setLoading] =
    useState(true)

  const [refreshing, setRefreshing] =
    useState(false)

  const [error, setError] =
    useState('')

  async function loadDetail(
    isRefresh = false,
  ) {
    try {
      setError('')

      if (isRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }

      /*
       * Ambil ID langsung dari URL
       */
      const id =
        window.location.pathname
          .split('/')
          .filter(Boolean)
          .pop()

      if (!id) {
        throw new Error(
          'ID anak tidak ditemukan.',
        )
      }

      const response =
        await fetch(
          `/api/parent/children/${id}`,
          {
            method: 'GET',
            cache: 'no-store',
          },
        )

      const result =
        await response.json()

      if (!response.ok) {
        throw new Error(
          result?.error ||
            'Gagal mengambil detail anak.',
        )
      }

      setData(result)
    } catch (err) {
      console.error(err)

      setError(
        err instanceof Error
          ? err.message
          : 'Gagal mengambil detail anak.',
      )
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadDetail()
  }, [])

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-[#E53935]" />

          <p className="text-sm text-slate-500">
            Memuat detail anak...
          </p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-4xl">
          <Link
            href="/dashboard/parent/children"
            className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-[#E53935]"
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali ke Anak Saya
          </Link>

          <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />

              <div>
                <h2 className="font-bold text-red-900">
                  Data tidak dapat diakses
                </h2>

                <p className="mt-1 text-sm text-red-700">
                  {error}
                </p>

                <button
                  type="button"
                  onClick={() =>
                    loadDetail()
                  }
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

  const child =
    data.student

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">

        {/* Header */}
        <div>
          <Link
            href="/dashboard/parent/children"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-[#E53935]"
          >
            <ArrowLeft className="h-4 w-4" />
            Anak Saya
          </Link>

          <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#111827] text-white">
                <GraduationCap className="h-7 w-7" />
              </div>

              <div>
                <h1 className="text-2xl font-bold text-[#111827]">
                  {child.student_name}
                </h1>

                <p className="mt-1 text-sm text-slate-500">
                  {child.grade_level}
                  {child.school_name
                    ? ` • ${child.school_name}`
                    : ''}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                loadDetail(true)
              }
              disabled={refreshing}
              className="inline-flex w-fit items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60"
            >
              <RefreshCw
                className={
                  refreshing
                    ? 'h-4 w-4 animate-spin'
                    : 'h-4 w-4'
                }
              />

              Refresh
            </button>
          </div>
        </div>

        {/* Attention */}
        {data.academic
          .needs_attention && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-[#E53935]" />

              <div>
                <p className="font-semibold text-red-900">
                  Perlu perhatian
                </p>

                <p className="mt-1 text-sm text-red-700">
                  Terdapat indikator
                  akademik atau kehadiran
                  yang perlu dipantau.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Summary */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

          <SummaryCard
            icon={BookOpen}
            label="Kelas Aktif"
            value={String(
              data.academic
                .class_count,
            )}
          />

          <SummaryCard
            icon={CalendarCheck}
            label="Kehadiran"
            value={`${data.academic.attendance_rate}%`}
          />

          <SummaryCard
            icon={GraduationCap}
            label="Rata-rata Nilai"
            value={
              data.academic
                .average_score > 0
                ? data.academic.average_score.toFixed(
                    1,
                  )
                : '-'
            }
          />

          <SummaryCard
            icon={Wallet}
            label="Tagihan SPP"
            value={String(
              data.finance.length,
            )}
          />

        </div>

        {/* Identity */}
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-5">
            <h2 className="font-bold text-[#111827]">
              Informasi Siswa
            </h2>
          </div>

          <div className="grid gap-5 p-5 sm:grid-cols-2 lg:grid-cols-3">
            <InfoItem
              label="Nama"
              value={
                child.student_name
              }
            />

            <InfoItem
              label="Jenjang"
              value={
                child.grade_level
              }
            />

            <InfoItem
              label="Sekolah"
              value={
                child.school_name ??
                '-'
              }
            />

            <InfoItem
              label="Nomor Telepon"
              value={
                child.phone_number ??
                '-'
              }
            />

            <InfoItem
              label="Status"
              value={
                child.status ===
                'ACTIVE'
                  ? 'Aktif'
                  : child.status
              }
            />
          </div>
        </section>

        {/* Classes */}
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-5">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-[#E53935]" />

              <h2 className="font-bold text-[#111827]">
                Kelas Aktif
              </h2>
            </div>
          </div>

          {data.classes.length ===
          0 ? (
            <div className="p-6 text-center text-sm text-slate-500">
              Belum ada kelas aktif.
            </div>
          ) : (
            <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3">
              {data.classes.map(
                (item) => (
                  <div
                    key={
                      item.enrollment_id
                    }
                    className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <p className="font-semibold text-[#111827]">
                      {item.class_name}
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      {item.subject}
                    </p>
                  </div>
                ),
              )}
            </div>
          )}
        </section>

        {/* Attendance */}
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-5">
            <div className="flex items-center gap-2">
              <CalendarCheck className="h-5 w-5 text-[#E53935]" />

              <h2 className="font-bold text-[#111827]">
                Kehadiran
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-2 divide-x divide-y divide-slate-100 sm:grid-cols-5 sm:divide-y-0">
            <AttendanceStat
              label="Hadir"
              value={
                data.attendance
                  .hadir
              }
            />

            <AttendanceStat
              label="Izin"
              value={
                data.attendance
                  .izin
              }
            />

            <AttendanceStat
              label="Sakit"
              value={
                data.attendance
                  .sakit
              }
            />

            <AttendanceStat
              label="Alpha"
              value={
                data.attendance
                  .alpha
              }
            />

            <AttendanceStat
              label="Total"
              value={
                data.attendance
                  .total
              }
            />
          </div>
        </section>

        {/* Grades */}
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-5">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-[#E53935]" />

              <h2 className="font-bold text-[#111827]">
                Nilai
              </h2>
            </div>
          </div>

          {data.grades.length ===
          0 ? (
            <div className="p-6 text-center text-sm text-slate-500">
              Belum ada nilai.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {data.grades.map(
                (grade, index) => (
                  <div
                    key={`${grade.enrollment_id}-${index}`}
                    className="flex items-center justify-between gap-4 p-4 sm:px-5"
                  >
                    <p className="text-sm font-medium text-slate-700">
                      {grade.subject}
                    </p>

                    <span
                      className={`rounded-lg px-3 py-1.5 text-sm font-bold ${
                        Number(
                          grade.score,
                        ) >= 70
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-red-50 text-[#E53935]'
                      }`}
                    >
                      {grade.score ??
                        '-'}
                    </span>
                  </div>
                ),
              )}
            </div>
          )}
        </section>

        {/* Finance */}
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-5">
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-[#E53935]" />

              <h2 className="font-bold text-[#111827]">
                SPP Bulan Berjalan
              </h2>
            </div>
          </div>

          {data.finance.length ===
          0 ? (
            <div className="p-6 text-center text-sm text-slate-500">
              Belum ada tagihan SPP
              bulan berjalan.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {data.finance.map(
                (bill) => {
                  const paid =
                    bill.payment_status ===
                    'PAID'

                  return (
                    <div
                      key={bill.id}
                      className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="font-semibold text-[#111827]">
                          SPP{' '}
                          {formatMonth(
                            bill.month_period,
                          )}
                        </p>

                        <p className="mt-1 text-sm text-slate-500">
                          {formatRupiah(
                            bill.amount,
                          )}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <span
                          className={`inline-flex items-center gap-1 text-sm font-semibold ${
                            paid
                              ? 'text-emerald-600'
                              : 'text-[#E53935]'
                          }`}
                        >
                          {paid ? (
                            <CheckCircle2 className="h-4 w-4" />
                          ) : (
                            <AlertCircle className="h-4 w-4" />
                          )}

                          {paymentLabel(
                            bill.payment_status,
                          )}
                        </span>

                        {!paid && (
                          <Link
                            href={`/dashboard/parent/finance/${bill.id}`}
                            className="rounded-lg bg-[#E53935] px-3 py-2 text-sm font-semibold text-white hover:bg-red-700"
                          >
                            Bayar
                          </Link>
                        )}
                      </div>
                    </div>
                  )
                },
              )}
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
}: {
  icon: typeof BookOpen
  label: string
  value: string
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-[#111827]">
        <Icon className="h-5 w-5" />
      </div>

      <p className="mt-4 text-sm font-medium text-slate-500">
        {label}
      </p>

      <p className="mt-1 text-2xl font-bold text-[#111827]">
        {value}
      </p>
    </div>
  )
}

function InfoItem({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-sm font-semibold text-slate-800">
        {value}
      </p>
    </div>
  )
}

function AttendanceStat({
  label,
  value,
}: {
  label: string
  value: number
}) {
  return (
    <div className="p-5 text-center">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-xl font-bold text-[#111827]">
        {value}
      </p>
    </div>
  )
}