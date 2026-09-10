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

type Student = {
  id: string
  student_name: string
  grade_level: string | null
  school_name: string | null
  phone_number: string | null
  status: string | null
  created_at: string
  updated_at: string
}

type StudentClass = {
  id: string
  enrollment_id: string | null
  class_name: string
  subject: string
  description: string | null
  schedule_day: string | null
  schedule_start: string | null
  schedule_end: string | null
  status: string
  attendance_rate: number
  average_score: number | null
}

type Grade = {
  enrollment_id: string
  class_id: string | null
  class_name: string
  subject: string
  score: number
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
  student: Student
  summary: {
    total_classes: number
    active_classes: number
    total_attendance: number
    present_attendance: number
    attendance_percentage: number
    total_grades: number
    average_score: number | null
    total_modules: number
  }
  classes: StudentClass[]
  attendance: {
    enrollment_id: string
    status: string
  }[]
  grades: Grade[]
  modules: Module[]
}

function formatTime(time: string | null) {
  if (!time) return "-"

  return time.slice(0, 5)
}

function formatScheduleDay(
  day: string | null
) {
  if (!day) {
    return "Jadwal belum diatur"
  }

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

  return "text-[#E53935]"
}

function StatusBadge({
  status,
}: {
  status: string | null
}) {
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
      {isActive ? "Aktif" : status ?? "Tidak diketahui"}
    </span>
  )
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

