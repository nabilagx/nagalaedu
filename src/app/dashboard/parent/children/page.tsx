'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  AlertCircle,
  ArrowRight,
  GraduationCap,
  Loader2,
  RefreshCw,
  School,
  UsersRound,
} from 'lucide-react'

type Child = {
  id: string
  student_name: string
  grade_level: string
  school_name: string | null
  phone_number: string | null
  status: string

  academic: {
    class_count: number
    attendance_rate: number
    average_score: number
    total_grades: number
    needs_attention: boolean
  }
}

type ChildrenResponse = {
  children: Child[]
}

function statusLabel(status: string) {
  switch (status) {
    case 'ACTIVE':
      return 'Aktif'
    case 'INACTIVE':
      return 'Tidak Aktif'
    default:
      return status
  }
}

export default function ChildrenPage() {
  const [children, setChildren] = useState<
    Child[]
  >([])

  const [loading, setLoading] =
    useState(true)

  const [refreshing, setRefreshing] =
    useState(false)

  const [error, setError] =
    useState('')

  async function loadChildren(
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
      '/api/parent/children',
      {
        method: 'GET',
        cache: 'no-store',
      },
    )

    const result = await response.json()

    if (!response.ok) {
      throw new Error(
        result?.error ||
          'Gagal mengambil data anak.',
      )
    }

    setChildren(
      (result.children ?? []) as Child[],
    )
  } catch (err) {
    console.error(err)

    setError(
      err instanceof Error
        ? err.message
        : 'Gagal mengambil data anak.',
    )
  } finally {
    setLoading(false)
    setRefreshing(false)
  }
}

  useEffect(() => {
    loadChildren()
  }, [])

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-[#E53935]" />

          <p className="text-sm text-slate-500">
            Memuat data anak...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">

        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-[#E53935]">
              Portal Orang Tua
            </p>

            <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#111827] sm:text-3xl">
              Anak Saya
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Lihat informasi dan perkembangan
              belajar anak Anda.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              loadChildren(true)
            }
            disabled={refreshing}
            className="inline-flex w-fit items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw
              className={
                refreshing
                  ? 'h-4 w-4 animate-spin'
                  : 'h-4 w-4'
              }
            />

            Refresh
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />

              <div>
                <h2 className="font-bold text-red-900">
                  Data gagal dimuat
                </h2>

                <p className="mt-1 text-sm text-red-700">
                  {error}
                </p>

                <button
                  type="button"
                  onClick={() =>
                    loadChildren()
                  }
                  className="mt-3 text-sm font-semibold text-red-700 hover:underline"
                >
                  Coba lagi
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Empty */}
        {!error &&
          children.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
              <UsersRound className="mx-auto h-12 w-12 text-slate-300" />

              <h2 className="mt-4 text-lg font-bold text-[#111827]">
                Belum ada anak terdaftar
              </h2>

              <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
                Belum ada data siswa yang
                terhubung dengan akun orang tua
                ini.
              </p>
            </div>
          )}

        {/* Children */}
        {children.length > 0 && (
          <div className="grid gap-5 lg:grid-cols-2">
            {children.map((child) => (
              <ChildCard
                key={child.id}
                child={child}
              />
            ))}
          </div>
        )}

      </div>
    </div>
  )
}

function ChildCard({
  child,
}: {
  child: Child
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md">

      {/* Identity */}
      <div className="border-b border-slate-100 p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">

          <div className="flex min-w-0 items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#111827] text-white">
              <GraduationCap className="h-7 w-7" />
            </div>

            <div className="min-w-0">
              <h2 className="truncate text-lg font-bold text-[#111827]">
                {child.student_name}
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {child.grade_level}
              </p>
            </div>
          </div>

          <span
            className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
              child.status ===
              'ACTIVE'
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-slate-100 text-slate-500'
            }`}
          >
            {statusLabel(
              child.status,
            )}
          </span>

        </div>

        {child.school_name && (
          <div className="mt-4 flex items-center gap-2 text-sm text-slate-500">
            <School className="h-4 w-4 shrink-0" />
            <span className="truncate">
              {child.school_name}
            </span>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 divide-x divide-slate-100">
        <Stat
          label="Kelas"
          value={String(
            child.academic
              .class_count,
          )}
        />

        <Stat
          label="Kehadiran"
          value={`${child.academic.attendance_rate}%`}
        />

        <Stat
          label="Nilai"
          value={
            child.academic
              .average_score > 0
              ? child.academic.average_score.toFixed(
                  1,
                )
              : '-'
          }
        />
      </div>

      {/* Attention */}
      {child.academic
        .needs_attention && (
        <div className="border-t border-red-100 bg-red-50 px-5 py-3">
          <div className="flex items-center gap-2 text-sm font-medium text-red-700">
            <AlertCircle className="h-4 w-4" />

            <span>
              Ada perkembangan yang
              perlu diperhatikan.
            </span>
          </div>
        </div>
      )}

      {/* Action */}
      <div className="border-t border-slate-100 bg-slate-50 p-4">
        <Link
          href={`/dashboard/parent/children/${child.id}`}
          className="flex items-center justify-between rounded-xl bg-[#111827] px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          <span>
            Lihat Detail Anak
          </span>

          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

    </div>
  )
}

function Stat({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="p-4 text-center sm:p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-lg font-bold text-[#111827]">
        {value}
      </p>
    </div>
  )
}