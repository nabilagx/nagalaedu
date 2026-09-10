'use client'

import { useEffect, useState } from 'react'

import Link from 'next/link'

import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  CalendarCheck,
  GraduationCap,
  Loader2,
  RefreshCw,
  UsersRound,
} from 'lucide-react'

type TutorClass = {
  id: string
  class_name: string
  subject: string
  schedule_day: string | null
  schedule_start: string | null
  schedule_end: string | null
  status: string
  student_count: number
  attendance_rate: number
}

type RecentModule = {
  id: string
  title: string
  description: string | null
  class_id: string
  class_name: string
  subject: string
  created_at: string
}

type DashboardData = {
  tutor: {
    id: string
    full_name: string
  }
  summary: {
    total_classes: number
    total_students: number
    total_attendance: number
    present_attendance: number
    attendance_percentage: number
    total_modules: number
    total_grades: number
  }
  classes: TutorClass[]
  recent_modules: RecentModule[]
}

function formatTime(value: string | null) {
  if (!value) return '-'

  return value.slice(0, 5)
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(value))
}

function getInitials(name: string) {
  return (
    name
      ?.split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0])
      .join('')
      .toUpperCase() || 'T'
  )
}

export default function TutorDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

  async function loadDashboard(isRefresh = false) {
    try {
      setError('')

      if (isRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }

      const response = await fetch('/api/tutor/dashboard', {
        method: 'GET',
        cache: 'no-store',
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(
          result?.error || 'Gagal mengambil data dashboard.',
        )
      }

      setData(result)
    } catch (err) {
      console.error(err)

      setError(
        err instanceof Error
          ? err.message
          : 'Gagal mengambil data dashboard.',
      )
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadDashboard()
  }, [])

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-[#E53935]" />

          <p className="text-sm text-slate-500">
            Memuat dashboard...
          </p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />

              <div className="flex-1">
                <h2 className="font-bold text-red-900">
                  Dashboard gagal dimuat
                </h2>

                <p className="mt-1 text-sm text-red-700">
                  {error}
                </p>

                <button
                  type="button"
                  onClick={() => loadDashboard()}
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#E53935] px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
                >
                  <RefreshCw className="h-4 w-4" />
                  Coba Lagi
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!data) {
    return null
  }

  const firstName =
    data.tutor.full_name?.split(' ')[0] || 'Tutor'

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-[#E53935]">
              Portal Tutor
            </p>

            <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#111827] sm:text-3xl">
              Selamat datang, {firstName}
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Kelola kelas dan pantau perkembangan siswa
              Anda.
            </p>
          </div>

          <button
            type="button"
            onClick={() => loadDashboard(true)}
            disabled={refreshing}
            className="inline-flex w-fit items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw
              className={`h-4 w-4 ${
                refreshing ? 'animate-spin' : ''
              }`}
            />

            Refresh
          </button>
        </div>

        {/* Summary */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            icon={BookOpen}
            label="Kelas Aktif"
            value={String(data.summary.total_classes)}
            description="Kelas yang Anda ajar"
          />

          <SummaryCard
            icon={UsersRound}
            label="Total Siswa"
            value={String(data.summary.total_students)}
            description="Siswa aktif di kelas Anda"
          />

          <SummaryCard
            icon={CalendarCheck}
            label="Kehadiran"
            value={`${data.summary.attendance_percentage}%`}
            description="Persentase kehadiran siswa"
          />

          <SummaryCard
            icon={GraduationCap}
            label="Modul Belajar"
            value={String(data.summary.total_modules)}
            description="Modul yang telah dibuat"
          />
        </div>

        {/* Classes */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-[#111827]">
                Kelas Saya
              </h2>

              <p className="text-sm text-slate-500">
                Ringkasan kelas yang sedang Anda ajar.
              </p>
            </div>

            <Link
              href="/dashboard/tutor/classes"
              className="hidden items-center gap-1 text-sm font-semibold text-[#E53935] hover:underline sm:flex"
            >
              Lihat semua
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {data.classes.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
              <BookOpen className="mx-auto h-10 w-10 text-slate-300" />

              <h3 className="mt-3 font-semibold text-slate-800">
                Belum ada kelas
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Belum ada kelas aktif yang ditugaskan kepada
                Anda.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {data.classes.map((item) => (
                <ClassCard
                  key={item.id}
                  item={item}
                />
              ))}
            </div>
          )}
        </section>

        {/* Recent Modules */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-[#111827]">
                Modul Terbaru
              </h2>

              <p className="text-sm text-slate-500">
                Materi pembelajaran yang baru ditambahkan.
              </p>
            </div>

            <Link
              href="/dashboard/tutor/modules"
              className="hidden items-center gap-1 text-sm font-semibold text-[#E53935] hover:underline sm:flex"
            >
              Lihat semua
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {data.recent_modules.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <div className="flex items-center gap-3">
                <BookOpen className="h-5 w-5 text-slate-400" />

                <div>
                  <p className="font-semibold text-slate-800">
                    Belum ada modul
                  </p>

                  <p className="text-sm text-slate-500">
                    Modul pembelajaran akan muncul setelah
                    Anda membuatnya.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <div className="divide-y divide-slate-100">
                {data.recent_modules.map((module) => (
                  <div
                    key={module.id}
                    className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-[#111827]">
                        <BookOpen className="h-5 w-5" />
                      </div>

                      <div className="min-w-0">
                        <p className="truncate font-semibold text-[#111827]">
                          {module.title}
                        </p>

                        <p className="mt-1 text-sm text-slate-500">
                          {module.class_name}
                          {' • '}
                          {module.subject}
                        </p>

                        {module.description && (
                          <p className="mt-1 line-clamp-1 text-xs text-slate-400">
                            {module.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0 text-left sm:text-right">
                      <p className="text-xs font-medium text-slate-400">
                        Ditambahkan
                      </p>

                      <p className="mt-1 text-xs font-semibold text-slate-600">
                        {formatDate(module.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Quick Actions */}
        <section>
          <div className="mb-4">
            <h2 className="text-lg font-bold text-[#111827]">
              Aksi Cepat
            </h2>

            <p className="text-sm text-slate-500">
              Akses fitur pembelajaran yang sering digunakan.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <QuickAction
              href="/dashboard/tutor/attendance"
              icon={CalendarCheck}
              title="Kehadiran"
              description="Kelola kehadiran siswa"
            />

            <QuickAction
              href="/dashboard/tutor/grades"
              icon={GraduationCap}
              title="Nilai"
              description="Kelola nilai siswa"
            />

            <QuickAction
              href="/dashboard/tutor/modules"
              icon={BookOpen}
              title="Modul Belajar"
              description="Kelola materi belajar"
            />

            <QuickAction
              href="/dashboard/tutor/students"
              icon={UsersRound}
              title="Siswa"
              description="Lihat daftar siswa"
            />
          </div>
        </section>
      </div>
    </div>
  )
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  description,
  danger = false,
}: {
  icon: typeof UsersRound
  label: string
  value: string
  description: string
  danger?: boolean
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-xl ${
            danger
              ? 'bg-red-50 text-[#E53935]'
              : 'bg-slate-100 text-[#111827]'
          }`}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>

      <p className="mt-4 text-sm font-medium text-slate-500">
        {label}
      </p>

      <p
        className={`mt-1 text-2xl font-bold ${
          danger ? 'text-[#E53935]' : 'text-[#111827]'
        }`}
      >
        {value}
      </p>

      <p className="mt-1 text-xs text-slate-400">
        {description}
      </p>
    </div>
  )
}

function ClassCard({
  item,
}: {
  item: TutorClass
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* Header */}
      <div className="border-b border-slate-100 p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#111827] text-white">
              <BookOpen className="h-6 w-6" />
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

          <span className="inline-flex shrink-0 items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-600">
            Aktif
          </span>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 divide-x divide-slate-100">
        <div className="p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Siswa
          </p>

          <p className="mt-1 text-xl font-bold text-[#111827]">
            {item.student_count}
          </p>

          <p className="mt-1 text-xs text-slate-500">
            siswa aktif
          </p>
        </div>

        <div className="p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Kehadiran
          </p>

          <p className="mt-1 text-xl font-bold text-[#111827]">
            {item.attendance_rate}%
          </p>

          <p className="mt-1 text-xs text-slate-500">
            tingkat kehadiran
          </p>
        </div>
      </div>

      {/* Schedule */}
      <div className="border-t border-slate-100 p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarCheck className="h-4 w-4 text-slate-400" />

            <span className="text-sm font-semibold text-slate-700">
              Jadwal
            </span>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {item.schedule_day && (
            <span className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-600">
              {item.schedule_day}
            </span>
          )}

          {item.schedule_start &&
            item.schedule_end && (
              <span className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-600">
                {formatTime(item.schedule_start)}
                {' – '}
                {formatTime(item.schedule_end)}
              </span>
            )}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-slate-100 bg-slate-50 p-4">
        <Link
          href={`/dashboard/tutor/classes/${item.id}`}
          className="flex items-center justify-between text-sm font-semibold text-[#E53935] hover:underline"
        >
          <span>Kelola kelas</span>

          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  )
}

function QuickAction({
  href,
  icon: Icon,
  title,
  description,
}: {
  href: string
  icon: typeof UsersRound
  title: string
  description: string
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-[#111827] transition group-hover:bg-[#111827] group-hover:text-white">
          <Icon className="h-5 w-5" />
        </div>

        <div className="min-w-0">
          <p className="font-semibold text-[#111827]">
            {title}
          </p>

          <p className="mt-1 text-xs text-slate-500">
            {description}
          </p>
        </div>
      </div>
    </Link>
  )
}