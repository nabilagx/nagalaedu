"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ExternalLink,
  FileText,
  GraduationCap,
  Loader2,
  Pencil,
  RefreshCw,
  Save,
  Trash2,
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

type ModuleDetail = {
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

type ModuleData = {
  module: ModuleDetail
}

type Notification = {
  type: "success" | "error"
  message: string
}

export default function TutorModuleDetailPage({
  params,
}: {
  params: Promise<{
    id: string
  }>
}) {
  const [moduleId, setModuleId] = useState("")
  const [data, setData] = useState<ModuleData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState("")
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showDelete, setShowDelete] = useState(false)

  const [form, setForm] = useState({
    class_id: "",
    title: "",
    description: "",
    file_url: "",
  })

  const [classes, setClasses] = useState<ModuleClass[]>([])

  const [notification, setNotification] =
    useState<Notification | null>(null)

  const notificationTimeoutRef = useRef<
    ReturnType<typeof setTimeout> | null
  >(null)

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

  useEffect(() => {
    async function resolveParams() {
      const resolved = await params
      setModuleId(resolved.id)
    }

    resolveParams()
  }, [params])

  async function loadModule(
    id = moduleId,
    showRefresh = false
  ) {
    if (!id) return

    try {
      if (showRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }

      setError("")

      const response = await fetch(
        `/api/tutor/modules/${encodeURIComponent(id)}`,
        {
          method: "GET",
          cache: "no-store",
        }
      )

      const result = await response.json()

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Gagal memuat detail modul."
        )
      }

      setData(result)

      setForm({
        class_id: result.module.class_id,
        title: result.module.title,
        description:
          result.module.description ?? "",
        file_url:
          result.module.file_url ?? "",
      })

      // Ambil kelas tutor untuk dropdown edit
      const classesResponse = await fetch(
        "/api/tutor/modules",
        {
          method: "GET",
          cache: "no-store",
        }
      )

      if (classesResponse.ok) {
        const classesResult =
          await classesResponse.json()

        setClasses(
          classesResult.classes ?? []
        )
      }
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
    if (moduleId) {
      loadModule(moduleId)
    }
  }, [moduleId])

  function startEditing() {
    if (!data) return

    setForm({
      class_id: data.module.class_id,
      title: data.module.title,
      description:
        data.module.description ?? "",
      file_url:
        data.module.file_url ?? "",
    })

    setEditing(true)
  }

  async function handleSave(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault()

    try {
      setSaving(true)

      const response = await fetch(
        `/api/tutor/modules/${encodeURIComponent(
          moduleId
        )}`,
        {
          method: "PATCH",
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
          result.error ||
            "Gagal memperbarui modul."
        )
      }

      setEditing(false)

      await loadModule(moduleId)

      showNotification(
        "success",
        "Modul berhasil diperbarui."
      )
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Gagal memperbarui modul."

      showNotification("error", message)
    } finally {
      setSaving(false)
    }
  }

  function openDelete() {
    if (deleting) return

    setShowDelete(true)
  }

  async function handleDelete() {
    try {
      setDeleting(true)

      const response = await fetch(
        `/api/tutor/modules/${encodeURIComponent(
          moduleId
        )}`,
        {
          method: "DELETE",
        }
      )

      const result = await response.json()

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Gagal menghapus modul."
        )
      }

      setShowDelete(false)

      showNotification(
        "success",
        "Modul berhasil dihapus."
      )

      // Beri waktu toast terlihat sebelum redirect.
      setTimeout(() => {
        window.location.href =
          "/dashboard/tutor/modules"
      }, 800)
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Gagal menghapus modul."

      showNotification("error", message)
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-[#E53935]" />

          <p className="text-sm text-slate-500">
            Memuat detail modul...
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
                    onClick={() =>
                      loadModule(moduleId)
                    }
                    className="rounded-xl bg-[#E53935] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#D32F2F]"
                  >
                    Coba Lagi
                  </button>

                  <Link
                    href="/dashboard/tutor/modules"
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-[#111827] transition hover:bg-slate-50"
                  >
                    Kembali
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!data) return null

  const module = data.module

  return (
    <div className="p-4 sm:p-6 lg:p-8">

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

      <div className="mx-auto max-w-5xl space-y-6">

        {/* HEADER */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Link
              href="/dashboard/tutor/modules"
              className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-[#E53935]"
            >
              <ArrowLeft className="h-4 w-4" />
              Kembali ke Modul
            </Link>

            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#111827] text-white">
                <BookOpen className="h-7 w-7" />
              </div>

              <div className="min-w-0">
                <span className="text-sm font-semibold uppercase tracking-wider text-[#E53935]">
                  Modul Belajar
                </span>

                <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#111827] sm:text-3xl">
                  {module.title}
                </h1>

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                    {module.class.class_name}
                  </span>

                  <span className="text-sm text-slate-500">
                    {module.class.subject}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                loadModule(moduleId, true)
              }
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-[#111827] shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
            >
              <RefreshCw
                className={`h-4 w-4 ${
                  refreshing ? "animate-spin" : ""
                }`}
              />

              Perbarui Data
            </button>

            <button
              type="button"
              onClick={startEditing}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-[#111827] shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
            >
              <Pencil className="h-4 w-4" />
              Edit
            </button>

            <button
              type="button"
              onClick={openDelete}
              disabled={deleting}
              className="inline-flex items-center gap-2 rounded-xl bg-[#E53935] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#D32F2F] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {deleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}

              {deleting ? "Menghapus..." : "Hapus"}
            </button>
          </div>
        </div>

        {/* EDIT FORM */}
        {editing ? (
          <form
            onSubmit={handleSave}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="mb-5">
              <h2 className="text-lg font-bold text-[#111827]">
                Edit Modul
              </h2>

              <p className="mt-0.5 text-sm text-slate-500">
                Perbarui informasi modul pembelajaran.
              </p>
            </div>

            <div className="space-y-4">
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
                  {classes.map((item) => (
                    <option
                      key={item.id}
                      value={item.id}
                    >
                      {item.class_name} —{" "}
                      {item.subject}
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
                  required
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-[#111827] outline-none focus:border-[#E53935] focus:bg-white focus:ring-2 focus:ring-red-100"
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
                      description:
                        event.target.value,
                    })
                  }
                  rows={5}
                  className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-[#111827] outline-none focus:border-[#E53935] focus:bg-white focus:ring-2 focus:ring-red-100"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-[#111827]">
                  Link Materi
                  <span className="ml-1 font-normal text-slate-400">
                    (wajib)
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
            </div>

            <div className="mt-5 flex justify-end gap-2 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setEditing(false)}
                disabled={saving}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
              >
                Batal
              </button>

              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-[#E53935] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#D32F2F] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}

                {saving
                  ? "Menyimpan..."
                  : "Simpan Perubahan"}
              </button>
            </div>
          </form>
        ) : (
          <>
            {/* MODULE CONTENT */}
            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="p-5 sm:p-6">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-[#E53935]" />

                  <h2 className="font-bold text-[#111827]">
                    Deskripsi Modul
                  </h2>
                </div>

                {module.description ? (
                  <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-600">
                    {module.description}
                  </p>
                ) : (
                  <p className="mt-4 text-sm text-slate-400">
                    Belum ada deskripsi untuk modul ini.
                  </p>
                )}
              </div>

              {module.file_url && (
                <div className="border-t border-slate-100 bg-slate-50 p-5 sm:p-6">
                  <a
                    href={module.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl bg-[#111827] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Buka Materi
                  </a>
                </div>
              )}
            </section>

            {/* CLASS INFO */}
            <section className="space-y-4">
              <div>
                <h2 className="text-lg font-bold text-[#111827]">
                  Informasi Kelas
                </h2>

                <p className="mt-0.5 text-sm text-slate-500">
                  Kelas tempat modul ini digunakan.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#111827] text-white">
                    <GraduationCap className="h-6 w-6" />
                  </div>

                  <div className="min-w-0">
                    <h3 className="font-bold text-[#111827]">
                      {module.class.class_name}
                    </h3>

                    <p className="mt-1 text-sm text-slate-500">
                      {module.class.subject}
                    </p>

                    {module.class.description && (
                      <p className="mt-3 text-sm leading-6 text-slate-500">
                        {module.class.description}
                      </p>
                    )}
                  </div>
                </div>

                {(module.class.schedule_day ||
                  module.class.schedule_start) && (
                  <div className="mt-5 flex items-center gap-3 rounded-xl bg-slate-50 p-4">
                    <CalendarDays className="h-5 w-5 shrink-0 text-[#E53935]" />

                    <div>
                      <p className="text-xs font-medium text-slate-400">
                        Jadwal
                      </p>

                      <p className="mt-0.5 text-sm font-semibold text-[#111827]">
                        {module.class.schedule_day}{" "}
                        {module.class.schedule_start &&
                          `• ${module.class.schedule_start.slice(
                            0,
                            5
                          )}`}
                        {module.class.schedule_end &&
                          ` - ${module.class.schedule_end.slice(
                            0,
                            5
                          )}`}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* META */}
            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
              <div className="flex items-start gap-3">
                <BookOpen className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />

                <div>
                  <p className="text-sm font-semibold text-blue-900">
                    Informasi modul
                  </p>

                  <p className="mt-1 text-sm leading-6 text-blue-800">
                    Modul ini dibuat pada{" "}
                    {formatDate(module.created_at)}
                    {module.updated_at !==
                      module.created_at &&
                      ` dan terakhir diperbarui pada ${formatDate(
                        module.updated_at
                      )}`}
                    .
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* DELETE CONFIRMATION */}
      {showDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="px-5 py-5">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
                <Trash2 className="h-5 w-5 text-red-600" />
              </div>

              <div className="mt-4 text-center">
                <h2 className="text-lg font-bold text-gray-900">
                  Hapus Modul?
                </h2>

                <p className="mt-2 text-sm leading-6 text-gray-500">
                  Modul{" "}
                  <span className="font-semibold text-gray-700">
                    {module.title}
                  </span>{" "}
                  akan dihapus. Tindakan ini tidak dapat
                  dibatalkan.
                </p>
              </div>
            </div>

            <div className="flex gap-3 border-t border-gray-100 px-5 py-4">
              <button
                type="button"
                onClick={() => setShowDelete(false)}
                disabled={deleting}
                className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Batal
              </button>

              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deleting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Menghapus...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    Hapus
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date(value))
  } catch {
    return value
  }
}