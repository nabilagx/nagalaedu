"use client"

import Link from "next/link"
import { useEffect, useMemo, useRef, useState } from "react"
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  FileText,
  GraduationCap,
  Link2,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  X,
  XCircle,
} from "lucide-react"

type ModuleClass = {
  id: string
  class_name: string
  subject: string
  description: string | null
  schedule_day: string | null
  schedule_start: string | null
  schedule_end: string | null
  status: string
}

type LearningModule = {
  id: string
  class_id: string
  tutor_id: string
  title: string
  description: string | null
  file_url: string | null
  created_at: string
  updated_at: string
  class: ModuleClass
}

type ModulesData = {
  tutor: {
    id: string
    full_name: string
  }
  summary: {
    total_modules: number
    total_classes: number
  }
  classes: ModuleClass[]
  modules: LearningModule[]
}

type Notification = {
  type: "success" | "error"
  message: string
}

export default function TutorModulesPage() {
  const [data, setData] = useState<ModulesData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState("")
  const [search, setSearch] = useState("")
  const [selectedClass, setSelectedClass] = useState("ALL")
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState("")

  const [notification, setNotification] =
    useState<Notification | null>(null)

  const notificationTimeoutRef = useRef<
    ReturnType<typeof setTimeout> | null
  >(null)

  const [form, setForm] = useState({
    class_id: "",
    title: "",
    description: "",
    file_url: "",
  })

  function showNotification(
    type: "success" | "error",
    message: string
  ) {
    if (notificationTimeoutRef.current) {
      clearTimeout(notificationTimeoutRef.current)
    }

    setNotification({
      type,
      message,
    })

    notificationTimeoutRef.current = setTimeout(() => {
      setNotification(null)
      notificationTimeoutRef.current = null
    }, 3500)
  }

  function closeNotification() {
    if (notificationTimeoutRef.current) {
      clearTimeout(notificationTimeoutRef.current)
      notificationTimeoutRef.current = null
    }

    setNotification(null)
  }

  useEffect(() => {
    return () => {
      if (notificationTimeoutRef.current) {
        clearTimeout(notificationTimeoutRef.current)
      }
    }
  }, [])

  async function loadModules(showRefresh = false) {
    try {
      if (showRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }

      setError("")

      const response = await fetch("/api/tutor/modules", {
        method: "GET",
        cache: "no-store",
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(
          result.error || "Gagal memuat data modul."
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
    loadModules()
  }, [])

  const filteredModules = useMemo(() => {
    if (!data) return []

    const keyword = search.trim().toLowerCase()

    return data.modules.filter((module) => {
      const matchesSearch =
        !keyword ||
        module.title.toLowerCase().includes(keyword) ||
        (module.description ?? "")
          .toLowerCase()
          .includes(keyword) ||
        module.class.class_name
          .toLowerCase()
          .includes(keyword) ||
        module.class.subject
          .toLowerCase()
          .includes(keyword)

      const matchesClass =
        selectedClass === "ALL" ||
        module.class_id === selectedClass

      return matchesSearch && matchesClass
    })
  }, [data, search, selectedClass])

  function openCreateModal() {
    setCreateError("")

    setForm({
      class_id: data?.classes[0]?.id ?? "",
      title: "",
      description: "",
      file_url: "",
    })

    setShowCreate(true)
  }

  async function handleCreate(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault()

    try {
      setCreating(true)
      setCreateError("")

      const response = await fetch(
        "/api/tutor/modules",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            class_id: form.class_id,
            title: form.title,
            description: form.description,
            file_url: form.file_url,
          }),
        }
      )

      const result = await response.json()

      if (!response.ok) {
        throw new Error(
          result.error || "Gagal membuat modul."
        )
      }

      setShowCreate(false)

      setForm({
        class_id: "",
        title: "",
        description: "",
        file_url: "",
      })

      await loadModules()

      showNotification(
        "success",
        "Modul berhasil ditambahkan."
      )
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Gagal membuat modul."

      setCreateError(message)

      showNotification("error", message)
    } finally {
      setCreating(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-[#E53935]" />
          <p className="text-sm text-slate-500">
            Memuat modul belajar...
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
                  Gagal memuat modul
                </h2>

                <p className="mt-1 text-sm text-red-700">
                  {error}
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => loadModules()}
                    className="rounded-xl bg-[#E53935] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#D32F2F]"
                  >
                    Coba Lagi
                  </button>
                </div>
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

        {/* TOAST */}
        {notification && (
          <div
            className="fixed right-4 top-4 z-[100] w-[calc(100%-2rem)] max-w-sm"
            aria-live="polite"
          >
            <div
              className={`rounded-2xl border bg-white p-4 shadow-xl ${
                notification.type === "success"
                  ? "border-emerald-200"
                  : "border-red-200"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 shrink-0">
                  {notification.type === "success" ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-900">
                    {notification.type === "success"
                      ? "Berhasil"
                      : "Gagal"}
                  </p>

                  <p className="mt-1 text-sm leading-5 text-gray-600">
                    {notification.message}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeNotification}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                  aria-label="Tutup notifikasi"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* HEADER */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-[#E53935]" />

              <span className="text-sm font-semibold uppercase tracking-wider text-[#E53935]">
                Pembelajaran
              </span>
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-[#111827] sm:text-3xl">
              Modul Belajar
            </h1>

            <p className="mt-1 text-sm text-slate-500 sm:text-base">
              Kelola materi pembelajaran untuk kelas yang Anda ajar.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => loadModules(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-[#111827] shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw
                className={`h-4 w-4 ${
                  refreshing ? "animate-spin" : ""
                }`}
              />

              {refreshing ? "Memuat..." : "Perbarui Data"}
            </button>

            <button
              type="button"
              onClick={openCreateModal}
              disabled={data.classes.length === 0}
              className="inline-flex items-center gap-2 rounded-xl bg-[#E53935] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#D32F2F] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              Tambah Modul
            </button>
          </div>
        </div>

        {/* SUMMARY */}
        <div className="grid gap-4 sm:grid-cols-2">
          <SummaryCard
            icon={<BookOpen className="h-5 w-5" />}
            label="Total Modul"
            value={data.summary.total_modules}
          />

          <SummaryCard
            icon={<GraduationCap className="h-5 w-5" />}
            label="Kelas"
            value={data.summary.total_classes}
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
                  setSearch(event.target.value)
                }
                placeholder="Cari judul modul, kelas, atau mata pelajaran..."
                className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-11 text-sm text-[#111827] outline-none transition placeholder:text-slate-400 focus:border-[#E53935] focus:bg-white focus:ring-2 focus:ring-red-100"
              />

              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
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
                  setSelectedClass(event.target.value)
                }
                className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-[#111827] outline-none transition focus:border-[#E53935] focus:bg-white focus:ring-2 focus:ring-red-100"
              >
                <option value="ALL">
                  Semua Kelas
                </option>

                {data.classes.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.class_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {(search || selectedClass !== "ALL") && (
            <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
              <p className="text-xs text-slate-500">
                Menampilkan{" "}
                <span className="font-semibold text-[#111827]">
                  {filteredModules.length}
                </span>{" "}
                modul
              </p>

              <button
                type="button"
                onClick={() => {
                  setSearch("")
                  setSelectedClass("ALL")
                }}
                className="text-xs font-semibold text-[#E53935] hover:underline"
              >
                Reset filter
              </button>
            </div>
          )}
        </div>

        {/* MODULE LIST */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-[#111827]">
                Daftar Modul
              </h2>

              <p className="mt-0.5 text-sm text-slate-500">
                Materi pembelajaran yang tersedia untuk kelas Anda.
              </p>
            </div>

            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              {filteredModules.length} modul
            </span>
          </div>

          {filteredModules.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
                <BookOpen className="h-6 w-6 text-slate-400" />
              </div>

              <h3 className="mt-4 font-semibold text-[#111827]">
                {data.modules.length === 0
                  ? "Belum ada modul"
                  : "Modul tidak ditemukan"}
              </h3>

              <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
                {data.modules.length === 0
                  ? "Tambahkan modul belajar untuk mulai menyediakan materi kepada siswa."
                  : "Coba gunakan kata pencarian yang berbeda atau ubah filter kelas."}
              </p>

              {data.modules.length === 0 &&
                data.classes.length > 0 && (
                  <button
                    type="button"
                    onClick={openCreateModal}
                    className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#E53935] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#D32F2F]"
                  >
                    <Plus className="h-4 w-4" />
                    Tambah Modul
                  </button>
                )}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {filteredModules.map((module) => (
                <Link
                  key={module.id}
                  href={`/dashboard/tutor/modules/${module.id}`}
                  className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
                >
                  <div className="p-5">
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#111827] text-white">
                        <FileText className="h-6 w-6" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="font-bold text-[#111827] group-hover:text-[#E53935]">
                              {module.title}
                            </h3>

                            <div className="mt-1 flex flex-wrap items-center gap-2">
                              <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                                {module.class.class_name}
                              </span>

                              <span className="text-xs text-slate-400">
                                {module.class.subject}
                              </span>
                            </div>
                          </div>

                          <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-slate-300 transition group-hover:translate-x-1 group-hover:text-[#E53935]" />
                        </div>

                        {module.description && (
                          <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-500">
                            {module.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        {module.file_url ? (
                          <>
                            <Link2 className="h-4 w-4" />
                            Ada materi
                          </>
                        ) : (
                          <>
                            <FileText className="h-4 w-4" />
                            Tanpa file
                          </>
                        )}
                      </div>

                      <span className="text-xs font-semibold text-[#E53935]">
                        Lihat detail
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* CLASS OVERVIEW */}
        {data.classes.length > 0 && (
          <section className="space-y-4">
            <div>
              <h2 className="text-lg font-bold text-[#111827]">
                Kelas Anda
              </h2>

              <p className="mt-0.5 text-sm text-slate-500">
                Jumlah modul berdasarkan kelas yang Anda ajar.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {data.classes.map((classItem) => {
                const moduleCount = data.modules.filter(
                  (module) =>
                    module.class_id === classItem.id
                ).length

                return (
                  <div
                    key={classItem.id}
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-[#111827]">
                        <GraduationCap className="h-5 w-5" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-[#111827]">
                          {classItem.class_name}
                        </h3>

                        <p className="mt-0.5 text-sm text-slate-500">
                          {classItem.subject}
                        </p>

                        <p className="mt-3 text-xs font-medium text-slate-400">
                          {moduleCount} modul
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}
      </div>

      {/* CREATE MODAL */}
      {showCreate && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#111827]/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="font-bold text-[#111827]">
                  Tambah Modul Belajar
                </h2>

                <p className="mt-0.5 text-xs text-slate-500">
                  Tambahkan materi untuk kelas Anda.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={handleCreate}
              className="space-y-4 p-5"
            >
              {createError && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {createError}
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-[#111827]">
                  Kelas
                </label>

                <select
                  value={form.class_id}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      class_id: event.target.value,
                    })
                  }
                  required
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-[#111827] outline-none focus:border-[#E53935] focus:bg-white focus:ring-2 focus:ring-red-100"
                >
                  <option value="">
                    Pilih kelas
                  </option>

                  {data.classes.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.class_name} — {item.subject}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-[#111827]">
                  Judul Modul
                </label>

                <input
                  type="text"
                  value={form.title}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      title: event.target.value,
                    })
                  }
                  placeholder="Contoh: Persamaan Kuadrat"
                  required
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-[#111827] outline-none placeholder:text-slate-400 focus:border-[#E53935] focus:bg-white focus:ring-2 focus:ring-red-100"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-[#111827]">
                  Deskripsi
                </label>

                <textarea
                  value={form.description}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      description: event.target.value,
                    })
                  }
                  placeholder="Jelaskan isi modul..."
                  rows={4}
                  className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-[#111827] outline-none placeholder:text-slate-400 focus:border-[#E53935] focus:bg-white focus:ring-2 focus:ring-red-100"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-[#111827]">
                  Link Materi
                  <span className="ml-1 font-normal text-slate-400">
                    (opsional)
                  </span>
                </label>

                <input
                  type="url"
                  value={form.file_url}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      file_url: event.target.value,
                    })
                  }
                  placeholder="https://..."
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-[#111827] outline-none placeholder:text-slate-400 focus:border-[#E53935] focus:bg-white focus:ring-2 focus:ring-red-100"
                />
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  disabled={creating}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#E53935] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#D32F2F] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {creating && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}

                  {creating
                    ? "Menyimpan..."
                    : "Simpan Modul"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
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