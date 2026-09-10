"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import {
  ArrowLeft,
  CalendarCheck,
  CheckCircle2,
  Clock3,
  Loader2,
  RefreshCw,
  School,
  UsersRound,
  XCircle,
} from "lucide-react"

type AttendanceClass = {
  id: string
  enrollment_id: string | null
  class_name: string
  subject: string
  schedule_day: string | null
  schedule_start: string | null
  schedule_end: string | null
  status: string
  total: number
  hadir: number
  izin: number
  sakit: number
  alpha: number
  percentage: number
}

type AttendanceData = {
  tutor: {
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
    total: number
    hadir: number
    izin: number
    sakit: number
    alpha: number
    percentage: number
    total_classes: number
  }

  classes: AttendanceClass[]
}

function formatTime(time: string | null) {
  if (!time) return "-"

  return time.slice(0, 5)
}

function formatDay(day: string | null) {
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

function getPercentageClass(
  percentage: number
) {
  if (percentage >= 80) {
    return "text-emerald-600"
  }

  if (percentage >= 70) {
    return "text-amber-600"
  }

  return "text-[#E53935]"
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

function StatusBadge({
  status,
}: {
  status: string | null
}) {
  const active = status === "ACTIVE"

  return (
    <span
      className={[
        "inline-flex rounded-full px-3 py-1 text-xs font-semibold",
        active
          ? "bg-emerald-50 text-emerald-700"
          : "bg-slate-100 text-slate-600",
      ].join(" ")}
    >
      {active ? "Aktif" : status ?? "-"}
    </span>
  )
}

function AttendanceStatus({
  label,
  value,
  className,
}: {
  label: string
  value: number
  className: string
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <p className="text-xs font-medium text-slate-500">
        {label}
      </p>

      <p
        className={[
          "mt-2 text-xl font-bold",
          className,
        ].join(" ")}
      >
        {value}
      </p>
    </div>
  )
}

export default function TutorAttendanceDetailPage() {
  const params = useParams()

  const studentId = params.id as string

  const [data, setData] =
    useState<AttendanceData | null>(null)

  const [loading, setLoading] =
    useState(true)

  const [refreshing, setRefreshing] =
    useState(false)

  const [error, setError] =
    useState("")

  async function fetchAttendance(
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
        `/api/tutor/attendance/${studentId}`,
        {
          cache: "no-store",
        }
      )

      const result =
        await response.json()

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Gagal mengambil detail kehadiran"
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
      fetchAttendance()
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
              Gagal memuat kehadiran
            </p>

            <p className="mt-1">
              {error ||
                "Data tidak tersedia."}
            </p>

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                onClick={() =>
                  fetchAttendance(true)
                }
                className="inline-flex items-center gap-2 rounded-xl bg-[#E53935] px-4 py-2 text-sm font-semibold text-white"
              >
                <RefreshCw className="h-4 w-4" />
                Coba lagi
              </button>

              <Link
                href="/dashboard/tutor/attendance"
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

  const initial = student.student_name
    .charAt(0)
    .toUpperCase()

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* HEADER */}
        <div>
          <Link
            href="/dashboard/tutor/attendance"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-[#111827]"
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali ke Kehadiran
          </Link>

          <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[#111827] text-xl font-bold text-white">
                {initial}
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <p className="text-sm font-semibold text-[#E53935]">
                    Detail Kehadiran
                  </p>

                  <StatusBadge
                    status={student.status}
                  />
                </div>

                <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#111827] sm:text-3xl">
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
                fetchAttendance(true)
              }
              disabled={refreshing}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-[#111827] shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
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

        {/* OVERALL */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            icon={
              <CalendarCheck className="h-5 w-5" />
            }
            label="Total Kehadiran"
            value={summary.total}
            description="Data yang tercatat"
          />

          <SummaryCard
            icon={
              <CheckCircle2 className="h-5 w-5" />
            }
            label="Hadir"
            value={summary.hadir}
            description="Status hadir"
          />

          <SummaryCard
            icon={
              <UsersRound className="h-5 w-5" />
            }
            label="Kelas"
            value={summary.total_classes}
            description="Kelas yang diikuti"
          />

          <SummaryCard
            icon={
              <CalendarCheck className="h-5 w-5" />
            }
            label="Persentase"
            value={`${summary.percentage}%`}
            description="Tingkat kehadiran"
            danger={
              summary.percentage < 70
            }
          />
        </div>

        {/* STATUS BREAKDOWN */}
        <section>
          <div className="mb-4">
            <h2 className="text-lg font-bold text-[#111827]">
              Rekap Status
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Ringkasan seluruh status kehadiran
              siswa.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <AttendanceStatus
              label="Hadir"
              value={summary.hadir}
              className="text-emerald-600"
            />

            <AttendanceStatus
              label="Izin"
              value={summary.izin}
              className="text-sky-600"
            />

            <AttendanceStatus
              label="Sakit"
              value={summary.sakit}
              className="text-amber-600"
            />

            <AttendanceStatus
              label="Alpha"
              value={summary.alpha}
              className="text-[#E53935]"
            />
          </div>
        </section>

        {/* OVERALL PROGRESS */}
        <section>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-bold text-[#111827]">
                  Tingkat Kehadiran
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Persentase berdasarkan data
                  kehadiran yang tersedia.
                </p>
              </div>

              <p
                className={[
                  "text-2xl font-bold",
                  getPercentageClass(
                    summary.percentage
                  ),
                ].join(" ")}
              >
                {summary.percentage}%
              </p>
            </div>

            <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-[#E53935] transition-all"
                style={{
                  width: `${Math.min(
                    summary.percentage,
                    100
                  )}%`,
                }}
              />
            </div>
          </div>
        </section>

        {/* CLASS BREAKDOWN */}
        <section>
          <div className="mb-4">
            <h2 className="text-lg font-bold text-[#111827]">
              Kehadiran per Kelas
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Rekap kehadiran siswa untuk setiap
              kelas.
            </p>
          </div>

          {classes.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                <CalendarCheck className="h-6 w-6" />
              </div>

              <h3 className="mt-4 font-bold text-[#111827]">
                Belum ada data
              </h3>

              <p className="mt-2 text-sm text-slate-500">
                Belum ada data kehadiran per kelas.
              </p>
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2">
              {classes.map((item) => (
                <div
                  key={item.id}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                >
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#111827] text-white">
                          <CalendarCheck className="h-5 w-5" />
                        </div>

                        <div className="min-w-0">
                          <h3 className="truncate font-bold text-[#111827]">
                            {item.class_name}
                          </h3>

                          <p className="mt-0.5 text-sm text-slate-500">
                            {item.subject}
                          </p>
                        </div>
                      </div>

                      <StatusBadge
                        status={item.status}
                      />
                    </div>

                    <div className="mt-5 space-y-2">
                      <div className="flex items-center gap-2 text-sm text-slate-500">
                        <CalendarCheck className="h-4 w-4" />

                        <span>
                          {formatDay(
                            item.schedule_day
                          )}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-slate-500">
                        <Clock3 className="h-4 w-4" />

                        <span>
                          {formatTime(
                            item.schedule_start
                          )}
                          {" - "}
                          {formatTime(
                            item.schedule_end
                          )}
                        </span>
                      </div>
                    </div>

                    <div className="mt-5">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-sm text-slate-500">
                          Kehadiran
                        </span>

                        <span
                          className={[
                            "font-bold",
                            getPercentageClass(
                              item.percentage
                            ),
                          ].join(" ")}
                        >
                          {item.percentage}%
                        </span>
                      </div>

                      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-[#E53935]"
                          style={{
                            width: `${Math.min(
                              item.percentage,
                              100
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 border-t border-slate-100 bg-slate-50">
                    <div className="p-4">
                      <p className="text-xs text-slate-500">
                        Hadir
                      </p>

                      <p className="mt-1 font-bold text-emerald-600">
                        {item.hadir}
                      </p>
                    </div>

                    <div className="border-l border-slate-100 p-4">
                      <p className="text-xs text-slate-500">
                        Izin
                      </p>

                      <p className="mt-1 font-bold text-sky-600">
                        {item.izin}
                      </p>
                    </div>

                    <div className="border-l border-slate-100 p-4">
                      <p className="text-xs text-slate-500">
                        Sakit
                      </p>

                      <p className="mt-1 font-bold text-amber-600">
                        {item.sakit}
                      </p>
                    </div>

                    <div className="border-l border-slate-100 p-4">
                      <p className="text-xs text-slate-500">
                        Alpha
                      </p>

                      <p className="mt-1 font-bold text-[#E53935]">
                        {item.alpha}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}