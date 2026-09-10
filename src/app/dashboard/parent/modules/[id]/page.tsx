'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  ArrowLeft,
  BookOpen,
  ExternalLink,
  FileText,
  GraduationCap,
  RefreshCw,
  School,
} from 'lucide-react'

type ModuleData = {
  module: {
    id: string
    class_id: string
    tutor_id: string
    title: string
    description: string | null
    file_url: string | null
    created_at: string
    updated_at: string
    class: {
      id: string
      class_name: string
      subject: string
      status: string | null
    } | null
    child: {
      id: string
      student_name: string
      grade_level: string | null
      school_name: string | null
    } | null
  }
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(value))
}

export default function ParentModuleDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params.id

  const [data, setData] = useState<ModuleData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

  async function loadModule(isRefresh = false) {
    try {
      setError('')

      if (isRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }

      const response = await fetch(
        `/api/parent/modules/${id}`,
        {
          method: 'GET',
          cache: 'no-store',
        },
      )

      const result = await response.json()

      if (!response.ok) {
        throw new Error(
          result?.error || 'Gagal mengambil modul.',
        )
      }

      setData(result as ModuleData)
    } catch (err) {
      console.error(err)

      setError(
        err instanceof Error
          ? err.message
          : 'Gagal mengambil modul.',
      )
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    if (id) {
      loadModule()
    }
  }, [id])

  if (loading) {
    return (
      <main className="space-y-6 p-4 sm:p-6">
        <div className="h-8 w-40 animate-pulse rounded-lg bg-gray-200" />
        <div className="h-56 animate-pulse rounded-2xl bg-gray-100" />
        <div className="h-40 animate-pulse rounded-2xl bg-gray-100" />
      </main>
    )
  }

  if (error) {
    return (
      <main className="space-y-5 p-4 sm:p-6">
        <Link
          href="/dashboard/parent/modules"
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 transition hover:text-[#111827]"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali ke Modul
        </Link>

        <section className="rounded-2xl border border-red-200 bg-red-50 p-6">
          <p className="font-semibold text-red-700">
            Tidak dapat membuka modul
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

  const { module } = data
  const classInfo = module.class
  const child = module.child

  return (
    <main className="space-y-6 p-4 sm:p-6">
      {/* HEADER */}
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href="/dashboard/parent/modules"
            className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-gray-500 transition hover:text-[#111827]"
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali ke Modul
          </Link>

          <h1 className="text-2xl font-bold text-[#111827]">
            Detail Modul
          </h1>
        </div>

        <button
          type="button"
          onClick={() => loadModule(true)}
          disabled={refreshing}
          className="inline-flex w-fit items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw
            className={`h-4 w-4 ${
              refreshing ? 'animate-spin' : ''
            }`}
          />
          Refresh
        </button>
      </section>

      {/* MODULE */}
      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 bg-gray-50 p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#111827] text-white">
              <BookOpen className="h-7 w-7" />
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-[#E53935]">
                  {classInfo?.subject ?? 'Mata Pelajaran'}
                </span>

                {classInfo?.status && (
                  <span className="rounded-full border border-green-200 bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700">
                    {classInfo.status === 'ACTIVE'
                      ? 'Aktif'
                      : classInfo.status}
                  </span>
                )}
              </div>

              <h2 className="mt-3 text-2xl font-bold text-[#111827]">
                {module.title}
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                {classInfo?.class_name ??
                  'Kelas tidak tersedia'}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-6 p-6">
          {/* CHILD */}
          {child && (
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[#111827] shadow-sm">
                  <GraduationCap className="h-5 w-5" />
                </div>

                <div>
                  <p className="text-xs text-gray-500">
                    Modul untuk
                  </p>

                  <p className="font-semibold text-[#111827]">
                    {child.student_name}
                  </p>

                  <p className="text-xs text-gray-500">
                    {child.grade_level ?? '-'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* DESCRIPTION */}
          <div>
            <h3 className="font-semibold text-[#111827]">
              Tentang Materi
            </h3>

            {module.description ? (
              <p className="mt-3 whitespace-pre-line text-sm leading-7 text-gray-600">
                {module.description}
              </p>
            ) : (
              <p className="mt-3 text-sm text-gray-400">
                Tidak ada deskripsi materi.
              </p>
            )}
          </div>

          {/* MATERIAL */}
          <div className="rounded-2xl border border-gray-200 p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-[#E53935]">
                <FileText className="h-5 w-5" />
              </div>

              <div>
                <h3 className="font-semibold text-[#111827]">
                  Materi Pembelajaran
                </h3>

                <p className="mt-1 text-sm leading-6 text-gray-500">
                  Materi disediakan melalui Google Drive.
                </p>
              </div>
            </div>

            {module.file_url ? (
              <a
                href={module.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 flex items-center justify-center gap-2 rounded-xl bg-[#E53935] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#c92f2f]"
              >
                Buka Materi di Google Drive
                <ExternalLink className="h-4 w-4" />
              </a>
            ) : (
              <div className="mt-5 rounded-xl bg-gray-50 p-4 text-center text-sm text-gray-500">
                Link materi belum tersedia.
              </div>
            )}
          </div>

          {/* INFO */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-gray-100 p-4">
              <div className="flex items-center gap-2 text-gray-400">
                <School className="h-4 w-4" />
                <span className="text-xs">
                  Kelas
                </span>
              </div>

              <p className="mt-2 font-semibold text-[#111827]">
                {classInfo?.class_name ??
                  'Kelas tidak tersedia'}
              </p>
            </div>

            <div className="rounded-xl border border-gray-100 p-4">
              <div className="flex items-center gap-2 text-gray-400">
                <FileText className="h-4 w-4" />
                <span className="text-xs">
                  Ditambahkan
                </span>
              </div>

              <p className="mt-2 font-semibold text-[#111827]">
                {formatDate(module.created_at)}
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}