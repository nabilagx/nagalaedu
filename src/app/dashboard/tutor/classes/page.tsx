"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  BookOpen,
  CalendarDays,
  ChevronRight,
  Clock3,
  GraduationCap,
  Loader2,
  RefreshCw,
  UsersRound,
} from "lucide-react"

type TutorClass = {
  id: string
  class_name: string
  subject: string
  description: string | null
  schedule_day: string | null
  schedule_start: string | null
  schedule_end: string | null
  status: string
  student_count: number
  attendance_rate: number
}

type DashboardData = {
  tutor: {
    id: string
    full_name: string
  }
  summary: {
    total_classes: number
    active_classes: number
    total_students: number
  }
  classes: TutorClass[]
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

function SummaryCard({
  icon,
  label,
  value,
  description,
}: {
  icon: React.ReactNode
  label: string
  value: string | number
  description: string
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

        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-[#111827]">
          {icon}
        </div>
      </div>
    </div>
  )
}

function ClassCard({ item }: { item: TutorClass }) {
  return (
    <Link
      href={`/dashboard/tutor/classes/${item.id}`}
      className="group block overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
    >
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#111827] text-white">
              <BookOpen className="h-5 w-5" />
            </div>

            <div className="min-w-0">
              <h3 className="truncate text-base font-bold text-[#111827]">
                {item.class_name}
              </h3>

              <p className="mt-0.5 text-sm text-slate-500">
                {item.subject}
              </p>
            </div>
          </div>

          <StatusBadge status={item.status} />
        </div>

        {item.description && (
          <p className="mt-4 line-clamp-2 text-sm leading-6 text-slate-500">
            {item.description}
          </p>
        )}

        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-slate-50 p-3">
            <div className="flex items-center gap-2 text-slate-500">
              <UsersRound className="h-4 w-4" />

              <span className="text-xs font-medium">
                Siswa
              </span>
            </div>

            <p className="mt-1 text-lg font-bold text-[#111827]">
              {item.student_count}
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 p-3">
            <div className="flex items-center gap-2 text-slate-500">
              <CalendarDays className="h-4 w-4" />

              <span className="text-xs font-medium">
                Kehadiran
              </span>
            </div>

            <p className="mt-1 text-lg font-bold text-[#111827]">
              {item.attendance_rate}%
            </p>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2 text-sm text-slate-500">
          <Clock3 className="h-4 w-4 shrink-0" />

          <span>
            {formatScheduleDay(item.schedule_day)}
            {" • "}
            {formatTime(item.schedule_start)}
            {" - "}
            {formatTime(item.schedule_end)}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-5 py-3">
        <span className="text-sm font-semibold text-[#111827]">
          Kelola kelas
        </span>

        <ChevronRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-1 group-hover:text-[#111827]" />
      </div>
    </Link>
  )
}

export default function TutorClassesPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState("")

  async function fetchClasses(isRefresh = false) {
    try {
      if (isRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }

      setError("")

      const response = await fetch("/api/tutor/classes", {
        cache: "no-store",
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(
          result.error || "Gagal mengambil data kelas"
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
    fetchClasses()
  }, [])

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#E53935]" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
            <p className="font-semibold">
              Gagal memuat kelas
            </p>

            <p className="mt-1">
              {error}
            </p>

            <button
              onClick={() => fetchClasses(true)}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#E53935] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#d9322f]"
            >
              <RefreshCw className="h-4 w-4" />
              Coba lagi
            </button>
          </div>
        </div>
      </div>
    )
  }

  const summary = data?.summary ?? {
    total_classes: 0,
    active_classes: 0,
    total_students: 0,
  }

  const classes = data?.classes ?? []

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* HEADER */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-[#E53935]">
              Pembelajaran
            </p>

            <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#111827] sm:text-3xl">
              Kelas Saya
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Kelola kelas yang menjadi tanggung jawab Anda
              dan pantau perkembangan siswa.
            </p>
          </div>

          <button
            onClick={() => fetchClasses(true)}
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

        {/* SUMMARY */}
        <div className="grid gap-4 sm:grid-cols-3">
          <SummaryCard
            icon={<BookOpen className="h-5 w-5" />}
            label="Total Kelas"
            value={summary.total_classes}
            description="Kelas yang Anda ampu"
          />

          <SummaryCard
            icon={<CalendarDays className="h-5 w-5" />}
            label="Kelas Aktif"
            value={summary.active_classes}
            description="Kelas yang sedang berjalan"
          />

          <SummaryCard
            icon={<GraduationCap className="h-5 w-5" />}
            label="Total Siswa"
            value={summary.total_students}
            description="Siswa aktif di kelas Anda"
          />
        </div>

        {/* CLASS LIST */}
        <section>
          <div className="mb-4">
            <h2 className="text-lg font-bold text-[#111827]">
              Daftar Kelas
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Pilih kelas untuk melihat siswa, kehadiran,
              nilai, dan modul belajar.
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

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                Saat ini belum ada kelas yang ditugaskan
                kepada Anda.
              </p>
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {classes.map((item) => (
                <ClassCard
                  key={item.id}
                  item={item}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}