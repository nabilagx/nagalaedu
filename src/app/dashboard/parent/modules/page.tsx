'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import {
  BookOpen,
  ChevronRight,
  FileText,
  GraduationCap,
  RefreshCw,
  School,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react'

type ClassInfo = {
  id: string
  class_name: string
  subject: string
}

type Child = {
  id: string
  student_name: string
  grade_level: string | null
  school_name: string | null
  classes: ClassInfo[]
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
  class: ClassInfo | null
}

function formatDate(value: string) {
  const date = new Date(value)

  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

export default function ParentModulesPage() {
  const [children, setChildren] = useState<Child[]>([])
  const [modules, setModules] = useState<Module[]>([])

  const [selectedChild, setSelectedChild] =
    useState<string>('all')

  const [selectedClass, setSelectedClass] =
    useState<string>('all')

  const [searchQuery, setSearchQuery] =
    useState('')

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

  async function loadModules(isRefresh = false) {
    try {
      setError('')

      if (isRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }

      const response = await fetch(
        '/api/parent/modules',
        {
          method: 'GET',
          cache: 'no-store',
        },
      )

      const result = await response.json()

      if (!response.ok) {
        throw new Error(
          result?.error ||
            'Gagal mengambil modul belajar.',
        )
      }

      setChildren(
        (result.children ?? []) as Child[],
      )

      setModules(
        (result.modules ?? []) as Module[],
      )
    } catch (err) {
      console.error(err)

      setError(
        err instanceof Error
          ? err.message
          : 'Gagal mengambil modul belajar.',
      )
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadModules()
  }, [])

  /*
   * Daftar kelas yang tersedia berdasarkan
   * anak yang sedang dipilih.
   */
  const availableClasses = useMemo(() => {
    const sourceChildren =
      selectedChild === 'all'
        ? children
        : children.filter(
            (child) =>
              child.id === selectedChild,
          )

    const classMap = new Map<string, ClassInfo>()

    sourceChildren.forEach((child) => {
      child.classes.forEach((classInfo) => {
        if (!classMap.has(classInfo.id)) {
          classMap.set(
            classInfo.id,
            classInfo,
          )
        }
      })
    })

    return Array.from(classMap.values()).sort(
      (a, b) =>
        a.class_name.localeCompare(
          b.class_name,
          'id',
        ),
    )
  }, [children, selectedChild])

  /*
   * Kalau anak berubah dan kelas yang sebelumnya
   * dipilih tidak tersedia untuk anak tersebut,
   * reset filter kelas.
   */
  useEffect(() => {
    if (
      selectedClass !== 'all' &&
      !availableClasses.some(
        (item) =>
          item.id === selectedClass,
      )
    ) {
      setSelectedClass('all')
    }
  }, [availableClasses, selectedClass])

  /*
   * Filter modul:
   * 1. Anak
   * 2. Kelas
   * 3. Search
   */
  const visibleModules = useMemo(() => {
    let result = [...modules]

    // Filter berdasarkan anak
    if (selectedChild !== 'all') {
      const child = children.find(
        (item) =>
          item.id === selectedChild,
      )

      if (!child) {
        return []
      }

      const childClassIds = new Set(
        child.classes.map(
          (item) => item.id,
        ),
      )

      result = result.filter((module) =>
        childClassIds.has(
          module.class_id,
        ),
      )
    }

    // Filter berdasarkan kelas
    if (selectedClass !== 'all') {
      result = result.filter(
        (module) =>
          module.class_id ===
          selectedClass,
      )
    }

    // Search
    const query =
      searchQuery.trim().toLowerCase()

    if (query) {
      result = result.filter((module) => {
        const searchableText = [
          module.title,
          module.description,
          module.class?.class_name,
          module.class?.subject,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()

        return searchableText.includes(query)
      })
    }

    return result
  }, [
    modules,
    children,
    selectedChild,
    selectedClass,
    searchQuery,
  ])

  const hasActiveFilter =
    selectedChild !== 'all' ||
    selectedClass !== 'all' ||
    searchQuery.trim() !== ''

  function resetFilters() {
    setSelectedChild('all')
    setSelectedClass('all')
    setSearchQuery('')
  }

  if (loading) {
    return (
      <main className="space-y-6 p-4 sm:p-6">
        <div>
          <div className="h-8 w-52 animate-pulse rounded-lg bg-gray-200" />
          <div className="mt-2 h-4 w-72 animate-pulse rounded bg-gray-100" />
        </div>

        <div className="h-14 animate-pulse rounded-2xl bg-gray-100" />

        <div className="grid gap-4 lg:grid-cols-2">
          {[1, 2, 3, 4].map((item) => (
            <div
              key={item}
              className="h-48 animate-pulse rounded-2xl bg-gray-100"
            />
          ))}
        </div>
      </main>
    )
  }

  return (
    <main className="space-y-6 p-4 sm:p-6">
      {/* HEADER */}
      <section className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#111827]">
            Modul Belajar
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Akses materi belajar sesuai kelas anak.
          </p>
        </div>

        <button
          type="button"
          onClick={() => loadModules(true)}
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

      {/* ERROR */}
      {error && (
        <section className="rounded-2xl border border-red-200 bg-red-50 p-5">
          <p className="font-semibold text-red-700">
            Gagal memuat modul
          </p>

          <p className="mt-1 text-sm text-red-600">
            {error}
          </p>
        </section>
      )}

      {!error && (
        <>
          {/* FILTER PANEL */}
          <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#111827] text-white">
                <SlidersHorizontal className="h-4 w-4" />
              </div>

              <div>
                <p className="text-sm font-semibold text-[#111827]">
                  Cari & Filter Modul
                </p>

                <p className="text-xs text-gray-500">
                  Temukan materi berdasarkan anak, kelas,
                  atau mata pelajaran.
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-3 lg:grid-cols-[1.5fr_1fr_1fr_auto]">
              {/* SEARCH */}
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />

                <input
                  type="text"
                  value={searchQuery}
                  onChange={(event) =>
                    setSearchQuery(
                      event.target.value,
                    )
                  }
                  placeholder="Cari modul, mata pelajaran, atau kelas..."
                  className="h-11 w-full rounded-xl border border-gray-200 bg-white pl-10 pr-10 text-sm text-[#111827] outline-none transition placeholder:text-gray-400 focus:border-[#E53935] focus:ring-2 focus:ring-red-100"
                />

                {searchQuery && (
                  <button
                    type="button"
                    onClick={() =>
                      setSearchQuery('')
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition hover:text-gray-700"
                    aria-label="Hapus pencarian"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* CHILD */}
              <select
                value={selectedChild}
                onChange={(event) =>
                  setSelectedChild(
                    event.target.value,
                  )
                }
                className="h-11 rounded-xl border border-gray-200 bg-white px-3 text-sm font-medium text-[#111827] outline-none transition focus:border-[#E53935] focus:ring-2 focus:ring-red-100"
              >
                <option value="all">
                  Semua Anak
                </option>

                {children.map((child) => (
                  <option
                    key={child.id}
                    value={child.id}
                  >
                    {child.student_name}
                  </option>
                ))}
              </select>

              {/* CLASS */}
              <select
                value={selectedClass}
                onChange={(event) =>
                  setSelectedClass(
                    event.target.value,
                  )
                }
                className="h-11 rounded-xl border border-gray-200 bg-white px-3 text-sm font-medium text-[#111827] outline-none transition focus:border-[#E53935] focus:ring-2 focus:ring-red-100"
              >
                <option value="all">
                  Semua Kelas
                </option>

                {availableClasses.map(
                  (classInfo) => (
                    <option
                      key={classInfo.id}
                      value={classInfo.id}
                    >
                      {classInfo.class_name}
                    </option>
                  ),
                )}
              </select>

              {/* RESET */}
              {hasActiveFilter && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 text-sm font-semibold text-gray-600 transition hover:bg-gray-50 hover:text-[#111827]"
                >
                  <X className="h-4 w-4" />
                  Reset
                </button>
              )}
            </div>

            {/* RESULT COUNT */}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-4">
              <p className="text-sm text-gray-500">
                Menampilkan{' '}
                <span className="font-semibold text-[#111827]">
                  {visibleModules.length}
                </span>{' '}
                modul
              </p>

              {selectedChild !== 'all' && (
                <div className="inline-flex items-center gap-1.5 rounded-full bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-600">
                  <GraduationCap className="h-3.5 w-3.5" />

                  {children.find(
                    (child) =>
                      child.id === selectedChild,
                  )?.student_name}
                </div>
              )}
            </div>
          </section>

          {/* EMPTY */}
          {visibleModules.length === 0 && (
            <section className="rounded-2xl border border-gray-200 bg-white p-10 text-center">
              <BookOpen className="mx-auto h-12 w-12 text-gray-300" />

              <h2 className="mt-4 text-lg font-semibold text-[#111827]">
                {hasActiveFilter
                  ? 'Modul tidak ditemukan'
                  : 'Belum ada modul belajar'}
              </h2>

              <p className="mx-auto mt-1 max-w-md text-sm text-gray-500">
                {hasActiveFilter
                  ? 'Coba ubah kata pencarian atau filter yang digunakan.'
                  : 'Materi yang tersedia untuk kelas anak akan muncul di halaman ini.'}
              </p>

              {hasActiveFilter && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#111827] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1f2937]"
                >
                  <X className="h-4 w-4" />
                  Reset Filter
                </button>
              )}
            </section>
          )}

          {/* MODULES */}
          {visibleModules.length > 0 && (
            <section className="grid gap-5 lg:grid-cols-2">
              {visibleModules.map((module) => (
                <article
                  key={module.id}
                  className="group overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="p-5">
                    <div className="flex items-start gap-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-50 text-[#E53935]">
                        <FileText className="h-5 w-5" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <h2 className="font-bold text-[#111827]">
                          {module.title}
                        </h2>

                        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500">
                          <span>
                            {module.class?.class_name ??
                              'Kelas tidak tersedia'}
                          </span>

                          <span>•</span>

                          <span>
                            {module.class?.subject ??
                              'Mata pelajaran'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {module.description && (
                      <p className="mt-4 line-clamp-3 text-sm leading-6 text-gray-600">
                        {module.description}
                      </p>
                    )}

                    <div className="mt-4 flex items-center justify-between gap-4 border-t border-gray-100 pt-4">
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        <School className="h-3.5 w-3.5" />

                        <span>
                          {formatDate(
                            module.created_at,
                          )}
                        </span>
                      </div>

                      <Link
                        href={`/dashboard/parent/modules/${module.id}`}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-[#111827] px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-[#1f2937]"
                      >
                        Lihat Modul
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </section>
          )}
        </>
      )}
    </main>
  )
}