'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import {
  BookOpen,
  CalendarCheck,
  ChevronRight,
  GraduationCap,
  RefreshCw,
  School,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react'

type AcademicChild = {
  id: string
  student_name: string
  grade_level: string | null
  school_name: string | null
  status: string | null
  academic: {
    active_classes: number
    total_grades: number
    average_score: number
    attendance_percentage: number
    total_attendance: number
    present_count: number
    alpha_count: number
    needs_attention: boolean
  }
  classes: Array<{
    id: string
    class_name: string
    subject: string
    status: string | null
  }>
}

type AcademicResponse = {
  children: AcademicChild[]
}

export default function ParentAcademicPage() {
  const [children, setChildren] = useState<
    AcademicChild[]
  >([])

  const [loading, setLoading] =
    useState(true)

  const [refreshing, setRefreshing] =
    useState(false)

  const [error, setError] =
    useState('')

  async function loadAcademic(
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
        '/api/parent/academic',
        {
          method: 'GET',
          cache: 'no-store',
        },
      )

      const result = await response.json()

      if (!response.ok) {
        throw new Error(
          result?.error ||
            'Gagal mengambil data akademik.',
        )
      }

      setChildren(
        (result.children ??
          []) as AcademicChild[],
      )
    } catch (err) {
      console.error(err)

      setError(
        err instanceof Error
          ? err.message
          : 'Gagal mengambil data akademik.',
      )
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadAcademic()
  }, [])

  // ============================================
  // LOADING
  // ============================================

  if (loading) {
    return (
      <main className="p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-6xl">
          <div className="animate-pulse space-y-6">
            <div className="h-8 w-48 rounded-lg bg-gray-200" />

            <div className="grid gap-5 md:grid-cols-2">
              {[1, 2].map((item) => (
                <div
                  key={item}
                  className="h-72 rounded-2xl bg-gray-200"
                />
              ))}
            </div>
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
                  Gagal memuat data akademik
                </h2>

                <p className="mt-1 text-sm text-red-700">
                  {error}
                </p>

                <button
                  type="button"
                  onClick={() =>
                    loadAcademic(true)
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
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-[#111827]">
                Akademik
              </h1>

              <p className="mt-1 text-sm text-gray-500">
                Pantau perkembangan akademik anak Anda.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                loadAcademic(true)
              }
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-60"
            >
              <RefreshCw
                className={`h-4 w-4 ${
                  refreshing
                    ? 'animate-spin'
                    : ''
                }`}
              />
              Refresh
            </button>
          </div>

          <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center">
            <GraduationCap className="mx-auto h-10 w-10 text-gray-400" />

            <h2 className="mt-4 font-semibold text-gray-900">
              Belum ada data anak
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Data akademik akan tampil setelah
              anak terdaftar.
            </p>
          </div>
        </div>
      </main>
    )
  }

  // ============================================
  // MAIN
  // ============================================

  return (
    <main className="p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-6xl">
        {/* HEADER */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <GraduationCap className="h-6 w-6 text-[#E53935]" />

              <h1 className="text-2xl font-bold text-[#111827]">
                Akademik
              </h1>
            </div>

            <p className="mt-1 text-sm text-gray-500">
              Pantau perkembangan akademik setiap
              anak.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              loadAcademic(true)
            }
            disabled={refreshing}
            className="inline-flex w-fit items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:opacity-60"
          >
            <RefreshCw
              className={`h-4 w-4 ${
                refreshing
                  ? 'animate-spin'
                  : ''
              }`}
            />
            Refresh
          </button>
        </div>

        {/* CHILDREN */}
        <div className="grid gap-5 md:grid-cols-2">
          {children.map((child) => {
            const academic =
              child.academic

            return (
              <div
                key={child.id}
                className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
              >
                {/* CARD HEADER */}
                <div className="border-b border-gray-100 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#111827] text-white">
                        <GraduationCap className="h-5 w-5" />
                      </div>

                      <div className="min-w-0">
                        <h2 className="truncate text-lg font-bold text-[#111827]">
                          {child.student_name}
                        </h2>

                        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-gray-500">
                          <span>
                            {child.grade_level ||
                              'Jenjang belum tersedia'}
                          </span>

                          {child.school_name && (
                            <>
                              <span>•</span>

                              <span className="truncate">
                                {child.school_name}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {academic.needs_attention && (
                      <span className="shrink-0 rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-600">
                        Perlu perhatian
                      </span>
                    )}
                  </div>
                </div>

                {/* METRICS */}
                <div className="grid grid-cols-2 gap-px bg-gray-100">
                  <div className="bg-white p-4">
                    <div className="flex items-center gap-2 text-gray-500">
                      <BookOpen className="h-4 w-4" />

                      <span className="text-xs font-medium">
                        Kelas Aktif
                      </span>
                    </div>

                    <p className="mt-2 text-xl font-bold text-[#111827]">
                      {academic.active_classes}
                    </p>
                  </div>

                  <div className="bg-white p-4">
                    <div className="flex items-center gap-2 text-gray-500">
                      <TrendingUp className="h-4 w-4" />

                      <span className="text-xs font-medium">
                        Rata-rata Nilai
                      </span>
                    </div>

                    <p className="mt-2 text-xl font-bold text-[#111827]">
                      {academic.average_score || '-'}
                    </p>
                  </div>

                  <div className="bg-white p-4">
                    <div className="flex items-center gap-2 text-gray-500">
                      <CalendarCheck className="h-4 w-4" />

                      <span className="text-xs font-medium">
                        Kehadiran
                      </span>
                    </div>

                    <p className="mt-2 text-xl font-bold text-[#111827]">
                      {academic.attendance_percentage}%
                    </p>
                  </div>

                  <div className="bg-white p-4">
                    <div className="flex items-center gap-2 text-gray-500">
                      <School className="h-4 w-4" />

                      <span className="text-xs font-medium">
                        Nilai Tercatat
                      </span>
                    </div>

                    <p className="mt-2 text-xl font-bold text-[#111827]">
                      {academic.total_grades}
                    </p>
                  </div>
                </div>

                {/* ATTENTION */}
                {academic.needs_attention && (
                  <div className="mx-5 mt-5 rounded-xl border border-red-100 bg-red-50 p-3">
                    <div className="flex gap-2">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />

                      <div>
                        <p className="text-sm font-semibold text-red-800">
                          Perlu diperhatikan
                        </p>

                        <p className="mt-0.5 text-xs leading-5 text-red-700">
                          Cek detail nilai dan
                          kehadiran untuk melihat
                          perkembangan anak.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* FOOTER */}
                <div className="p-5">
                  <Link
                    href={`/dashboard/parent/academic/${child.id}`}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#111827] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1f2937]"
                  >
                    Lihat Detail Akademik
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </main>
  )
}