'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  ArrowLeft,
  AlertTriangle,
  BookOpen,
  CalendarCheck,
  CheckCircle2,
  GraduationCap,
  RefreshCw,
  School,
  TrendingUp,
  UserRound,
} from 'lucide-react'

type AcademicDetail = {
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

  academic: {
    active_classes: number
    total_grades: number
    average_score: number
    attendance_percentage: number
    total_attendance: number
    present_count: number
    sick_count: number
    permission_count: number
    alpha_count: number
    needs_attention: boolean
  }

  classes: Array<{
    enrollment_id: string
    class_id: string
    class_name: string
    subject: string
    status: string | null
    attendance_percentage: number
    average_score: number
    total_grades: number
  }>

  grades: Array<{
    enrollment_id: string
    subject: string
    score: number
  }>
}

type AcademicResponse = AcademicDetail

export default function ParentAcademicDetailPage() {
  const params = useParams<{
    id: string
  }>()

  const id = params.id

  const [data, setData] =
    useState<AcademicResponse | null>(null)

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
        `/api/parent/academic/${id}`,
        {
          method: 'GET',
          cache: 'no-store',
        },
      )

      const result = await response.json()

      if (!response.ok) {
        throw new Error(
          result?.error ||
            'Gagal mengambil detail akademik.',
        )
      }

      setData(result as AcademicResponse)
    } catch (err) {
      console.error(err)

      setError(
        err instanceof Error
          ? err.message
          : 'Gagal mengambil detail akademik.',
      )
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    if (id) {
      loadAcademic()
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

          <div className="h-80 rounded-2xl bg-gray-200" />
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
            href="/dashboard/parent/academic"
            className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-gray-600 transition hover:text-[#111827]"
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali ke Akademik
          </Link>

          <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />

              <div>
                <h2 className="font-semibold text-red-900">
                  Gagal memuat detail akademik
                </h2>

                <p className="mt-1 text-sm text-red-700">
                  {error ||
                    'Data akademik tidak ditemukan.'}
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

  const {
    student,
    academic,
    classes,
    grades,
  } = data

  // ============================================
  // MAIN
  // ============================================

  return (
    <main className="p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-6xl">
        {/* BACK + HEADER */}
        <div className="mb-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <Link
                href="/dashboard/parent/academic"
                className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-gray-500 transition hover:text-[#111827]"
              >
                <ArrowLeft className="h-4 w-4" />
                Kembali ke Akademik
              </Link>

              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#111827] text-white">
                  <GraduationCap className="h-6 w-6" />
                </div>

                <div>
                  <h1 className="text-2xl font-bold text-[#111827]">
                    {student.student_name}
                  </h1>

                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-gray-500">
                    {student.grade_level && (
                      <span>
                        {student.grade_level}
                      </span>
                    )}

                    {student.school_name && (
                      <>
                        <span>•</span>

                        <span>
                          {student.school_name}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
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
        </div>

        {/* ATTENTION */}
        {academic.needs_attention && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />

              <div>
                <h2 className="font-semibold text-red-900">
                  Perkembangan anak perlu diperhatikan
                </h2>

                <p className="mt-1 text-sm leading-6 text-red-700">
                  Terdapat indikator akademik atau
                  kehadiran yang perlu dipantau lebih
                  lanjut.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* SUMMARY */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* CLASS */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <BookOpen className="h-5 w-5" />
            </div>

            <p className="mt-4 text-sm text-gray-500">
              Kelas Aktif
            </p>

            <p className="mt-1 text-2xl font-bold text-[#111827]">
              {academic.active_classes}
            </p>
          </div>

          {/* SCORE */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 text-green-600">
              <TrendingUp className="h-5 w-5" />
            </div>

            <p className="mt-4 text-sm text-gray-500">
              Rata-rata Nilai
            </p>

            <p className="mt-1 text-2xl font-bold text-[#111827]">
              {academic.average_score || '-'}
            </p>
          </div>

          {/* ATTENDANCE */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
              <CalendarCheck className="h-5 w-5" />
            </div>

            <p className="mt-4 text-sm text-gray-500">
              Kehadiran
            </p>

            <p className="mt-1 text-2xl font-bold text-[#111827]">
              {academic.attendance_percentage}%
            </p>
          </div>

          {/* GRADES */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
              <GraduationCap className="h-5 w-5" />
            </div>

            <p className="mt-4 text-sm text-gray-500">
              Nilai Tercatat
            </p>

            <p className="mt-1 text-2xl font-bold text-[#111827]">
              {academic.total_grades}
            </p>
          </div>
        </div>

        {/* ATTENDANCE DETAIL */}
        <section className="mb-6 rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 p-5">
            <div className="flex items-center gap-2">
              <CalendarCheck className="h-5 w-5 text-[#E53935]" />

              <h2 className="font-bold text-[#111827]">
                Ringkasan Kehadiran
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-px bg-gray-100 sm:grid-cols-4">
            <div className="bg-white p-5">
              <p className="text-xs font-medium text-gray-500">
                Hadir
              </p>

              <p className="mt-1 text-xl font-bold text-green-600">
                {academic.present_count}
              </p>
            </div>

            <div className="bg-white p-5">
              <p className="text-xs font-medium text-gray-500">
                Sakit
              </p>

              <p className="mt-1 text-xl font-bold text-blue-600">
                {academic.sick_count}
              </p>
            </div>

            <div className="bg-white p-5">
              <p className="text-xs font-medium text-gray-500">
                Izin
              </p>

              <p className="mt-1 text-xl font-bold text-orange-600">
                {academic.permission_count}
              </p>
            </div>

            <div className="bg-white p-5">
              <p className="text-xs font-medium text-gray-500">
                Alpha
              </p>

              <p className="mt-1 text-xl font-bold text-red-600">
                {academic.alpha_count}
              </p>
            </div>
          </div>
        </section>

        {/* CLASS PERFORMANCE */}
        <section className="mb-6 rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 p-5">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-[#E53935]" />

              <h2 className="font-bold text-[#111827]">
                Performa Kelas
              </h2>
            </div>

            <p className="mt-1 text-sm text-gray-500">
              Ringkasan nilai dan kehadiran setiap
              kelas aktif.
            </p>
          </div>

          {classes.length === 0 ? (
            <div className="p-8 text-center">
              <BookOpen className="mx-auto h-8 w-8 text-gray-400" />

              <p className="mt-3 text-sm text-gray-500">
                Belum ada kelas aktif.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {classes.map((classItem) => (
                <div
                  key={classItem.enrollment_id}
                  className="p-5"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="font-semibold text-[#111827]">
                        {classItem.subject}
                      </h3>

                      <p className="mt-1 text-sm text-gray-500">
                        {classItem.class_name}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 sm:flex">
                      <div className="rounded-xl bg-gray-50 px-4 py-3">
                        <p className="text-xs text-gray-500">
                          Nilai
                        </p>

                        <p className="mt-1 font-bold text-[#111827]">
                          {classItem.average_score ||
                            '-'}
                        </p>
                      </div>

                      <div className="rounded-xl bg-gray-50 px-4 py-3">
                        <p className="text-xs text-gray-500">
                          Kehadiran
                        </p>

                        <p className="mt-1 font-bold text-[#111827]">
                          {
                            classItem.attendance_percentage
                          }
                          %
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* GRADES */}
        <section className="mb-6 rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 p-5">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-[#E53935]" />

              <h2 className="font-bold text-[#111827]">
                Daftar Nilai
              </h2>
            </div>

            <p className="mt-1 text-sm text-gray-500">
              Nilai akademik yang telah dicatat oleh
              tutor.
            </p>
          </div>

          {grades.length === 0 ? (
            <div className="p-8 text-center">
              <GraduationCap className="mx-auto h-8 w-8 text-gray-400" />

              <p className="mt-3 text-sm text-gray-500">
                Belum ada nilai yang tercatat.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {grades.map((grade, index) => {
                const score =
                  Number(grade.score)

                const scoreClass =
                  score >= 80
                    ? 'bg-green-50 text-green-700'
                    : score >= 70
                      ? 'bg-blue-50 text-blue-700'
                      : 'bg-red-50 text-red-700'

                return (
                  <div
                    key={`${grade.enrollment_id}-${index}`}
                    className="flex items-center justify-between gap-4 p-5"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100">
                        <School className="h-4 w-4 text-gray-600" />
                      </div>

                      <div className="min-w-0">
                        <p className="truncate font-medium text-[#111827]">
                          {grade.subject}
                        </p>

                        <p className="mt-0.5 text-xs text-gray-500">
                          Nilai akademik
                        </p>
                      </div>
                    </div>

                    <span
                      className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-bold ${scoreClass}`}
                    >
                      {score}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* STUDENT INFO */}
        <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 p-5">
            <div className="flex items-center gap-2">
              <UserRound className="h-5 w-5 text-[#E53935]" />

              <h2 className="font-bold text-[#111827]">
                Informasi Anak
              </h2>
            </div>
          </div>

          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium text-gray-500">
                Nama
              </p>

              <p className="mt-1 font-medium text-[#111827]">
                {student.student_name}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium text-gray-500">
                Jenjang
              </p>

              <p className="mt-1 font-medium text-[#111827]">
                {student.grade_level || '-'}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium text-gray-500">
                Sekolah
              </p>

              <p className="mt-1 font-medium text-[#111827]">
                {student.school_name || '-'}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium text-gray-500">
                Status
              </p>

              <div className="mt-1 flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-green-600" />

                <span className="font-medium text-[#111827]">
                  {student.status || '-'}
                </span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}