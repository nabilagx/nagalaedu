'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import {
  AlertTriangle,
  BarChart3,
  CalendarCheck,
  ChevronRight,
  CircleCheck,
  PieChart,
  RefreshCw,
  School,
} from 'lucide-react'

type ChildAttendance = {
  id: string
  student_name: string
  grade_level: string | null
  school_name: string | null
  status: string | null

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
    id: string
    class_name: string
    subject: string
  }>

  class_performance: Array<{
    enrollment_id: string
    class_id: string
    class_name: string
    subject: string
    attendance_percentage: number
    total_attendance: number
    present_count: number
  }>
}

type ViewMode = 'summary' | 'chart'

export default function ParentAttendancePage() {
  const [children, setChildren] =
    useState<ChildAttendance[]>([])

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
        '/api/parent/attendance',
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
            'Gagal mengambil data kehadiran.',
        )
      }

      setChildren(
        (result.children ??
          []) as ChildAttendance[],
      )
    } catch (err) {
      console.error(err)

      setError(
        err instanceof Error
          ? err.message
          : 'Gagal mengambil data kehadiran.',
      )
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadAttendance()
  }, [])

  // ============================================
  // LOADING
  // ============================================

  if (loading) {
    return (
      <main className="p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-6xl animate-pulse space-y-6">
          <div className="h-8 w-48 rounded-lg bg-gray-200" />

          <div className="h-12 w-64 rounded-xl bg-gray-200" />

          <div className="grid gap-5 md:grid-cols-2">
            {[1, 2].map((item) => (
              <div
                key={item}
                className="h-80 rounded-2xl bg-gray-200"
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

  if (error) {
    return (
      <main className="p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />

              <div>
                <h2 className="font-semibold text-red-900">
                  Gagal memuat kehadiran
                </h2>

                <p className="mt-1 text-sm text-red-700">
                  {error}
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

  // ============================================
  // EMPTY
  // ============================================

  if (children.length === 0) {
    return (
      <main className="p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-[#111827]">
              Kehadiran
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              Pantau kehadiran anak di setiap kelas.
            </p>
          </div>

          <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center">
            <CalendarCheck className="mx-auto h-10 w-10 text-gray-400" />

            <h2 className="mt-4 font-semibold text-gray-900">
              Belum ada data kehadiran
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Data akan tampil setelah anak mengikuti
              kegiatan belajar.
            </p>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-6xl">
        {/* HEADER */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <CalendarCheck className="h-6 w-6 text-[#E53935]" />

              <h1 className="text-2xl font-bold text-[#111827]">
                Kehadiran
              </h1>
            </div>

            <p className="mt-1 text-sm text-gray-500">
              Pantau kehadiran anak di setiap kelas.
            </p>
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

        {/* CHILDREN */}
        <div className="space-y-6">
          {children.map((child) => {
            const a = child.attendance

            const totalForChart =
              Math.max(a.total, 1)

            const hadirDegree =
              (a.hadir / totalForChart) *
              360

            const sakitDegree =
              (a.sakit / totalForChart) *
              360

            const izinDegree =
              (a.izin / totalForChart) *
              360

            const alphaDegree =
              (a.alpha / totalForChart) *
              360

            const sakitEnd =
              hadirDegree +
              sakitDegree

            const izinEnd =
              sakitEnd + izinDegree

            const alphaEnd =
              izinEnd + alphaDegree

            return (
              <section
                key={child.id}
                className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
              >
                {/* CHILD HEADER */}
                <div className="border-b border-gray-100 p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#111827] text-white">
                        <School className="h-5 w-5" />
                      </div>

                      <div>
                        <h2 className="font-bold text-[#111827]">
                          {child.student_name}
                        </h2>

                        <p className="mt-1 text-sm text-gray-500">
                          {child.grade_level ||
                            'Jenjang belum tersedia'}

                          {child.school_name
                            ? ` • ${child.school_name}`
                            : ''}
                        </p>
                      </div>
                    </div>

                    {a.needs_attention ? (
                      <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        Perlu perhatian
                      </span>
                    ) : (
                      <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700">
                        <CircleCheck className="h-3.5 w-3.5" />
                        Kehadiran baik
                      </span>
                    )}
                  </div>
                </div>

                {/* SUMMARY VIEW */}
                {viewMode === 'summary' && (
                  <>
                    {/* BIG PERCENTAGE */}
                    <div className="p-5">
                      <div className="rounded-2xl bg-gray-50 p-5">
                        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-500">
                              Persentase Kehadiran
                            </p>

                            <p className="mt-1 text-4xl font-bold text-[#111827]">
                              {a.percentage}%
                            </p>

                            <p className="mt-1 text-sm text-gray-500">
                              {a.hadir} dari {a.total}{' '}
                              catatan kehadiran
                            </p>
                          </div>

                          <div className="h-3 w-full overflow-hidden rounded-full bg-gray-200 sm:w-64">
                            <div
                              className={`h-full rounded-full transition-all ${
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

                    {/* STATUS */}
                    <div className="grid grid-cols-2 gap-px bg-gray-100 sm:grid-cols-4">
                      <AttendanceStat
                        label="Hadir"
                        value={a.hadir}
                        className="text-green-600"
                      />

                      <AttendanceStat
                        label="Sakit"
                        value={a.sakit}
                        className="text-blue-600"
                      />

                      <AttendanceStat
                        label="Izin"
                        value={a.izin}
                        className="text-orange-600"
                      />

                      <AttendanceStat
                        label="Alpha"
                        value={a.alpha}
                        className="text-red-600"
                      />
                    </div>

                    {/* CLASS */}
                    <div className="p-5">
                      <h3 className="mb-4 font-bold text-[#111827]">
                        Kehadiran per Kelas
                      </h3>

                      {child.class_performance
                        .length === 0 ? (
                        <div className="rounded-xl border border-dashed border-gray-300 p-6 text-center">
                          <p className="text-sm text-gray-500">
                            Belum ada data kelas.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {child.class_performance.map(
                            (item) => (
                              <div
                                key={
                                  item.enrollment_id
                                }
                                className="rounded-xl border border-gray-100 p-4"
                              >
                                <div className="flex items-center justify-between gap-4">
                                  <div className="min-w-0">
                                    <p className="truncate font-semibold text-[#111827]">
                                      {item.subject}
                                    </p>

                                    <p className="mt-1 text-xs text-gray-500">
                                      {item.class_name}
                                    </p>
                                  </div>

                                  <span className="shrink-0 text-sm font-bold text-[#111827]">
                                    {
                                      item.attendance_percentage
                                    }
                                    %
                                  </span>
                                </div>

                                <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-100">
                                  <div
                                    className={`h-full rounded-full ${
                                      item.attendance_percentage >=
                                      80
                                        ? 'bg-green-500'
                                        : 'bg-red-500'
                                    }`}
                                    style={{
                                      width: `${Math.min(
                                        item.attendance_percentage,
                                        100,
                                      )}%`,
                                    }}
                                  />
                                </div>

                                <p className="mt-2 text-xs text-gray-500">
                                  {
                                    item.present_count
                                  }{' '}
                                  hadir dari{' '}
                                  {
                                    item.total_attendance
                                  }{' '}
                                  pertemuan
                                </p>
                              </div>
                            ),
                          )}
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* CHART VIEW */}
                {viewMode === 'chart' && (
                  <div className="grid gap-6 p-5 lg:grid-cols-2">
                    {/* DONUT */}
                    <div className="rounded-2xl border border-gray-100 bg-gray-50 p-5">
                      <div className="flex items-center gap-2">
                        <PieChart className="h-5 w-5 text-[#E53935]" />

                        <h3 className="font-bold text-[#111827]">
                          Distribusi Kehadiran
                        </h3>
                      </div>

                      <div className="mt-6 flex flex-col items-center justify-center gap-6 sm:flex-row">
                        <div
                          className="relative h-48 w-48 shrink-0 rounded-full"
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
                          <div className="absolute inset-8 flex flex-col items-center justify-center rounded-full bg-white">
                            <span className="text-3xl font-bold text-[#111827]">
                              {a.percentage}%
                            </span>

                            <span className="text-xs text-gray-500">
                              Kehadiran
                            </span>
                          </div>
                        </div>

                        <div className="w-full space-y-3 sm:w-auto">
                          <LegendItem
                            label="Hadir"
                            value={a.hadir}
                            className="bg-green-500"
                          />

                          <LegendItem
                            label="Sakit"
                            value={a.sakit}
                            className="bg-blue-500"
                          />

                          <LegendItem
                            label="Izin"
                            value={a.izin}
                            className="bg-orange-500"
                          />

                          <LegendItem
                            label="Alpha"
                            value={a.alpha}
                            className="bg-red-500"
                          />
                        </div>
                      </div>
                    </div>

                    {/* BAR CHART */}
                    <div className="rounded-2xl border border-gray-100 bg-gray-50 p-5">
                      <div className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5 text-[#E53935]" />

                        <h3 className="font-bold text-[#111827]">
                          Kehadiran per Kelas
                        </h3>
                      </div>

                      <div className="mt-6 space-y-5">
                        {child.class_performance.length ===
                        0 ? (
                          <div className="rounded-xl border border-dashed border-gray-300 p-6 text-center">
                            <p className="text-sm text-gray-500">
                              Belum ada data kelas.
                            </p>
                          </div>
                        ) : (
                          child.class_performance.map(
                            (item) => (
                              <div
                                key={
                                  item.enrollment_id
                                }
                              >
                                <div className="mb-2 flex items-center justify-between gap-4">
                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-semibold text-[#111827]">
                                      {item.subject}
                                    </p>

                                    <p className="truncate text-xs text-gray-500">
                                      {item.class_name}
                                    </p>
                                  </div>

                                  <span className="shrink-0 text-sm font-bold text-[#111827]">
                                    {
                                      item.attendance_percentage
                                    }
                                    %
                                  </span>
                                </div>

                                <div className="h-3 overflow-hidden rounded-full bg-gray-200">
                                  <div
                                    className={`h-full rounded-full ${
                                      item.attendance_percentage >=
                                      80
                                        ? 'bg-green-500'
                                        : 'bg-red-500'
                                    }`}
                                    style={{
                                      width: `${Math.min(
                                        item.attendance_percentage,
                                        100,
                                      )}%`,
                                    }}
                                  />
                                </div>
                              </div>
                            ),
                          )
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* DETAIL BUTTON */}
                <div className="border-t border-gray-100 p-5">
                  <Link
                    href={`/dashboard/parent/attendance/${child.id}`}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#111827] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1f2937]"
                  >
                    Lihat Detail Kehadiran
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              </section>
            )
          })}
        </div>
      </div>
    </main>
  )
}

// ============================================
// SMALL COMPONENTS
// ============================================

function AttendanceStat({
  label,
  value,
  className,
}: {
  label: string
  value: number
  className: string
}) {
  return (
    <div className="bg-white p-4">
      <p className="text-xs font-medium text-gray-500">
        {label}
      </p>

      <p
        className={`mt-1 text-2xl font-bold ${className}`}
      >
        {value}
      </p>
    </div>
  )
}

function LegendItem({
  label,
  value,
  className,
}: {
  label: string
  value: number
  className: string
}) {
  return (
    <div className="flex items-center justify-between gap-5">
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
  )
}