export default function TutorStudentDetailPage() {
  const params = useParams()

  const studentId = params.id as string

  const [data, setData] =
    useState<DashboardData | null>(null)

  const [loading, setLoading] =
    useState(true)

  const [refreshing, setRefreshing] =
    useState(false)

  const [error, setError] =
    useState("")

  async function fetchStudent(
    isRefresh = false
  ) {
    try {
      if (isRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }

      setError("")

      const response = await fetch(
        `/api/tutor/students/${studentId}`,
        {
          cache: "no-store",
        }
      )

      const result = await response.json()

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Gagal mengambil detail siswa"
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
    if (studentId) {
      fetchStudent()
    }
  }, [studentId])

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
              Gagal memuat siswa
            </p>

            <p className="mt-1">
              {error ||
                "Data siswa tidak tersedia."}
            </p>

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                onClick={() =>
                  fetchStudent(true)
                }
                className="inline-flex items-center gap-2 rounded-xl bg-[#E53935] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#d9322f]"
              >
                <RefreshCw className="h-4 w-4" />
                Coba lagi
              </button>

              <Link
                href="/dashboard/tutor/students"
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

  const student = data.student
  const summary = data.summary
  const classes = data.classes
  const grades = data.grades
  const modules = data.modules

  const initial = student.student_name
    .charAt(0)
    .toUpperCase()

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* HEADER */}
        <div>
          <Link
            href="/dashboard/tutor/students"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-[#111827]"
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali ke Siswa
          </Link>

          <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[#111827] text-xl font-bold text-white">
                {initial}
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <p className="text-sm font-semibold text-[#E53935]">
                    Detail Siswa
                  </p>

                  <StatusBadge
                    status={student.status}
                  />
                </div>

                <h1 className="mt-1 truncate text-2xl font-bold tracking-tight text-[#111827] sm:text-3xl">
                  {student.student_name}
                </h1>

                <p className="mt-1 text-sm text-slate-500">
                  {student.grade_level ??
                    "Jenjang belum tersedia"}
                  {student.school_name
                    ? ` • ${student.school_name}`
                    : ""}
                </p>
              </div>
            </div>

            <button
              onClick={() =>
                fetchStudent(true)
              }
              disabled={refreshing}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-[#111827] shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw
                className={[
                  "h-4 w-4",
                  refreshing
                    ? "animate-spin"
                    : "",
                ].join(" ")}
              />

              Refresh
            </button>
          </div>
        </div>

        {/* PROFILE */}
        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-[#111827]">
                <UsersRound className="h-5 w-5" />
              </div>

              <div>
                <h2 className="font-bold text-[#111827]">
                  Informasi Siswa
                </h2>

                <p className="text-sm text-slate-500">
                  Data dasar siswa yang Anda ampu.
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl bg-slate-50 p-4">
                <div className="flex items-center gap-2 text-slate-500">
                  <GraduationCap className="h-4 w-4" />

                  <span className="text-xs font-medium">
                    Jenjang
                  </span>
                </div>

                <p className="mt-2 font-semibold text-[#111827]">
                  {student.grade_level ??
                    "-"}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <div className="flex items-center gap-2 text-slate-500">
                  <School className="h-4 w-4" />

                  <span className="text-xs font-medium">
                    Sekolah
                  </span>
                </div>

                <p className="mt-2 font-semibold text-[#111827]">
                  {student.school_name ??
                    "-"}
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
                  Kelas aktif
                </span>

                <span className="font-bold text-[#111827]">
                  {summary.active_classes}
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
                  {summary.average_score ??
                    "-"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* SUMMARY */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            icon={
              <BookOpen className="h-5 w-5" />
            }
            label="Kelas"
            value={summary.total_classes}
            description="Kelas yang diikuti"
          />

          <SummaryCard
            icon={
              <CheckCircle2 className="h-5 w-5" />
            }
            label="Kehadiran"
            value={`${summary.attendance_percentage}%`}
            description={`${summary.present_attendance} kehadiran hadir`}
          />

          <SummaryCard
            icon={
              <GraduationCap className="h-5 w-5" />
            }
            label="Rata-rata Nilai"
            value={
              summary.average_score ?? "-"
            }
            description={`${summary.total_grades} data nilai`}
          />

          <SummaryCard
            icon={
              <FileText className="h-5 w-5" />
            }
            label="Modul"
            value={summary.total_modules}
            description="Modul dari kelas siswa"
          />
        </div>

        {/* CLASSES */}
        <section>
          <div className="mb-4">
            <h2 className="text-lg font-bold text-[#111827]">
              Kelas yang Diikuti
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Kelas yang menjadi tanggung jawab Anda
              untuk siswa ini.
            </p>
          </div>

          {classes.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                <BookOpen className="h-6 w-6" />
              </div>

              <h3 className="mt-4 text-base font-bold text-[#111827]">
                Belum ada kelas
              </h3>

              <p className="mt-2 text-sm text-slate-500">
                Siswa belum memiliki kelas aktif.
              </p>
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2">
              {classes.map((classItem) => (
                <Link
                  key={classItem.id}
                  href={`/dashboard/tutor/classes/${classItem.id}`}
                  className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
                >
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#111827] text-white">
                          <BookOpen className="h-5 w-5" />
                        </div>

                        <div className="min-w-0">
                          <h3 className="truncate font-bold text-[#111827]">
                            {classItem.class_name}
                          </h3>

                          <p className="mt-0.5 text-sm text-slate-500">
                            {classItem.subject}
                          </p>
                        </div>
                      </div>

                      <StatusBadge
                        status={
                          classItem.status
                        }
                      />
                    </div>

                    <div className="mt-5 flex items-center gap-2 text-sm text-slate-500">
                      <CalendarDays className="h-4 w-4 shrink-0" />

                      <span>
                        {formatScheduleDay(
                          classItem.schedule_day
                        )}
                      </span>
                    </div>

                    <div className="mt-2 flex items-center gap-2 text-sm text-slate-500">
                      <Clock3 className="h-4 w-4 shrink-0" />

                      <span>
                        {formatTime(
                          classItem.schedule_start
                        )}
                        {" - "}
                        {formatTime(
                          classItem.schedule_end
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 border-t border-slate-100 bg-slate-50">
                    <div className="p-4">
                      <p className="text-xs font-medium text-slate-500">
                        Kehadiran
                      </p>

                      <p className="mt-1 font-bold text-[#111827]">
                        {classItem.attendance_rate}%
                      </p>
                    </div>

                    <div className="border-l border-slate-100 p-4">
                      <p className="text-xs font-medium text-slate-500">
                        Nilai
                      </p>

                      <p
                        className={[
                          "mt-1 font-bold",
                          getScoreClass(
                            classItem.average_score
                          ),
                        ].join(" ")}
                      >
                        {classItem.average_score ??
                          "-"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-end border-t border-slate-100 bg-white px-5 py-3">
                    <ChevronRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-1 group-hover:text-[#111827]" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* GRADES */}
        <section>
          <div className="mb-4">
            <h2 className="text-lg font-bold text-[#111827]">
              Nilai
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Rekap nilai siswa dari kelas Anda.
            </p>
          </div>

          {grades.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                <GraduationCap className="h-6 w-6" />
              </div>

              <h3 className="mt-4 text-base font-bold text-[#111827]">
                Belum ada nilai
              </h3>

              <p className="mt-2 text-sm text-slate-500">
                Belum ada nilai yang tercatat untuk
                siswa ini.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="divide-y divide-slate-100">
                {grades.map((grade, index) => (
                  <div
                    key={`${grade.enrollment_id}-${grade.subject}-${index}`}
                    className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-[#111827]">
                        <Star className="h-4 w-4" />
                      </div>

                      <div className="min-w-0">
                        <p className="font-semibold text-[#111827]">
                          {grade.subject}
                        </p>

                        <p className="mt-0.5 text-sm text-slate-500">
                          {grade.class_name}
                        </p>
                      </div>
                    </div>

                    <div
                      className={[
                        "text-xl font-bold",
                        getScoreClass(
                          grade.score
                        ),
                      ].join(" ")}
                    >
                      {grade.score}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* MODULES */}
        <section>
          <div className="mb-4">
            <h2 className="text-lg font-bold text-[#111827]">
              Modul Belajar
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Modul pembelajaran dari kelas yang
              diikuti siswa.
            </p>
          </div>

          {modules.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                <FileText className="h-6 w-6" />
              </div>

              <h3 className="mt-4 text-base font-bold text-[#111827]">
                Belum ada modul
              </h3>

              <p className="mt-2 text-sm text-slate-500">
                Belum ada modul pembelajaran yang
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
      </div>
    </div>
  )
}