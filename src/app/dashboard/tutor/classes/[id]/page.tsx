"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileText,
  GraduationCap,
  Loader2,
  RefreshCw,
  School,
  Star,
  UsersRound,
} from "lucide-react"

type ClassData = {
  id: string
  class_name: string
  subject: string
  description: string | null
  schedule_day: string | null
  schedule_start: string | null
  schedule_end: string | null
  status: string
  created_at: string
  updated_at: string
}

type Student = {
  id: string
  enrollment_id: string | null
  student_name: string
  grade_level: string | null
  school_name: string | null
  phone_number: string | null
  status: string | null
  attendance_rate: number
  average_score: number | null
}

type Module = {
  id: string
  class_id: string
  tutor_id: string
  title: string
  description: string | null
  file_url: string | null
  created_at: string
  updated_at: string
}

type DashboardData = {
  tutor: {
    id: string
    full_name: string
  }
  class: ClassData
  summary: {
    total_students: number
    total_attendance: number
    present_attendance: number
    attendance_percentage: number
    total_grades: number
    average_score: number | null
    total_modules: number
  }
  students: Student[]
  grades: {
    enrollment_id: string
    subject: string
    score: number
  }[]
  modules: Module[]
}

function formatTime(time: string | null) {
  if (!time) return "-"

  return time.slice(0, 5)
}

function formatScheduleDay(day: string | null) {
  if (!day) return "Jadwal belum diatur"

  const normalized = day.toUpperCase()

  const days: Record<string, string> = {
    SENIN: "Senin",
    SELASA: "Selasa",
    RABU: "Rabu",
    KAMIS: "Kamis",
    JUMAT: "Jumat",
    SABTU: "Sabtu",
    MINGGU: "Minggu",
  }

  return days[normalized] ?? day
}

