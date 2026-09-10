"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import {
  ArrowLeft,
  Award,
  BarChart3,
  BookOpen,
  CheckCircle2,
  GraduationCap,
  Loader2,
  RefreshCw,
  School,
  User,
  XCircle,
} from "lucide-react"

type GradeDetail = {
  id: string
  enrollment_id: string
  class_id: string
  class_name: string
  class_subject: string
  subject: string
  score: number | null
}

type StudentClass = {
  id: string
  class_name: string
  subject: string
  description: string | null
  schedule_day: string | null
  schedule_start: string | null
  schedule_end: string | null
  status: string
  grade_count: number
  average_score: number
}

type GradesDetailData = {
  student: {
    id: string
    student_name: string
    grade_level: string | null
    school_name: string | null
    phone_number: string | null
    status: string | null
  }

  summary: {
    total_grades: number
    average_score: number
    highest_score: number
    lowest_score: number
    passed_count: number
    below_count: number
  }

  classes: StudentClass[]
  grades: GradeDetail[]
}

export default function TutorGradeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const [studentId, setStudentId] = useState("")
  const [data, setData] =
    useState<GradesDetailData | null>(null)

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    async function resolveParams() {
      const resolved = await params
      setStudentId(resolved.id)
    }

    resolveParams()
  }, [params])

  async function loadGrades(
    id = studentId,
    showRefresh = false
  ) {
    if (!id) return

    try {
      if (showRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }

      setError("")

      const response = await fetch(
        `/api/tutor/grades/${id}`,
        {
          method: "GET",
          cache: "no-store",
        }
      )

      const result = await response.json()

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Gagal memuat detail nilai."
        )
      }

      setData(result)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan saat memuat data."
      )
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    if (studentId) {
      loadGrades(studentId)
    }
  }, [studentId])

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-[#E53935]" />

          <p className="text-sm text-slate-500">
            Memuat detail nilai...
          </p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
            <div className="flex items-start gap-3">
              <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />

              <div>
                <h2 className="font-semibold text-red-800">
                  Gagal memuat detail nilai
                </h2>

                <p className="mt-1 text-sm text-red-700">
                  {error}
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      loadGrades(
                        studentId
                      )
                    }
                    className="rounded-xl bg-[#E53935] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#D32F2F]"
                  >
                    Coba Lagi
                  </button>

                  <Link
                    href="/dashboard/tutor/grades"
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-[#111827] transition hover:bg-slate-50"
                  >
                    Kembali
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!data) return null

  const averageClass =
    getScoreClass(data.summary.average_score)

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">

        {/* BACK + HEADER */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Link
              href="/dashboard/tutor/grades"
              className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-[#E53935]"
            >
              <ArrowLeft className="h-4 w-4" />
              Kembali ke Nilai
            </Link>

            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#111827] text-white">
                <GraduationCap className="h-7 w-7" />
              </div>

              <div className="min-w-0">
                <div className="mb-1 flex items-center gap-2">
                  <span className="text-sm font-semibold uppercase tracking-wider text-[#E53935]">
                    Detail Nilai
                  </span>
                </div>

                <h1 className="text-2xl font-bold tracking-tight text-[#111827] sm:text-3xl">
                  {data.student.student_name}
                </h1>

                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-500">
                  {data.student.grade_level && (
                    <span>
                      {data.student.grade_level}
                    </span>
                  )}

                  {data.student.grade_level &&
                    data.student.school_name && (
                      <span className="text-slate-300">
                        •
                      </span>
                    )}

                  {data.student.school_name && (
                    <span>
                      {data.student.school_name}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              loadGrades(
                studentId,
                true
              )
            }
            disabled={refreshing}
            className="inline-flex w-fit items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-[#111827] shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw
              className={`h-4 w-4 ${
                refreshing
                  ? "animate-spin"
                  : ""
              }`}
            />

            {refreshing
              ? "Memuat..."
              : "Refresh"}
          </button>
        </div>

        {/* STUDENT INFO */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <InfoCard
            icon={<User className="h-5 w-5" />}
            label="Siswa"
            value={data.student.student_name}
          />

          <InfoCard
            icon={<School className="h-5 w-5" />}
            label="Sekolah"
            value={
              data.student.school_name ||
              "Belum tersedia"
            }
          />

          <InfoCard
            icon={<BookOpen className="h-5 w-5" />}
            label="Jumlah Kelas"
            value={`${data.classes.length} kelas`}
          />
        </div>

        {/* SCORE SUMMARY */}
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-bold text-[#111827]">
              Ringkasan Nilai
            </h2>

            <p className="mt-0.5 text-sm text-slate-500">
              Gambaran umum performa akademik siswa.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <ScoreCard
              icon={
                <BarChart3 className="h-5 w-5" />
              }
              label="Rata-rata"
              value={
                data.summary.average_score
              }
              valueClass={
                averageClass
              }
            />

            <ScoreCard
              icon={
                <Award className="h-5 w-5" />
              }
              label="Nilai Tertinggi"
              value={
                data.summary.highest_score
              }
              valueClass="text-emerald-600"
            />

            <ScoreCard
              icon={
                <BarChart3 className="h-5 w-5" />
              }
              label="Nilai Terendah"
              value={
                data.summary.lowest_score
              }
              valueClass={getScoreClass(
                data.summary.lowest_score
              )}
            />

            <ScoreCard
              icon={
                <CheckCircle2 className="h-5 w-5" />
              }
              label="Nilai ≥ 70"
              value={
                data.summary.passed_count
              }
              valueClass="text-emerald-600"
            />

            <ScoreCard
              icon={
                <XCircle className="h-5 w-5" />
              }
              label="Nilai < 70"
              value={
                data.summary.below_count
              }
              valueClass="text-red-600"
            />
          </div>
        </section>

        {/* PERFORMANCE BAR */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">
                Rata-rata Nilai
              </p>

              <p
                className={`mt-1 text-3xl font-bold ${averageClass}`}
              >
                {data.summary.average_score}
              </p>
            </div>

            <div className="w-full sm:w-80">
              <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-[#E53935] transition-all"
                  style={{
                    width: `${Math.min(
                      Math.max(
                        data.summary.average_score,
                        0
                      ),
                      100
                    )}%`,
                  }}
                />
              </div>

              <div className="mt-1 flex justify-between text-[10px] font-medium text-slate-400">
                <span>0</span>
                <span>70</span>
                <span>100</span>
              </div>
            </div>
          </div>
        </div>

        {/* GRADES */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-[#111827]">
                Daftar Nilai
              </h2>

              <p className="mt-0.5 text-sm text-slate-500">
                Nilai yang tersimpan pada enrollment siswa.
              </p>
            </div>

            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              {data.grades.length} nilai
            </span>
          </div>

          {data.grades.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
                <BookOpen className="h-6 w-6 text-slate-400" />
              </div>

              <h3 className="mt-4 font-semibold text-[#111827]">
                Belum ada nilai
              </h3>

              <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
                Belum ada data nilai yang tersimpan untuk siswa ini.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="divide-y divide-slate-100">
                {data.grades.map((grade) => (
                  <div
                    key={grade.id}
                    className="flex flex-col gap-4 p-5 transition hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex min-w-0 items-start gap-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-[#111827]">
                        <BookOpen className="h-5 w-5" />
                      </div>

                      <div className="min-w-0">
                        <p className="font-bold text-[#111827]">
                          {grade.subject}
                        </p>

                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <span className="text-sm text-slate-500">
                            {grade.class_name}
                          </span>

                          <span className="text-slate-300">
                            •
                          </span>

                          <span className="text-sm text-slate-500">
                            {grade.class_subject}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-6 sm:justify-end">
                      <div className="text-left sm:text-right">
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                          Nilai
                        </p>

                        <p
                          className={`mt-0.5 text-2xl font-bold ${getScoreClass(
                            grade.score
                          )}`}
                        >
                          {grade.score ??
                            "-"}
                        </p>
                      </div>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          getScoreBadgeClass(
                            grade.score
                          )
                        }`}
                      >
                        {getScoreLabel(
                          grade.score
                        )}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* CLASS OVERVIEW */}
        {data.classes.length > 0 && (
          <section className="space-y-4">
            <div>
              <h2 className="text-lg font-bold text-[#111827]">
                Nilai Per Kelas
              </h2>

              <p className="mt-0.5 text-sm text-slate-500">
                Ringkasan nilai siswa pada setiap kelas.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {data.classes.map((item) => (
                <div
                  key={item.id}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                >
                  <div className="p-5">
                    <div className="flex items-start gap-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#111827] text-white">
                        <GraduationCap className="h-5 w-5" />
                      </div>

                      <div className="min-w-0">
                        <h3 className="font-bold text-[#111827]">
                          {item.class_name}
                        </h3>

                        <p className="mt-0.5 text-sm text-slate-500">
                          {item.subject}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-3">
                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-xs font-medium text-slate-500">
                          Jumlah Nilai
                        </p>

                        <p className="mt-1 text-lg font-bold text-[#111827]">
                          {item.grade_count}
                        </p>
                      </div>

                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-xs font-medium text-slate-500">
                          Rata-rata
                        </p>

                        <p
                          className={`mt-1 text-lg font-bold ${getScoreClass(
                            item.average_score
                          )}`}
                        >
                          {item.average_score}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 bg-slate-50 px-5 py-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-500">
                        Status performa
                      </span>

                      <span
                        className={`text-sm font-bold ${getScoreClass(
                          item.average_score
                        )}`}
                      >
                        {getScoreLabel(
                          item.average_score
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* NOTE */}
        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
          <div className="flex items-start gap-3">
            <BarChart3 className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />

            <div>
              <p className="text-sm font-semibold text-blue-900">
                Catatan data nilai
              </p>

              <p className="mt-1 text-sm leading-6 text-blue-800">
                Nilai ditampilkan berdasarkan data yang tersimpan
                pada tabel grades. Saat ini sistem belum memiliki
                kolom tanggal atau jenis penilaian, sehingga setiap
                nilai belum dapat dikategorikan sebagai tugas,
                ujian, kuis, atau semester tertentu.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function InfoCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-[#111827]">
          {icon}
        </div>

        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-500">
            {label}
          </p>

          <p className="mt-0.5 truncate text-sm font-bold text-[#111827]">
            {value}
          </p>
        </div>
      </div>
    </div>
  )
}

function ScoreCard({
  icon,
  label,
  value,
  valueClass = "text-[#111827]",
}: {
  icon: React.ReactNode
  label: string
  value: number
  valueClass?: string
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-[#111827]">
          {icon}
        </div>

        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-slate-500">
            {label}
          </p>

          <p
            className={`mt-0.5 text-xl font-bold ${valueClass}`}
          >
            {value}
          </p>
        </div>
      </div>
    </div>
  )
}

function getScoreClass(
  score: number | null
) {
  if (score === null) {
    return "text-slate-400"
  }

  if (score >= 80) {
    return "text-emerald-600"
  }

  if (score >= 70) {
    return "text-amber-600"
  }

  return "text-red-600"
}

function getScoreBadgeClass(
  score: number | null
) {
  if (score === null) {
    return "bg-slate-100 text-slate-500"
  }

  if (score >= 80) {
    return "bg-emerald-50 text-emerald-700"
  }

  if (score >= 70) {
    return "bg-amber-50 text-amber-700"
  }

  return "bg-red-50 text-red-700"
}

function getScoreLabel(
  score: number | null
) {
  if (score === null) {
    return "Belum ada nilai"
  }

  if (score >= 80) {
    return "Sangat Baik"
  }

  if (score >= 70) {
    return "Baik"
  }

  return "Perlu Perhatian"
}