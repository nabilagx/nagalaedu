"use client"

import Link from "next/link"

import {
  useEffect,
  useMemo,
  useState,
} from "react"

import {
  BookOpen,
  ChevronRight,
  ClipboardCheck,
  FileText,
  GraduationCap,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  XCircle,
} from "lucide-react"

type FeedbackClass = {
  id: string
  class_name: string
  subject: string
  schedule_day: string | null
  schedule_start: string | null
  schedule_end: string | null
  status: string
}

type FeedbackItem = {
  id: string
  enrollment_id: string
  student_id: string
  student_name: string
  grade_level: string | null
  school_name: string | null
  student_status: string | null
  class_id: string
  class_name: string
  class_subject: string
  schedule_day: string | null
  schedule_start: string | null
  schedule_end: string | null
  subject: string
  assessment_name: string | null
  score: number | null
  feedback_notes: string | null
  created_at: string
  updated_at: string
}

type ModulesData = {
  tutor: {
    id: string
    full_name: string
  }
  summary: {
    total_feedback: number
    total_students: number
    total_classes: number
    average_score: number | null
  }
  classes: FeedbackClass[]
  feedback: FeedbackItem[]
}

export default function TutorFeedbackPage() {
  const [data, setData] =
    useState<ModulesData | null>(null)

  const [loading, setLoading] =
    useState(true)

  const [refreshing, setRefreshing] =
    useState(false)

  const [error, setError] =
    useState("")

  const [search, setSearch] =
    useState("")

  const [selectedClass, setSelectedClass] =
    useState("ALL")

  async function loadFeedback(
    showRefresh = false
  ) {
    try {
      if (showRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }

      setError("")

      const response = await fetch(
        "/api/tutor/feedback",
        {
          method: "GET",
          cache: "no-store",
        }
      )

      const result =
        await response.json()

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Gagal memuat feedback."
        )
      }

      setData(result)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan saat memuat feedback."
      )
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadFeedback()
  }, [])

  const filteredFeedback = useMemo(() => {
    if (!data) return []

    const keyword =
      search.trim().toLowerCase()

    return data.feedback.filter(
      (item) => {
        const matchesSearch =
          !keyword ||
          item.student_name
            .toLowerCase()
            .includes(keyword) ||
          item.class_name
            .toLowerCase()
            .includes(keyword) ||
          item.subject
            .toLowerCase()
            .includes(keyword) ||
          (
            item.assessment_name ??
            ""
          )
            .toLowerCase()
            .includes(keyword) ||
          (
            item.feedback_notes ??
            ""
          )
            .toLowerCase()
            .includes(keyword)

        const matchesClass =
          selectedClass === "ALL" ||
          item.class_id ===
            selectedClass

        return (
          matchesSearch &&
          matchesClass
        )
      }
    )
  }, [
    data,
    search,
    selectedClass,
  ])

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

  function getScoreBadge(
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

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-[#E53935]" />
          <p className="text-sm text-slate-500">
            Memuat feedback...
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
                  Gagal memuat feedback
                </h2>

                <p className="mt-1 text-sm text-red-700">
                  {error}
                </p>

                <button
                  type="button"
                  onClick={() =>
                    loadFeedback()
                  }
                  className="mt-4 rounded-xl bg-[#E53935] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#D32F2F]"
                >
                  Coba Lagi
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">

        {/* HEADER */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-[#E53935]" />

              <span className="text-sm font-semibold uppercase tracking-wider text-[#E53935]">
                Pembelajaran
              </span>
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-[#111827] sm:text-3xl">
              Feedback
            </h1>

            <p className="mt-1 text-sm text-slate-500 sm:text-base">
              Berikan evaluasi dan catatan pembelajaran untuk siswa.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                loadFeedback(true)
              }
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-[#111827] shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
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

            <Link
              href="/dashboard/tutor/feedback/new"
              className="inline-flex items-center gap-2 rounded-xl bg-[#E53935] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#D32F2F]"
            >
              <Plus className="h-4 w-4" />
              Tambah Feedback
            </Link>
          </div>
        </div>

        {/* SUMMARY */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard
            icon={
              <ClipboardCheck className="h-5 w-5" />
            }
            label="Total Feedback"
            value={
              data.summary.total_feedback
            }
          />

          <SummaryCard
            icon={
              <GraduationCap className="h-5 w-5" />
            }
            label="Siswa"
            value={
              data.summary.total_students
            }
          />

          <SummaryCard
            icon={
              <BookOpen className="h-5 w-5" />
            }
            label="Kelas"
            value={
              data.summary.total_classes
            }
          />

          <SummaryCard
            icon={
              <FileText className="h-5 w-5" />
            }
            label="Rata-rata Nilai"
            value={
              data.summary.average_score ??
              0
            }
          />
        </div>

        {/* SEARCH */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

              <input
                type="text"
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="Cari siswa, assessment, mata pelajaran, atau feedback..."
                className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-11 text-sm text-[#111827] outline-none transition placeholder:text-slate-400 focus:border-[#E53935] focus:bg-white focus:ring-2 focus:ring-red-100"
              />

              {search && (
                <button
                  type="button"
                  onClick={() =>
                    setSearch("")
                  }
                  className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                  aria-label="Hapus pencarian"
                >
                  <XCircle className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="lg:w-72">
              <select
                value={selectedClass}
                onChange={(event) =>
                  setSelectedClass(
                    event.target.value
                  )
                }
                className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-[#111827] outline-none transition focus:border-[#E53935] focus:bg-white focus:ring-2 focus:ring-red-100"
              >
                <option value="ALL">
                  Semua Kelas
                </option>

                {data.classes.map(
                  (item) => (
                    <option
                      key={item.id}
                      value={item.id}
                    >
                      {item.class_name}
                    </option>
                  )
                )}
              </select>
            </div>
          </div>

          {(search ||
            selectedClass !==
              "ALL") && (
            <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
              <p className="text-xs text-slate-500">
                Menampilkan{" "}
                <span className="font-semibold text-[#111827]">
                  {
                    filteredFeedback.length
                  }
                </span>{" "}
                feedback
              </p>

              <button
                type="button"
                onClick={() => {
                  setSearch("")
                  setSelectedClass(
                    "ALL"
                  )
                }}
                className="text-xs font-semibold text-[#E53935] hover:underline"
              >
                Reset filter
              </button>
            </div>
          )}
        </div>

        {/* LIST */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-[#111827]">
                Daftar Feedback
              </h2>

              <p className="mt-0.5 text-sm text-slate-500">
                Evaluasi pembelajaran siswa berdasarkan assessment.
              </p>
            </div>

            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              {filteredFeedback.length} feedback
            </span>
          </div>

          {filteredFeedback.length ===
          0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
                <ClipboardCheck className="h-6 w-6 text-slate-400" />
              </div>

              <h3 className="mt-4 font-semibold text-[#111827]">
                {data.feedback.length ===
                0
                  ? "Belum ada feedback"
                  : "Feedback tidak ditemukan"}
              </h3>

              <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
                {data.feedback.length ===
                0
                  ? "Tambahkan feedback setelah memberikan penilaian kepada siswa."
                  : "Coba gunakan kata pencarian lain atau ubah filter kelas."}
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {filteredFeedback.map(
                (item) => (
                  <Link
                    key={item.id}
                    href={`/dashboard/tutor/feedback/${item.id}`}
                    className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
                  >
                    <div className="p-5">
                      <div className="flex items-start gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#111827] text-white">
                          <ClipboardCheck className="h-6 w-6" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <h3 className="font-bold text-[#111827] group-hover:text-[#E53935]">
                                {item.student_name}
                              </h3>

                              <div className="mt-1 flex flex-wrap items-center gap-2">
                                <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                                  {item.class_name}
                                </span>

                                <span className="text-xs text-slate-400">
                                  {item.subject}
                                </span>
                              </div>
                            </div>

                            <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-slate-300 transition group-hover:translate-x-1 group-hover:text-[#E53935]" />
                          </div>

                          <p className="mt-3 text-sm font-semibold text-[#111827]">
                            {item.assessment_name ||
                              "Assessment"}
                          </p>

                          <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500">
                            {item.feedback_notes ||
                              "Belum ada catatan feedback."}
                          </p>
                        </div>
                      </div>

                      <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
                        <div className="text-xs text-slate-400">
                          Nilai
                        </div>

                        <span
                          className={`rounded-lg px-2.5 py-1 text-sm font-bold ${getScoreBadge(
                            item.score
                          )}`}
                        >
                          <span
                            className={getScoreClass(
                              item.score
                            )}
                          >
                            {item.score ??
                              "-"}
                          </span>
                        </span>
                      </div>
                    </div>
                  </Link>
                )
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

function SummaryCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: number
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-[#111827]">
          {icon}
        </div>

        <div>
          <p className="text-xs font-medium text-slate-500">
            {label}
          </p>

          <p className="mt-0.5 text-xl font-bold text-[#111827]">
            {value}
          </p>
        </div>
      </div>
    </div>
  )
}