function SummaryCard({
  icon,
  label,
  value,
  description,
  danger = false,
}: {
  icon: React.ReactNode
  label: string
  value: string | number
  description: string
  danger?: boolean
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">
            {label}
          </p>

          <p className="mt-2 text-2xl font-bold tracking-tight text-[#111827]">
            {value}
          </p>

          <p className="mt-1 text-xs text-slate-400">
            {description}
          </p>
        </div>

        <div
          className={[
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
            danger
              ? "bg-red-50 text-[#E53935]"
              : "bg-slate-100 text-[#111827]",
          ].join(" ")}
        >
          {icon}
        </div>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const isActive = status === "ACTIVE"

  return (
    <span
      className={[
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold",
        isActive
          ? "bg-emerald-50 text-emerald-700"
          : "bg-slate-100 text-slate-600",
      ].join(" ")}
    >
      {isActive ? "Aktif" : status}
    </span>
  )
}

function getScoreClass(score: number | null) {
  if (score === null) {
    return "text-slate-400"
  }

  if (score >= 80) {
    return "text-emerald-600"
  }

  if (score >= 70) {
    return "text-amber-600"
  }

  return "text-[#E53935]"
}

export default function TutorClassDetailPage() {
  const params = useParams()
  const classId = params.id as string

  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState("")

  async function fetchClass(isRefresh = false) {
    try {
      if (isRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }

      setError("")

      const response = await fetch(
        `/api/tutor/classes/${classId}`,
        {
          cache: "no-store",
        }
      )

      const result = await response.json()

      if (!response.ok) {
        throw new Error(
          result.error || "Gagal mengambil detail kelas"
        )
      }

      setData(result)
    } catch (err) {
      console.error(err)

      setError(
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan"
      )
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    if (classId) {
      fetchClass()
    }
  }, [classId])

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#E53935]" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
            <p className="font-semibold">
              Gagal memuat kelas
            </p>

            <p className="mt-1">
              {error || "Data kelas tidak tersedia."}
            </p>

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                onClick={() => fetchClass(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-[#E53935] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#d9322f]"
              >
                <RefreshCw className="h-4 w-4" />
                Coba lagi
              </button>

              <Link
                href="/dashboard/tutor/classes"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-[#111827]"
              >
                <ArrowLeft className="h-4 w-4" />
                Kembali
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const classInfo = data.class
  const summary = data.summary
  const students = data.students
  const modules = data.modules

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* HEADER */}
        <div>
          <Link
            href="/dashboard/tutor/classes"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-[#111827]"
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali ke Kelas Saya
          </Link>

          <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-sm font-semibold text-[#E53935]">
                  Detail Kelas
                </p>

                <StatusBadge status={classInfo.status} />
              </div>

              <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#111827] sm:text-3xl">
                {classInfo.class_name}
              </h1>

              <p className="mt-1 text-sm font-medium text-slate-500">
                {classInfo.subject}
              </p>

              {classInfo.description && (
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
                  {classInfo.description}
                </p>
              )}
            </div>

            <button
              onClick={() => fetchClass(true)}
              disabled={refreshing}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-[#111827] shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw
                className={[
                  "h-4 w-4",
                  refreshing ? "animate-spin" : "",
                ].join(" ")}
              />

              Refresh
            </button>
          </div>
        </div>

        {/* CLASS INFO */}
        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#111827] text-white">
                <BookOpen className="h-5 w-5" />
              </div>

              <div>
                <h2 className="font-bold text-[#111827]">
                  Informasi Kelas
                </h2>

                <p className="text-sm text-slate-500">
                  Jadwal dan informasi pembelajaran
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl bg-slate-50 p-4">
                <div className="flex items-center gap-2 text-slate-500">
                  <CalendarDays className="h-4 w-4" />

                  <span className="text-xs font-medium">
                    Hari
                  </span>
                </div>

                <p className="mt-2 font-semibold text-[#111827]">
                  {formatScheduleDay(
                    classInfo.schedule_day
                  )}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <div className="flex items-center gap-2 text-slate-500">
                  <Clock3 className="h-4 w-4" />

                  <span className="text-xs font-medium">
                    Jam
                  </span>
                </div>

                <p className="mt-2 font-semibold text-[#111827]">
                  {formatTime(classInfo.schedule_start)}
                  {" - "}
                  {formatTime(classInfo.schedule_end)}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Ringkasan
            </p>

            <div className="mt-4 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">
                  Siswa aktif
                </span>

                <span className="font-bold text-[#111827]">
                  {summary.total_students}
                </span>
              </div>

              <div className="h-px bg-slate-100" />

              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">
                  Kehadiran
                </span>

                <span className="font-bold text-[#111827]">
                  {summary.attendance_percentage}%
                </span>
              </div>

              <div className="h-px bg-slate-100" />

              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">
                  Rata-rata nilai
                </span>

                <span
                  className={[
                    "font-bold",
                    getScoreClass(
                      summary.average_score
                    ),
                  ].join(" ")}
                >
                  {summary.average_score ?? "-"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* SUMMARY CARDS */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            icon={<UsersRound className="h-5 w-5" />}
            label="Total Siswa"
            value={summary.total_students}
            description="Siswa aktif di kelas"
          />

          <SummaryCard
            icon={<CheckCircle2 className="h-5 w-5" />}
            label="Kehadiran"
            value={`${summary.attendance_percentage}%`}
            description={`${summary.present_attendance} kehadiran hadir`}
          />

          <SummaryCard
            icon={<GraduationCap className="h-5 w-5" />}
            label="Rata-rata Nilai"
            value={summary.average_score ?? "-"}
            description={`${summary.total_grades} data nilai`}
          />

          <SummaryCard
            icon={<FileText className="h-5 w-5" />}
            label="Modul Belajar"
            value={summary.total_modules}
            description="Modul untuk kelas ini"
          />
        </div>

        {/* STUDENTS */}
        <section>
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-[#111827]">
                Siswa
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Daftar siswa aktif di kelas ini.
              </p>
            </div>
          </div>

          {students.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                <UsersRound className="h-6 w-6" />
              </div>

              <h3 className="mt-4 text-base font-bold text-[#111827]">
                Belum ada siswa
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                Belum ada siswa aktif yang terdaftar
                di kelas ini.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="divide-y divide-slate-100">
                {students.map((student) => (
                  <div
                    key={student.id}
                    className="p-5 transition hover:bg-slate-50"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#111827] text-sm font-bold text-white">
                          {student.student_name
                            .charAt(0)
                            .toUpperCase()}
                        </div>

                        <div className="min-w-0">
                          <h3 className="truncate font-bold text-[#111827]">
                            {student.student_name}
                          </h3>

                          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                            {student.grade_level && (
                              <span>
                                {student.grade_level}
                              </span>
                            )}

                            {student.school_name && (
                              <>
                                <span className="text-slate-300">
                                  •
                                </span>

                                <span className="inline-flex items-center gap-1">
                                  <School className="h-3.5 w-3.5" />
                                  {student.school_name}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 sm:min-w-[260px]">
                        <div className="rounded-xl bg-slate-50 px-4 py-3">
                          <p className="text-xs font-medium text-slate-500">
                            Kehadiran
                          </p>

                          <p className="mt-1 font-bold text-[#111827]">
                            {student.attendance_rate}%
                          </p>
                        </div>

                        <div className="rounded-xl bg-slate-50 px-4 py-3">
                          <p className="text-xs font-medium text-slate-500">
                            Rata-rata Nilai
                          </p>

                          <p
                            className={[
                              "mt-1 font-bold",
                              getScoreClass(
                                student.average_score
                              ),
                            ].join(" ")}
                          >
                            {student.average_score ?? "-"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* MODULES */}
        <section>
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-[#111827]">
                Modul Belajar
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Modul pembelajaran yang tersedia untuk kelas.
              </p>
            </div>

            <Link
              href="/dashboard/tutor/modules"
              className="hidden items-center gap-1 text-sm font-semibold text-[#E53935] sm:inline-flex"
            >
              Lihat semua
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          {modules.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                <FileText className="h-6 w-6" />
              </div>

              <h3 className="mt-4 text-base font-bold text-[#111827]">
                Belum ada modul
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                Modul belajar untuk kelas ini belum
                tersedia.
              </p>
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2">
              {modules.map((module) => (
                <div
                  key={module.id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-[#111827]">
                      <FileText className="h-5 w-5" />
                    </div>

                    <div className="min-w-0">
                      <h3 className="font-bold text-[#111827]">
                        {module.title}
                      </h3>

                      {module.description && (
                        <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-500">
                          {module.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {module.file_url && (
                    <a
                      href={module.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#E53935] hover:underline"
                    >
                      Buka modul
                      <ChevronRight className="h-4 w-4" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* QUICK ACTIONS */}
        <section>
          <div className="mb-4">
            <h2 className="text-lg font-bold text-[#111827]">
              Aksi Cepat
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Langsung menuju pengelolaan pembelajaran.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Link
              href={`/dashboard/tutor/attendance`}
              className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-[#111827]">
                  <CalendarDays className="h-5 w-5" />
                </div>

                <ChevronRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-1 group-hover:text-[#111827]" />
              </div>

              <h3 className="mt-4 font-bold text-[#111827]">
                Kehadiran
              </h3>

              <p className="mt-1 text-sm leading-5 text-slate-500">
                Kelola kehadiran siswa.
              </p>
            </Link>

            <Link
              href={`/dashboard/tutor/grades`}
              className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-[#111827]">
                  <GraduationCap className="h-5 w-5" />
                </div>

                <ChevronRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-1 group-hover:text-[#111827]" />
              </div>

              <h3 className="mt-4 font-bold text-[#111827]">
                Nilai
              </h3>

              <p className="mt-1 text-sm leading-5 text-slate-500">
                Kelola nilai siswa.
              </p>
            </Link>

            <Link
              href={`/dashboard/tutor/modules`}
              className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-[#111827]">
                  <BookOpen className="h-5 w-5" />
                </div>

                <ChevronRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-1 group-hover:text-[#111827]" />
              </div>

              <h3 className="mt-4 font-bold text-[#111827]">
                Modul
              </h3>

              <p className="mt-1 text-sm leading-5 text-slate-500">
                Kelola materi pembelajaran.
              </p>
            </Link>

            <Link
              href={`/dashboard/tutor/students`}
              className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-[#111827]">
                  <UsersRound className="h-5 w-5" />
                </div>

                <ChevronRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-1 group-hover:text-[#111827]" />
              </div>

              <h3 className="mt-4 font-bold text-[#111827]">
                Siswa
              </h3>

              <p className="mt-1 text-sm leading-5 text-slate-500">
                Lihat daftar siswa Anda.
              </p>
            </Link>
          </div>
        </section>
      </div>
    </div>
  )
}