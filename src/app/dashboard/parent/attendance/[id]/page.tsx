'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  CalendarCheck,
  CheckCircle2,
  CircleAlert,
  PieChart,
  RefreshCw,
  School,
  UserRound,
} from 'lucide-react'

type AttendanceDetail = {
  parent: {
    id: string
    full_name: string
  }

  student: {
    id: string
    student_name: string
    grade_level: string | null
    school_name: string | null
    phone_number: string | null
    status: string | null
  }

  attendance: {
    total: number
    hadir: number
    sakit: number
    izin: number
    alpha: number
    percentage: number
    needs_attention: boolean
  }

  classes: Array<{
    enrollment_id: string
    class_id: string
    class_name: string
    subject: string
    attendance: {
      total: number
      hadir: number
      sakit: number
      izin: number
      alpha: number
      percentage: number
    }
  }>
}

type ViewMode = 'summary' | 'chart'

export default function ParentAttendanceDetailPage() {
  const params = useParams<{
    id: string
  }>()

  const id = params.id

  const [data, setData] =
    useState<AttendanceDetail | null>(null)

  const [viewMode, setViewMode] =
    useState<ViewMode>('summary')

  const [loading, setLoading] =
    useState(true)

  const [refreshing, setRefreshing] =
    useState(false)

  const [error, setError] =
    useState('')

  async function loadAttendance(
    isRefresh = false,
  ) {
    try {
      setError('')

      if (isRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }

      const response = await fetch(
        `/api/parent/attendance/${id}`,
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
            'Gagal mengambil detail kehadiran.',
        )
      }

      setData(
        result as AttendanceDetail,
      )
    } catch (err) {
      console.error(err)

      setError(
        err instanceof Error
          ? err.message
          : 'Gagal mengambil detail kehadiran.',
      )
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    if (id) {
      loadAttendance()
    }
  }, [id])

  // ============================================
  // LOADING
  // ============================================

  if (loading) {
    return (
      <main className="p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-6xl animate-pulse space-y-6">
          <div className="h-8 w-56 rounded-lg bg-gray-200" />

          <div className="h-40 rounded-2xl bg-gray-200" />

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((item) => (
              <div
                key={item}
                className="h-28 rounded-2xl bg-gray-200"
              />
            ))}
          </div>
        </div>
      </main>
    )
  }

  // ============================================
  // ERROR
  // ============================================

  if (error || !data) {
    return (
      <main className="p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-6xl">
          <Link
            href="/dashboard/parent/attendance"
            className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-gray-600 transition hover:text-[#111827]"
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali ke Kehadiran
          </Link>

          <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />

              <div>
                <h2 className="font-semibold text-red-900">
                  Gagal memuat detail kehadiran
                </h2>

                <p className="mt-1 text-sm text-red-700">
                  {error ||
                    'Data kehadiran tidak ditemukan.'}
                </p>

                <button
                  type="button"
                  onClick={() =>
                    loadAttendance(true)
                  }
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#E53935] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#c62828]"
                >
                  <RefreshCw className="h-4 w-4" />
                  Coba Lagi
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    )
  }

  const {
    student,
    attendance: a,
    classes,
  } = data

  const totalForChart =
    Math.max(a.total, 1)

  const hadirDegree =
    (a.hadir / totalForChart) * 360

  const sakitDegree =
    (a.sakit / totalForChart) * 360

  const izinDegree =
    (a.izin / totalForChart) * 360

  const alphaDegree =
    (a.alpha / totalForChart) * 360

  const sakitEnd =
    hadirDegree + sakitDegree

  const izinEnd =
    sakitEnd + izinDegree

  const alphaEnd =
    izinEnd + alphaDegree

  return (
    <main className="p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-6xl">
        {/* HEADER */}
        <div className="mb-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <Link
                href="/dashboard/parent/attendance"
                className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-gray-500 transition hover:text-[#111827]"
              >
                <ArrowLeft className="h-4 w-4" />
                Kembali ke Kehadiran
              </Link>

              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#111827] text-white">
                  <CalendarCheck className="h-6 w-6" />
                </div>

                <div>
                  <h1 className="text-2xl font-bold text-[#111827]">
                    {student.student_name}
                  </h1>

                  <p className="mt-1 text-sm text-gray-500">
                    {student.grade_level ||
                      'Jenjang belum tersedia'}

                    {student.school_name
                      ? ` • ${student.school_name}`
                      : ''}
                  </p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                loadAttendance(true)
              }
              disabled={refreshing}
              className="inline-flex w-fit items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:opacity-60"
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

        {/* ALERT */}
        {a.needs_attention && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4">
            <div className="flex items-start gap-3">
              <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />

              <div>
                <h2 className="font-semibold text-red-900">
                  Kehadiran perlu diperhatikan
                </h2>

                <p className="mt-1 text-sm leading-6 text-red-700">
                  Persentase kehadiran berada di
                  bawah 80% atau terdapat catatan
                  alpha.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* VIEW SWITCHER */}
        <div className="mb-6 inline-flex rounded-xl border border-gray-200 bg-white p-1 shadow-sm">
          <button
            type="button"
            onClick={() =>
              setViewMode('summary')
            }
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
              viewMode === 'summary'
                ? 'bg-[#111827] text-white'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <CalendarCheck className="h-4 w-4" />
            Ringkasan
          </button>

          <button
            type="button"
            onClick={() =>
              setViewMode('chart')
            }
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
              viewMode === 'chart'
                ? 'bg-[#111827] text-white'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <PieChart className="h-4 w-4" />
            Grafik
          </button>
        </div>

        {/* SUMMARY */}
        {viewMode === 'summary' && (
          <>
            {/* BIG SUMMARY */}
            <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    Persentase Kehadiran
                  </p>

                  <p className="mt-1 text-5xl font-bold text-[#111827]">
                    {a.percentage}%
                  </p>

                  <p className="mt-2 text-sm text-gray-500">
                    {a.hadir} hadir dari {a.total}{' '}
                    catatan kehadiran
                  </p>
                </div>

                <div className="w-full sm:w-80">
                  <div className="mb-2 flex justify-between text-xs text-gray-500">
                    <span>
                      Progress kehadiran
                    </span>

                    <span>
                      Target 80%
                    </span>
                  </div>

                  <div className="relative h-4 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className={`h-full rounded-full ${
                        a.percentage >= 80
                          ? 'bg-green-500'
                          : 'bg-red-500'
                      }`}
                      style={{
                        width: `${Math.min(
                          a.percentage,
                          100,
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* STATS */}
            <div className="mb-6 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-gray-200 bg-gray-100 sm:grid-cols-4">
              <DetailStat
                label="Hadir"
                value={a.hadir}
                description="Pertemuan"
                className="text-green-600"
              />

              <DetailStat
                label="Sakit"
                value={a.sakit}
                description="Pertemuan"
                className="text-blue-600"
              />

              <DetailStat
                label="Izin"
                value={a.izin}
                description="Pertemuan"
                className="text-orange-600"
              />

              <DetailStat
                label="Alpha"
                value={a.alpha}
                description="Pertemuan"
                className="text-red-600"
              />
            </div>

            {/* CLASS TABLE */}
            <section className="mb-6 rounded-2xl border border-gray-200 bg-white shadow-sm">
              <div className="border-b border-gray-100 p-5">
                <div className="flex items-center gap-2">
                  <School className="h-5 w-5 text-[#E53935]" />

                  <h2 className="font-bold text-[#111827]">
                    Kehadiran per Kelas
                  </h2>
                </div>
              </div>

              {classes.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-sm text-gray-500">
                    Belum ada kelas aktif.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {classes.map(
                    (classItem) => (
                      <div
                        key={
                          classItem.enrollment_id
                        }
                        className="p-5"
                      >
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <h3 className="font-semibold text-[#111827]">
                              {
                                classItem.subject
                              }
                            </h3>

                            <p className="mt-1 text-sm text-gray-500">
                              {
                                classItem.class_name
                              }
                            </p>
                          </div>

                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="text-xs text-gray-500">
                                Kehadiran
                              </p>

                              <p className="font-bold text-[#111827]">
                                {
                                  classItem
                                    .attendance
                                    .percentage
                                }
                                %
                              </p>
                            </div>

                            <div className="h-10 w-10 rounded-full border-4 border-gray-100 p-0.5">
                              <div
                                className={`flex h-full w-full items-center justify-center rounded-full text-[10px] font-bold ${
                                  classItem
                                    .attendance
                                    .percentage >=
                                  80
                                    ? 'bg-green-50 text-green-700'
                                    : 'bg-red-50 text-red-700'
                                }`}
                              >
                                {classItem
                                  .attendance
                                  .percentage}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 grid grid-cols-4 gap-2">
                          <MiniStat
                            label="H"
                            value={
                              classItem
                                .attendance
                                .hadir
                            }
                            className="text-green-600"
                          />

                          <MiniStat
                            label="S"
                            value={
                              classItem
                                .attendance
                                .sakit
                            }
                            className="text-blue-600"
                          />

                          <MiniStat
                            label="I"
                            value={
                              classItem
                                .attendance
                                .izin
                            }
                            className="text-orange-600"
                          />

                          <MiniStat
                            label="A"
                            value={
                              classItem
                                .attendance
                                .alpha
                            }
                            className="text-red-600"
                          />
                        </div>
                      </div>
                    ),
                  )}
                </div>
              )}
            </section>
          </>
        )}

        {/* CHART VIEW */}
        {viewMode === 'chart' && (
          <div className="grid gap-6 lg:grid-cols-2">
            {/* DONUT */}
            <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-2">
                <PieChart className="h-5 w-5 text-[#E53935]" />

                <h2 className="font-bold text-[#111827]">
                  Distribusi Kehadiran
                </h2>
              </div>

              <p className="mt-1 text-sm text-gray-500">
                Perbandingan seluruh status kehadiran.
              </p>

              <div className="mt-8 flex flex-col items-center gap-8 sm:flex-row sm:justify-center">
                <div
                  className="relative h-56 w-56 shrink-0 rounded-full"
                  style={{
                    background:
                      `conic-gradient(
                        #22c55e 0deg ${hadirDegree}deg,
                        #3b82f6 ${hadirDegree}deg ${sakitEnd}deg,
                        #f59e0b ${sakitEnd}deg ${izinEnd}deg,
                        #ef4444 ${izinEnd}deg ${alphaEnd}deg,
                        #e5e7eb ${alphaEnd}deg 360deg
                      )`,
                  }}
                >
                  <div className="absolute inset-10 flex flex-col items-center justify-center rounded-full bg-white">
                    <span className="text-4xl font-bold text-[#111827]">
                      {a.percentage}%
                    </span>

                    <span className="text-sm text-gray-500">
                      Kehadiran
                    </span>
                  </div>
                </div>

                <div className="w-full max-w-xs space-y-4">
                  <ChartLegend
                    label="Hadir"
                    value={a.hadir}
                    total={a.total}
                    className="bg-green-500"
                  />

                  <ChartLegend
                    label="Sakit"
                    value={a.sakit}
                    total={a.total}
                    className="bg-blue-500"
                  />

                  <ChartLegend
                    label="Izin"
                    value={a.izin}
                    total={a.total}
                    className="bg-orange-500"
                  />

                  <ChartLegend
                    label="Alpha"
                    value={a.alpha}
                    total={a.total}
                    className="bg-red-500"
                  />
                </div>
              </div>
            </section>

            {/* CLASS BAR */}
            <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-[#E53935]" />

                <h2 className="font-bold text-[#111827]">
                  Kehadiran per Kelas
                </h2>
              </div>

              <p className="mt-1 text-sm text-gray-500">
                Persentase kehadiran berdasarkan kelas aktif.
              </p>

              <div className="mt-8 space-y-6">
                {classes.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-gray-300 p-6 text-center">
                    <p className="text-sm text-gray-500">
                      Belum ada data kelas.
                    </p>
                  </div>
                ) : (
                  classes.map(
                    (classItem) => (
                      <div
                        key={
                          classItem.enrollment_id
                        }
                      >
                        <div className="mb-2 flex items-end justify-between gap-4">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-[#111827]">
                              {
                                classItem.subject
                              }
                            </p>

                            <p className="mt-0.5 truncate text-xs text-gray-500">
                              {
                                classItem.class_name
                              }
                            </p>
                          </div>

                          <span className="shrink-0 text-sm font-bold text-[#111827]">
                            {
                              classItem
                                .attendance
                                .percentage
                            }
                            %
                          </span>
                        </div>

                        <div className="h-4 overflow-hidden rounded-full bg-gray-100">
                          <div
                            className={`h-full rounded-full transition-all ${
                              classItem
                                .attendance
                                .percentage >=
                              80
                                ? 'bg-green-500'
                                : 'bg-red-500'
                            }`}
                            style={{
                              width: `${Math.min(
                                classItem
                                  .attendance
                                  .percentage,
                                100,
                              )}%`,
                            }}
                          />
                        </div>

                        <div className="mt-2 flex justify-between text-xs text-gray-500">
                          <span>
                            {
                              classItem
                                .attendance
                                .hadir
                            }{' '}
                            hadir
                          </span>

                          <span>
                            {
                              classItem
                                .attendance
                                .total
                            }{' '}
                            total
                          </span>
                        </div>
                      </div>
                    ),
                  )
                )}
              </div>
            </section>
          </div>
        )}

        {/* STUDENT INFO */}
        <section className="mt-6 rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 p-5">
            <div className="flex items-center gap-2">
              <UserRound className="h-5 w-5 text-[#E53935]" />

              <h2 className="font-bold text-[#111827]">
                Informasi Anak
              </h2>
            </div>
          </div>

          <div className="grid gap-5 p-5 sm:grid-cols-3">
            <InfoItem
              label="Nama"
              value={
                student.student_name
              }
            />

            <InfoItem
              label="Jenjang"
              value={
                student.grade_level ||
                '-'
              }
            />

            <InfoItem
              label="Sekolah"
              value={
                student.school_name ||
                '-'
              }
            />

            <InfoItem
              label="Total Pertemuan"
              value={String(a.total)}
            />

            <InfoItem
              label="Kehadiran"
              value={`${a.percentage}%`}
            />

            <InfoItem
              label="Status"
              value={
                student.status ||
                '-'
              }
            />
          </div>
        </section>
      </div>
    </main>
  )
}

