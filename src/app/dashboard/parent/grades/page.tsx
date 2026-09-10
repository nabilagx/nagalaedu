'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import {
  Award,
  BarChart3,
  BookOpen,
  ChevronRight,
  GraduationCap,
  RefreshCw,
  School,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react'

type ViewMode = 'summary' | 'chart'

type GradeClass = {
  enrollment_id: string
  class_id: string
  class_name: string
  subject: string
  average: number
  total_grades: number
  scores: number[]
}

type Child = {
  id: string
  student_name: string
  grade_level: string | null
  school_name: string | null
  status: string | null
  summary: {
    average_score: number
    highest_score: number
    lowest_score: number
    total_grades: number
    needs_attention: boolean
  }
  classes: GradeClass[]
}

function getScoreStatus(score: number) {
  if (score >= 80) {
    return {
      label: 'Baik',
      className:
        'bg-green-50 text-green-700 border-green-200',
    }
  }

  if (score >= 70) {
    return {
      label: 'Cukup',
      className:
        'bg-yellow-50 text-yellow-700 border-yellow-200',
    }
  }

  return {
    label: 'Perlu perhatian',
    className:
      'bg-red-50 text-red-700 border-red-200',
  }
}

function ScoreBar({
  score,
  max = 100,
}: {
  score: number
  max?: number
}) {
  const percentage = Math.min(
    Math.max((score / max) * 100, 0),
    100,
  )

  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
      <div
        className="h-full rounded-full bg-[#E53935] transition-all"
        style={{
          width: `${percentage}%`,
        }}
      />
    </div>
  )
}

