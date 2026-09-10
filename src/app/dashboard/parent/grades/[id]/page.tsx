'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  ArrowLeft,
  Award,
  BarChart3,
  BookOpen,
  GraduationCap,
  RefreshCw,
  School,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react'

type ViewMode = 'summary' | 'chart'

type GradeItem = {
  enrollment_id: string
  class_id: string | null
  class_name: string
  subject: string
  score: number
}

type ClassItem = {
  enrollment_id: string
  class_id: string
  class_name: string
  subject: string
  average: number
  total_grades: number
}

type SubjectItem = {
  subject: string
  average: number
  total_grades: number
}

type DetailData = {
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

  summary: {
    average_score: number
    highest_score: number
    lowest_score: number
    total_grades: number
    needs_attention: boolean
  }

  grades: GradeItem[]
  classes: ClassItem[]
  subjects: SubjectItem[]
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

export default function ParentGradesDetailPage() {
  const params =
    useParams<{ id: string }>()

  const id = params.id

  const [data, setData] =
    useState<DetailData | null>(null)

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
        `/api/parent/grades/${id}`,
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
            'Gagal mengambil detail nilai.',
        )
      }

      setData(result as DetailData)
    } catch (err) {
      console.error(err)

      setError(
        err instanceof Error
          ? err.message
          : 'Gagal mengambil detail nilai.',
      )
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    if (id) {
      loadGrades()
    }
  }, [id])

  if (loading) {
    return (
      <main className="space-y-6 p-4 sm:p-6">
        <div className="h-8 w-40 animate-pulse rounded-lg bg-gray-200" />

        <div className="h-40 animate-pulse rounded-2xl bg-gray-100" />

        <div className="h-80 animate-pulse rounded-2xl bg-gray-100" />
      </main>
    )
  }

  if (error) {
    return (
      <main className="space-y-5 p-4 sm:p-6">
        <Link
          href="/dashboard/parent/grades"
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-[#111827]"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali ke Nilai
        </Link>

        <section className="rounded-2xl border border-red-200 bg-red-50 p-6">
          <p className="font-semibold text-red-700">
            Gagal memuat data
          </p>

          <p className="mt-1 text-sm text-red-600">
            {error}
          </p>
        </section>
      </main>
    )
  }

  if (!data) {
    return null
  }

  const {
    student,
    summary,
    grades,
    classes,
    subjects,
  } = data

  const scoreStatus =
    getScoreStatus(
      summary.average_score,
    )

  return (
    <main className="space-y-6 p-4 sm:p-6">
      {/* HEADER */}
      <section className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <Link
            href="/dashboard/parent/grades"
            className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-gray-500 transition hover:text-[#111827]"
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali ke Nilai
          </Link>

          <h1 className="text-2xl font-bold text-[#111827]">
            Detail Nilai
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Rekap perkembangan akademik
            anak.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* TOGGLE */}
          <div className="flex rounded-xl border border-gray-200 bg-white p-1">
            <button
              type="button"
              onClick={() =>
                setViewMode('summary')
              }
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${
                viewMode === 'summary'
                  ? 'bg-[#111827] text-white'
                  : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              <BookOpen className="h-4 w-4" />
              Ringkasan
            </button>

            <button
              type="button"
              onClick={() =>
                setViewMode('chart')
              }
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${
                viewMode === 'chart'
                  ? 'bg-[#111827] text-white'
                  : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              <BarChart3 className="h-4 w-4" />
              Grafik
            </button>
          </div>

          <button
            type="button"
            onClick={() =>
              loadGrades(true)
            }
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
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

      {/* STUDENT PROFILE */}
      <section className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#111827] text-white">
              <GraduationCap className="h-7 w-7" />
            </div>

            <div>
              <h2 className="text-xl font-bold text-[#111827]">
                {student.student_name}
              </h2>

              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-500">
                <span>
                  {student.grade_level ??
                    '-'}
                </span>

                {student.school_name && (
                  <>
                    <span>•</span>

                    <span className="flex items-center gap-1">
                      <School className="h-4 w-4" />
                      {
                        student.school_name
                      }
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <span
            className={`w-fit rounded-full border px-3 py-1.5 text-xs font-semibold ${scoreStatus.className}`}
          >
            {scoreStatus.label}
          </span>
        </div>
      </section>

      {/* ATTENTION */}
      {summary.needs_attention && (
        <section className="flex gap-3 rounded-2xl border border-red-200 bg-red-50 p-5">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />

          <div>
            <p className="font-semibold text-red-700">
              Perlu pendampingan
            </p>

            <p className="mt-1 text-sm leading-6 text-red-600">
              Rata-rata nilai anak
              masih berada di bawah
              70. Perhatikan mata
              pelajaran dengan nilai
              rendah dan lakukan
              pendampingan belajar.
            </p>
          </div>
        </section>
      )}

      {/* SUMMARY */}
      {viewMode === 'summary' && (
        <>
          <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  Rata-rata
                </p>

                <Award className="h-5 w-5 text-[#E53935]" />
              </div>

              <p className="mt-3 text-3xl font-bold text-[#111827]">
                {summary.average_score}
              </p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  Tertinggi
                </p>

                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>

              <p className="mt-3 text-3xl font-bold text-green-600">
                {summary.highest_score}
              </p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  Terendah
                </p>

                <TrendingDown className="h-5 w-5 text-red-600" />
              </div>

              <p className="mt-3 text-3xl font-bold text-red-600">
                {summary.lowest_score}
              </p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  Jumlah Nilai
                </p>

                <BookOpen className="h-5 w-5 text-[#111827]" />
              </div>

              <p className="mt-3 text-3xl font-bold text-[#111827]">
                {summary.total_grades}
              </p>
            </div>
          </section>

          {/* SUBJECT TABLE */}
          <section className="rounded-2xl border border-gray-200 bg-white">
            <div className="border-b border-gray-100 p-5">
              <h2 className="font-bold text-[#111827]">
                Daftar Nilai
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Nilai yang tercatat dari
                seluruh kelas anak.
              </p>
            </div>

            {grades.length === 0 ? (
              <div className="p-8 text-center">
                <BookOpen className="mx-auto h-10 w-10 text-gray-300" />

                <p className="mt-3 text-sm text-gray-500">
                  Belum ada nilai yang
                  tercatat.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {grades.map(
                  (grade, index) => {
                    const status =
                      getScoreStatus(
                        grade.score,
                      )

                    return (
                      <div
                        key={`${grade.enrollment_id}-${grade.subject}-${index}`}
                        className="p-5"
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div className="min-w-0">
                            <p className="font-semibold text-[#111827]">
                              {
                                grade.subject
                              }
                            </p>

                            <p className="mt-1 text-xs text-gray-500">
                              {
                                grade.class_name
                              }
                            </p>
                          </div>

                          <div className="text-right">
                            <p className="text-2xl font-bold text-[#111827]">
                              {
                                grade.score
                              }
                            </p>

                            <span
                              className={`mt-1 inline-block rounded-full border px-2 py-0.5 text-[11px] font-medium ${status.className}`}
                            >
                              {
                                status.label
                              }
                            </span>
                          </div>
                        </div>

                        <div className="mt-4 h-2 overflow-hidden rounded-full bg-gray-100">
                          <div
                            className="h-full rounded-full bg-[#E53935]"
                            style={{
                              width: `${Math.min(
                                Math.max(
                                  grade.score,
                                  0,
                                ),
                                100,
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                    )
                  },
                )}
              </div>
            )}
          </section>

          {/* CLASS SUMMARY */}
          <section className="rounded-2xl border border-gray-200 bg-white p-5">
            <h2 className="font-bold text-[#111827]">
              Ringkasan per Kelas
            </h2>

            <div className="mt-4 space-y-3">
              {classes.length === 0 ? (
                <p className="rounded-xl bg-gray-50 p-4 text-sm text-gray-500">
                  Belum ada kelas aktif.
                </p>
              ) : (
                classes.map((item) => (
                  <div
                    key={
                      item.enrollment_id
                    }
                    className="rounded-xl border border-gray-100 p-4"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-medium text-[#111827]">
                          {
                            item.class_name
                          }
                        </p>

                        <p className="mt-1 text-xs text-gray-500">
                          {
                            item.subject
                          }{' '}
                          •{' '}
                          {
                            item.total_grades
                          }{' '}
                          nilai
                        </p>
                      </div>

                      <p className="text-xl font-bold text-[#E53935]">
                        {item.average}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </>
      )}

      {/* CHART */}
      {viewMode === 'chart' && (
        <section className="space-y-6">
          {/* OVERALL DONUT */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6">
            <div className="flex flex-col items-center justify-center gap-5 sm:flex-row">
              <div
                className="relative flex h-44 w-44 items-center justify-center rounded-full"
                style={{
                  background: `conic-gradient(#E53935 ${
                    summary.average_score *
                    3.6
                  }deg, #e5e7eb 0deg)`,
                }}
              >
                <div className="flex h-32 w-32 flex-col items-center justify-center rounded-full bg-white">
                  <span className="text-3xl font-bold text-[#111827]">
                    {
                      summary.average_score
                    }
                  </span>

                  <span className="text-xs text-gray-500">
                    rata-rata
                  </span>
                </div>
              </div>

              <div className="text-center sm:text-left">
                <h2 className="text-lg font-bold text-[#111827]">
                  Performa Akademik
                </h2>

                <p className="mt-2 max-w-md text-sm leading-6 text-gray-500">
                  Grafik menunjukkan posisi
                  rata-rata nilai dibandingkan
                  dengan skala maksimum 100.
                </p>

                <div className="mt-4 flex flex-wrap justify-center gap-3 sm:justify-start">
                  <div className="rounded-xl bg-gray-50 px-4 py-3">
                    <p className="text-xs text-gray-500">
                      Nilai tertinggi
                    </p>

                    <p className="font-bold text-green-600">
                      {
                        summary.highest_score
                      }
                    </p>
                  </div>

                  <div className="rounded-xl bg-gray-50 px-4 py-3">
                    <p className="text-xs text-gray-500">
                      Nilai terendah
                    </p>

                    <p className="font-bold text-red-600">
                      {
                        summary.lowest_score
                      }
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* SUBJECT BAR CHART */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6">
            <div className="mb-5 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-[#E53935]" />

              <h2 className="font-bold text-[#111827]">
                Nilai per Mata Pelajaran
              </h2>
            </div>

            {subjects.length === 0 ? (
              <p className="rounded-xl bg-gray-50 p-5 text-sm text-gray-500">
                Belum ada data nilai.
              </p>
            ) : (
              <div className="space-y-5">
                {subjects.map(
                  (subject) => {
                    const status =
                      getScoreStatus(
                        subject.average,
                      )

                    return (
                      <div
                        key={
                          subject.subject
                        }
                      >
                        <div className="mb-2 flex items-center justify-between gap-4">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-[#111827]">
                              {
                                subject.subject
                              }
                            </p>

                            <p className="text-xs text-gray-500">
                              {
                                subject.total_grades
                              }{' '}
                              nilai
                            </p>
                          </div>

                          <span
                            className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold ${status.className}`}
                          >
                            {
                              subject.average
                            }
                          </span>
                        </div>

                        <div className="h-4 overflow-hidden rounded-full bg-gray-100">
                          <div
                            className="h-full rounded-full bg-[#E53935] transition-all"
                            style={{
                              width: `${Math.min(
                                Math.max(
                                  subject.average,
                                  0,
                                ),
                                100,
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                    )
                  },
                )}
              </div>
            )}
          </div>

          {/* CLASS BAR CHART */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6">
            <div className="mb-5 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-[#E53935]" />

              <h2 className="font-bold text-[#111827]">
                Performa per Kelas
              </h2>
            </div>

            {classes.length === 0 ? (
              <p className="rounded-xl bg-gray-50 p-5 text-sm text-gray-500">
                Belum ada kelas aktif.
              </p>
            ) : (
              <div className="space-y-5">
                {classes.map((item) => (
                  <div
                    key={
                      item.enrollment_id
                    }
                  >
                    <div className="mb-2 flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[#111827]">
                          {
                            item.class_name
                          }
                        </p>

                        <p className="truncate text-xs text-gray-500">
                          {item.subject}
                        </p>
                      </div>

                      <span className="font-bold text-[#E53935]">
                        {item.average}
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
                ))}
              </div>
            )}
          </div>
        </section>
      )}
    </main>
  )
}