// ============================================
// COMPONENTS
// ============================================

function DetailStat({
  label,
  value,
  description,
  className,
}: {
  label: string
  value: number
  description: string
  className: string
}) {
  return (
    <div className="bg-white p-5">
      <p className="text-sm font-medium text-gray-500">
        {label}
      </p>

      <p
        className={`mt-1 text-2xl font-bold ${className}`}
      >
        {value}
      </p>

      <p className="mt-1 text-xs text-gray-400">
        {description}
      </p>
    </div>
  )
}

function MiniStat({
  label,
  value,
  className,
}: {
  label: string
  value: number
  className: string
}) {
  return (
    <div className="rounded-lg bg-gray-50 p-2 text-center">
      <p className="text-[10px] font-semibold text-gray-400">
        {label}
      </p>

      <p
        className={`mt-0.5 text-sm font-bold ${className}`}
      >
        {value}
      </p>
    </div>
  )
}

function ChartLegend({
  label,
  value,
  total,
  className,
}: {
  label: string
  value: number
  total: number
  className: string
}) {
  const percentage =
    total > 0
      ? Math.round((value / total) * 100)
      : 0

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span
            className={`h-3 w-3 rounded-full ${className}`}
          />

          <span className="text-sm text-gray-600">
            {label}
          </span>
        </div>

        <span className="text-sm font-bold text-[#111827]">
          {value}
        </span>
      </div>

      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-100">
        <div
          className={`h-full rounded-full ${className}`}
          style={{
            width: `${percentage}%`,
          }}
        />
      </div>
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
      <p className="text-xs font-medium text-gray-500">
        {label}
      </p>

      <p className="mt-1 font-medium text-[#111827]">
        {value}
      </p>
    </div>
  )
}