export default function ParentGradesPage() {
  const [children, setChildren] =
    useState<Child[]>([])

  const [viewMode, setViewMode] =
    useState<ViewMode>('summary')

  const [loading, setLoading] =
    useState(true)

  const [refreshing, setRefreshing] =
    useState(false)

  const [error, setError] =
    useState('')

  async function loadGrades(
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
        '/api/parent/grades',
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
            'Gagal mengambil data nilai.',
        )
      }

      setChildren(
        (result.children ??
          []) as Child[],
      )
    } catch (err) {
      console.error(err)

      setError(
        err instanceof Error
          ? err.message
          : 'Gagal mengambil data nilai.',
      )
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadGrades()
  }, [])

  if (loading) {
    return (
      <main className="space-y-6 p-4 sm:p-6">
        <div>
          <div className="h-8 w-48 animate-pulse rounded-lg bg-gray-200" />
          <div className="mt-2 h-4 w-72 animate-pulse rounded bg-gray-100" />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {[1, 2].map((item) => (
            <div
              key={item}
              className="h-72 animate-pulse rounded-2xl bg-gray-100"
            />
          ))}
        </div>
      </main>
    )
  }

  return (
    <main className="space-y-6 p-4 sm:p-6">
      {/* HEADER */}
      <section className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#111827]">
            Nilai
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Pantau perkembangan akademik
            anak.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* VIEW TOGGLE */}
          <div className="flex rounded-xl border border-gray-200 bg-white p-1">
            <button
              type="button"
              onClick={() =>
                setViewMode('summary')
              }
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
                viewMode === 'summary'
                  ? 'bg-[#111827] text-white'
                  : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              <BookOpen
                className="h-4 w-4"
              />
              Ringkasan
            </button>

            <button
              type="button"
              onClick={() =>
                setViewMode('chart')
              }
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
                viewMode === 'chart'
                  ? 'bg-[#111827] text-white'
                  : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              <BarChart3
                className="h-4 w-4"
              />
              Grafik
            </button>
          </div>

          <button
            type="button"
            onClick={() =>
              loadGrades(true)
            }
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
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
      </section>

      {/* ERROR */}
      {error && (
        <section className="rounded-2xl border border-red-200 bg-red-50 p-5">
          <p className="font-semibold text-red-700">
            Gagal memuat nilai
          </p>

          <p className="mt-1 text-sm text-red-600">
            {error}
          </p>
        </section>
      )}

      {/* EMPTY */}
      {!error &&
        children.length === 0 && (
          <section className="rounded-2xl border border-gray-200 bg-white p-10 text-center">
            <GraduationCap className="mx-auto h-12 w-12 text-gray-300" />

            <h2 className="mt-4 text-lg font-semibold text-[#111827]">
              Belum ada data anak
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Data anak yang terhubung
              dengan akun Anda akan
              muncul di sini.
            </p>
          </section>
        )}

      {/* CHILDREN */}
      <section className="grid gap-5 xl:grid-cols-2">
        {children.map((child) => {
          const status =
            getScoreStatus(
              child.summary.average_score,
            )

          return (
            <article
              key={child.id}
              className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
            >
              {/* CHILD HEADER */}
              <div className="border-b border-gray-100 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#111827] text-white">
                      <GraduationCap className="h-5 w-5" />
                    </div>

                    <div className="min-w-0">
                      <h2 className="truncate font-bold text-[#111827]">
                        {child.student_name}
                      </h2>

                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                        <span>
                          {child.grade_level ??
                            '-'}
                        </span>

                        {child.school_name && (
                          <>
                            <span>
                              •
                            </span>

                            <span className="flex items-center gap-1">
                              <School className="h-3.5 w-3.5" />
                              {
                                child.school_name
                              }
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <span
                    className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold ${status.className}`}
                  >
                    {status.label}
                  </span>
                </div>
              </div>

              {/* SUMMARY VIEW */}
              {viewMode ===
                'summary' && (
                <div className="space-y-5 p-5">
                  {/* MAIN SCORE */}
                  <div className="rounded-2xl bg-gray-50 p-5">
                    <div className="flex items-end justify-between gap-4">
                      <div>
                        <p className="text-sm text-gray-500">
                          Rata-rata Nilai
                        </p>

                        <p className="mt-1 text-4xl font-bold text-[#111827]">
                          {
                            child
                              .summary
                              .average_score
                          }
                        </p>
                      </div>

                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-[#E53935] shadow-sm">
                        <Award className="h-6 w-6" />
                      </div>
                    </div>

                    <div className="mt-4">
                      <ScoreBar
                        score={
                          child
                            .summary
                            .average_score
                        }
                      />
                    </div>
                  </div>

                  {/* STATS */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-xl border border-gray-100 p-3">
                      <p className="text-xs text-gray-500">
                        Tertinggi
                      </p>

                      <p className="mt-1 text-lg font-bold text-green-600">
                        {
                          child
                            .summary
                            .highest_score
                        }
                      </p>
                    </div>

                    <div className="rounded-xl border border-gray-100 p-3">
                      <p className="text-xs text-gray-500">
                        Terendah
                      </p>

                      <p className="mt-1 text-lg font-bold text-red-600">
                        {
                          child
                            .summary
                            .lowest_score
                        }
                      </p>
                    </div>

                    <div className="rounded-xl border border-gray-100 p-3">
                      <p className="text-xs text-gray-500">
                        Jumlah Nilai
                      </p>

                      <p className="mt-1 text-lg font-bold text-[#111827]">
                        {
                          child
                            .summary
                            .total_grades
                        }
                      </p>
                    </div>
                  </div>

                  {/* ATTENTION */}
                  {child.summary
                    .needs_attention && (
                    <div className="flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
                      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />

                      <div>
                        <p className="font-semibold text-red-700">
                          Perlu perhatian
                        </p>

                        <p className="mt-1 text-sm text-red-600">
                          Rata-rata nilai
                          masih di bawah
                          70. Orang tua
                          dapat melihat
                          detail mata
                          pelajaran untuk
                          pendampingan.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* CLASS */}
                  <div>
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="font-semibold text-[#111827]">
                        Nilai per Kelas
                      </h3>

                      <span className="text-xs text-gray-500">
                        {
                          child.classes
                            .length
                        }{' '}
                        kelas
                      </span>
                    </div>

                    {child.classes
                      .length === 0 ? (
                      <p className="rounded-xl bg-gray-50 p-4 text-sm text-gray-500">
                        Belum ada data
                        kelas aktif.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {child.classes.map(
                          (item) => (
                            <div
                              key={
                                item.enrollment_id
                              }
                              className="rounded-xl border border-gray-100 p-4"
                            >
                              <div className="flex items-center justify-between gap-4">
                                <div className="min-w-0">
                                  <p className="truncate font-medium text-[#111827]">
                                    {
                                      item.class_name
                                    }
                                  </p>

                                  <p className="mt-0.5 text-xs text-gray-500">
                                    {
                                      item.subject
                                    }
                                  </p>
                                </div>

                                <p className="font-bold text-[#E53935]">
                                  {
                                    item.average
                                  }
                                </p>
                              </div>

                              <div className="mt-3">
                                <ScoreBar
                                  score={
                                    item.average
                                  }
                                />
                              </div>
                            </div>
                          ),
                        )}
                      </div>
                    )}
                  </div>

                  {/* DETAIL */}
                  <Link
                    href={`/dashboard/parent/grades/${child.id}`}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#111827] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1f2937]"
                  >
                    Lihat Detail Nilai
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              )}

              {/* CHART VIEW */}
              {viewMode === 'chart' && (
                <div className="space-y-6 p-5">
                  <div className="flex items-center gap-4 rounded-2xl bg-gray-50 p-5">
                    <div className="relative flex h-28 w-28 shrink-0 items-center justify-center rounded-full bg-gray-200">
                      <div
                        className="absolute inset-0 rounded-full"
                        style={{
                          background: `conic-gradient(#E53935 ${
                            child.summary
                              .average_score *
                            3.6
                          }deg, #e5e7eb 0deg)`,
                        }}
                      />

                      <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-white">
                        <span className="text-xl font-bold text-[#111827]">
                          {
                            child
                              .summary
                              .average_score
                          }
                        </span>
                      </div>
                    </div>

                    <div>
                      <p className="text-sm text-gray-500">
                        Rata-rata keseluruhan
                      </p>

                      <p className="mt-1 text-sm text-gray-600">
                        Berdasarkan{' '}
                        {
                          child
                            .summary
                            .total_grades
                        }{' '}
                        nilai.
                      </p>
                    </div>
                  </div>

                  <div>
                    <div className="mb-4 flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-[#E53935]" />

                      <h3 className="font-semibold text-[#111827]">
                        Performa per Kelas
                      </h3>
                    </div>

                    {child.classes
                      .length === 0 ? (
                      <p className="rounded-xl bg-gray-50 p-4 text-sm text-gray-500">
                        Belum ada data nilai.
                      </p>
                    ) : (
                      <div className="space-y-4">
                        {child.classes.map(
                          (item) => (
                            <div
                              key={
                                item.enrollment_id
                              }
                            >
                              <div className="mb-2 flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-medium text-[#111827]">
                                    {
                                      item.subject
                                    }
                                  </p>

                                  <p className="truncate text-xs text-gray-500">
                                    {
                                      item.class_name
                                    }
                                  </p>
                                </div>

                                <span className="font-bold text-[#E53935]">
                                  {
                                    item.average
                                  }
                                </span>
                              </div>

                              <div className="h-3 overflow-hidden rounded-full bg-gray-100">
                                <div
                                  className="h-full rounded-full bg-[#E53935]"
                                  style={{
                                    width: `${Math.min(
                                      Math.max(
                                        item.average,
                                        0,
                                      ),
                                      100,
                                    )}%`,
                                  }}
                                />
                              </div>
                            </div>
                          ),
                        )}
                      </div>
                    )}
                  </div>

                  <Link
                    href={`/dashboard/parent/grades/${child.id}`}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#111827] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1f2937]"
                  >
                    Lihat Detail Nilai
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              )}
            </article>
          )
        })}
      </section>
    </main>
  )
}