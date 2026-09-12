"use client"

import Link from "next/link"

import {
  useEffect,
  useRef,
  useState,
} from "react"

import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  GraduationCap,
  Loader2,
  Pencil,
  RefreshCw,
  School,
  Trash2,
  UserRound,
  XCircle,
} from "lucide-react"

type FeedbackDetail = {
  id: string
  enrollment_id: string
  student_id: string
  student_name: string
  grade_level: string | null
  school_name: string | null
  phone_number: string | null
  student_status: string | null
  class_id: string
  class_name: string
  class_subject: string
  class_description: string | null
  schedule_day: string | null
  schedule_start: string | null
  schedule_end: string | null
  class_status: string
  subject: string
  assessment_name: string | null
  score: number | null
  feedback_notes: string | null
  created_at: string
  updated_at: string
}

type ToastType = "success" | "error" | "info"

type Toast = {
  type: ToastType
  message: string
}

function ToastView({
  toast,
}: {
  toast: Toast
}) {
  const isSuccess = toast.type === "success"
  const isError = toast.type === "error"

  return (
    <div
      className="fixed right-4 top-4 z-[100] w-[calc(100%-2rem)] max-w-sm"
      aria-live="polite"
    >
      <div
        className={`rounded-2xl border bg-white p-4 shadow-xl ${
          isSuccess
            ? "border-emerald-200"
            : isError
              ? "border-red-200"
              : "border-blue-200"
        }`}
      >
        <div className="flex items-start gap-3">
          <div className="mt-0.5 shrink-0">
            {isSuccess ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            ) : isError ? (
              <XCircle className="h-5 w-5 text-red-600" />
            ) : (
              <AlertCircle className="h-5 w-5 text-blue-600" />
            )}
          </div>

          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900">
              {isSuccess
                ? "Berhasil"
                : isError
                  ? "Gagal"
                  : "Informasi"}
            </p>

            <p className="mt-1 text-sm leading-5 text-gray-600">
              {toast.message}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function TutorFeedbackDetailPage({
  params,
}: {
  params: Promise<{
    id: string
  }>
}) {
  const [feedback, setFeedback] =
    useState<FeedbackDetail | null>(null)

  const [loading, setLoading] =
    useState(true)

  const [refreshing, setRefreshing] =
    useState(false)

  const [error, setError] =
    useState("")

  const [editing, setEditing] =
    useState(false)

  const [saving, setSaving] =
    useState(false)

  const [deleting, setDeleting] =
    useState(false)

  const [form, setForm] =
    useState({
      subject: "",
      assessment_name: "",
      score: "",
      feedback_notes: "",
    })

  const [feedbackId, setFeedbackId] =
    useState("")

  const [showDelete, setShowDelete] =
    useState(false)

  const [toast, setToast] =
    useState<Toast | null>(null)

  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  )

  function showToast(
    type: ToastType,
    message: string
  ) {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current)
    }

    setToast({
      type,
      message,
    })

    toastTimeoutRef.current = setTimeout(() => {
      setToast(null)
      toastTimeoutRef.current = null
    }, 3500)
  }

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current)
      }
    }
  }, [])

  async function loadFeedback(
    showRefresh = false
  ) {
    try {
      if (showRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }

      setError("")

      const resolvedParams =
        await params

      setFeedbackId(
        resolvedParams.id
      )

      const response = await fetch(
        `/api/tutor/feedback/${resolvedParams.id}`,
        {
          method: "GET",
          cache: "no-store",
        }
      )

      const result =
        await response.json()

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Gagal memuat detail feedback."
        )
      }

      setFeedback(result.feedback)

      setForm({
        subject:
          result.feedback.subject ??
          "",
        assessment_name:
          result.feedback.assessment_name ??
          "",
        score:
          result.feedback.score !==
          null
            ? String(
                result.feedback.score
              )
            : "",
        feedback_notes:
          result.feedback.feedback_notes ??
          "",
      })

      if (showRefresh) {
        showToast(
          "success",
          "Data feedback berhasil diperbarui."
        )
      }
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan saat memuat feedback."

      setError(message)

      if (showRefresh) {
        showToast("error", message)
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadFeedback()
  }, [])

  async function handleSave(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault()

    try {
      setSaving(true)

      const response = await fetch(
        `/api/tutor/feedback/${feedbackId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            subject: form.subject,
            assessment_name:
              form.assessment_name,
            score: Number(form.score),
            feedback_notes:
              form.feedback_notes,
          }),
        }
      )

      const result =
        await response.json()

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Gagal menyimpan feedback."
        )
      }

      setEditing(false)

      await loadFeedback()

      showToast(
        "success",
        "Feedback berhasil diperbarui."
      )
    } catch (err) {
      showToast(
        "error",
        err instanceof Error
          ? err.message
          : "Gagal memperbarui feedback."
      )
    } finally {
      setSaving(false)
    }
  }

  function openDelete() {
    setShowDelete(true)
  }

  async function handleDelete() {
    try {
      setDeleting(true)

      const response = await fetch(
        `/api/tutor/feedback/${feedbackId}`,
        {
          method: "DELETE",
        }
      )

      const result =
        await response.json()

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Gagal menghapus feedback."
        )
      }

      setShowDelete(false)

      showToast(
        "success",
        "Feedback berhasil dihapus."
      )

      window.setTimeout(() => {
        window.location.href =
          "/dashboard/tutor/feedback"
      }, 800)
    } catch (err) {
      showToast(
        "error",
        err instanceof Error
          ? err.message
          : "Gagal menghapus feedback."
      )
    } finally {
      setDeleting(false)
    }
  }

  function getScoreBadge(
    score: number | null
  ) {
    if (score === null) {
      return "bg-slate-100 text-slate-500"
    }

    if (score >= 80) {
      return "bg-emerald-50 text-emerald-700"
    }

    if (score >= 70) {
      return "bg-amber-50 text-amber-700"
    }

    return "bg-red-50 text-red-700"
  }

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-[#E53935]" />

          <p className="text-sm text-slate-500">
            Memuat detail feedback...
          </p>
        </div>
      </div>
    )
  }

  if (error || !feedback) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
            <div className="flex items-start gap-3">
              <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />

              <div>
                <h2 className="font-semibold text-red-800">
                  Gagal memuat feedback
                </h2>

                <p className="mt-1 text-sm text-red-700">
                  {error ||
                    "Feedback tidak ditemukan."}
                </p>

                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      loadFeedback()
                    }
                    className="rounded-xl bg-[#E53935] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#D32F2F]"
                  >
                    Coba Lagi
                  </button>

                  <Link
                    href="/dashboard/tutor/feedback"
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600"
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

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {toast && (
        <ToastView toast={toast} />
      )}

      <div className="mx-auto max-w-5xl space-y-6">
        {/* HEADER */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link
              href="/dashboard/tutor/feedback"
              className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-[#E53935]"
            >
              <ArrowLeft className="h-4 w-4" />
              Kembali ke Feedback
            </Link>

            <div className="mb-2 flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-[#E53935]" />

              <span className="text-sm font-semibold uppercase tracking-wider text-[#E53935]">
                Detail Feedback
              </span>
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-[#111827] sm:text-3xl">
              {feedback.student_name}
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              {feedback.class_name} ·{" "}
              {feedback.subject}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                loadFeedback(true)
              }
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-[#111827] shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
            >
              <RefreshCw
                className={`h-4 w-4 ${
                  refreshing
                    ? "animate-spin"
                    : ""
                }`}
              />

              Perbarui Data
            </button>

            {!editing && (
              <>
                <button
                  type="button"
                  onClick={() =>
                    setEditing(true)
                  }
                  className="inline-flex items-center gap-2 rounded-xl bg-[#111827] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  <Pencil className="h-4 w-4" />
                  Edit
                </button>

                <button
                  type="button"
                  onClick={openDelete}
                  disabled={deleting}
                  className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-60"
                >
                  {deleting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}

                  Hapus
                </button>
              </>
            )}
          </div>
        </div>

        {/* STUDENT */}
        <section className="grid gap-4 md:grid-cols-3">
          <InfoCard
            icon={
              <UserRound className="h-5 w-5" />
            }
            label="Siswa"
            value={
              feedback.student_name
            }
          />

          <InfoCard
            icon={
              <GraduationCap className="h-5 w-5" />
            }
            label="Jenjang / Kelas"
            value={
              feedback.grade_level ||
              "-"
            }
          />

          <InfoCard
            icon={
              <School className="h-5 w-5" />
            }
            label="Sekolah"
            value={
              feedback.school_name ||
              "-"
            }
          />
        </section>

        {/* CLASS */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-[#111827]">
              <BookOpen className="h-5 w-5" />
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-slate-500">
                Kelas
              </p>

              <h2 className="mt-1 font-bold text-[#111827]">
                {feedback.class_name}
              </h2>

              <p className="mt-0.5 text-sm text-slate-500">
                {feedback.class_subject}
              </p>

              {feedback.schedule_day && (
                <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                  <CalendarDays className="h-4 w-4" />

                  <span>
                    {feedback.schedule_day}

                    {feedback.schedule_start
                      ? ` · ${feedback.schedule_start}`
                      : ""}

                    {feedback.schedule_end
                      ? ` - ${feedback.schedule_end}`
                      : ""}
                  </span>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* FEEDBACK */}
        {editing ? (
          <form
            onSubmit={handleSave}
            className="rounded-2xl border border-slate-200 bg-white shadow-sm"
          >
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="font-bold text-[#111827]">
                Edit Feedback
              </h2>

              <p className="mt-0.5 text-xs text-slate-500">
                Perbarui hasil assessment dan catatan evaluasi siswa.
              </p>
            </div>

            <div className="space-y-4 p-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Mata Pelajaran"
                  value={form.subject}
                  onChange={(value) =>
                    setForm({
                      ...form,
                      subject: value,
                    })
                  }
                />

                <Field
                  label="Nama Assessment"
                  value={
                    form.assessment_name
                  }
                  onChange={(value) =>
                    setForm({
                      ...form,
                      assessment_name:
                        value,
                    })
                  }
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-[#111827]">
                  Nilai
                </label>

                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={form.score}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      score:
                        event.target.value,
                    })
                  }
                  required
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-[#111827] outline-none transition focus:border-[#E53935] focus:bg-white focus:ring-2 focus:ring-red-100"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-[#111827]">
                  Feedback
                </label>

                <textarea
                  value={
                    form.feedback_notes
                  }
                  onChange={(event) =>
                    setForm({
                      ...form,
                      feedback_notes:
                        event.target.value,
                    })
                  }
                  required
                  rows={6}
                  placeholder="Tuliskan perkembangan, kekuatan, dan hal yang perlu ditingkatkan..."
                  className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm leading-6 text-[#111827] outline-none placeholder:text-slate-400 focus:border-[#E53935] focus:bg-white focus:ring-2 focus:ring-red-100"
                />
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() =>
                    setEditing(false)
                  }
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#E53935] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#D32F2F] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}

                  {saving
                    ? "Menyimpan..."
                    : "Simpan Perubahan"}
                </button>
              </div>
            </div>
          </form>
        ) : (
          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="font-bold text-[#111827]">
                    Hasil Assessment
                  </h2>

                  <p className="mt-0.5 text-xs text-slate-500">
                    Detail penilaian dan feedback tutor.
                  </p>
                </div>

                <span
                  className={`rounded-xl px-4 py-2 text-lg font-bold ${getScoreBadge(
                    feedback.score
                  )}`}
                >
                  {feedback.score ??
                    "-"}
                </span>
              </div>
            </div>

            <div className="space-y-5 p-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <InfoCard
                  icon={
                    <BookOpen className="h-5 w-5" />
                  }
                  label="Mata Pelajaran"
                  value={
                    feedback.subject
                  }
                />

                <InfoCard
                  icon={
                    <FileText className="h-5 w-5" />
                  }
                  label="Assessment"
                  value={
                    feedback.assessment_name ||
                    "-"
                  }
                />
              </div>

              <div className="rounded-2xl bg-slate-50 p-5">
                <div className="flex items-center gap-2">
                  <ClipboardCheck className="h-5 w-5 text-[#E53935]" />

                  <h3 className="font-bold text-[#111827]">
                    Catatan Feedback
                  </h3>
                </div>

                <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-600">
                  {feedback.feedback_notes ||
                    "Belum ada feedback."}
                </p>
              </div>

              <div className="flex items-center gap-2 border-t border-slate-100 pt-4 text-xs text-slate-400">
                <CalendarDays className="h-4 w-4" />

                <span>
                  Diperbarui{" "}
                  {new Date(
                    feedback.updated_at
                  ).toLocaleString(
                    "id-ID"
                  )}
                </span>
              </div>
            </div>
          </section>
        )}
      </div>

      {showDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="px-5 py-5">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
                <Trash2 className="h-5 w-5 text-red-600" />
              </div>

              <div className="mt-4 text-center">
                <h2 className="text-lg font-bold text-gray-900">
                  Hapus Feedback?
                </h2>

                <p className="mt-2 text-sm leading-6 text-gray-500">
                  Feedback untuk siswa{" "}
                  <span className="font-semibold text-gray-700">
                    {feedback.student_name}
                  </span>{" "}
                  akan dihapus. Data nilai dan feedback pada record grades ini juga akan dihapus. Tindakan ini tidak dapat dibatalkan.
                </p>
              </div>
            </div>

            <div className="flex gap-3 border-t border-gray-100 px-5 py-4">
              <button
                type="button"
                onClick={() =>
                  setShowDelete(false)
                }
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

function InfoCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-[#111827]">
          {icon}
        </div>

        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-500">
            {label}
          </p>

          <p className="mt-1 break-words font-semibold text-[#111827]">
            {value}
          </p>
        </div>
      </div>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-semibold text-[#111827]">
        {label}
      </label>

      <input
        type="text"
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        required
        className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-[#111827] outline-none placeholder:text-slate-400 focus:border-[#E53935] focus:bg-white focus:ring-2 focus:ring-red-100"
      />
    </div>
  )
}

function getScoreBadge(
  score: number | null
) {
  if (score === null) {
    return "bg-slate-100 text-slate-500"
  }

  if (score >= 80) {
    return "bg-emerald-50 text-emerald-700"
  }

  if (score >= 70) {
    return "bg-amber-50 text-amber-700"
  }

  return "bg-red-50 text-red-700"
}