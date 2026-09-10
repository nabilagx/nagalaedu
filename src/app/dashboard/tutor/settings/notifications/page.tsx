"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  Bell,
  CalendarCheck,
  Check,
  ClipboardCheck,
  GraduationCap,
  Loader2,
  MessageSquareText,
  Save,
} from "lucide-react"

type NotificationSettings = {
  studentActivity: boolean
  teachingSchedule: boolean
  attendanceReminder: boolean
  gradeReminder: boolean
  feedbackReminder: boolean
}

const defaultSettings: NotificationSettings = {
  studentActivity: true,
  teachingSchedule: true,
  attendanceReminder: true,
  gradeReminder: true,
  feedbackReminder: true,
}

const STORAGE_KEY = "nagala_tutor_notification_settings"

type Toast = {
  type: "success" | "error"
  message: string
} | null

const notificationItems = [
  {
    key: "studentActivity" as const,
    title: "Aktivitas Siswa",
    description:
      "Terima informasi ketika terdapat aktivitas penting yang berkaitan dengan siswa.",
    icon: GraduationCap,
  },
  {
    key: "teachingSchedule" as const,
    title: "Pengingat Jadwal Mengajar",
    description:
      "Pengingat terkait jadwal kelas dan kegiatan mengajar Anda.",
    icon: CalendarCheck,
  },
  {
    key: "attendanceReminder" as const,
    title: "Pengingat Kehadiran",
    description:
      "Pengingat untuk memastikan data kehadiran siswa telah diperbarui.",
    icon: ClipboardCheck,
  },
  {
    key: "gradeReminder" as const,
    title: "Pengingat Nilai",
    description:
      "Pengingat ketika terdapat nilai siswa yang perlu diperbarui.",
    icon: GraduationCap,
  },
  {
    key: "feedbackReminder" as const,
    title: "Pengingat Feedback",
    description:
      "Pengingat untuk memberikan feedback pembelajaran kepada siswa.",
    icon: MessageSquareText,
  },
]

export default function TutorNotificationSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [settings, setSettings] =
    useState<NotificationSettings>(defaultSettings)

  const [toast, setToast] = useState<Toast>(null)

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY)

      if (stored) {
        const parsed = JSON.parse(stored)

        setSettings({
          ...defaultSettings,
          ...parsed,
        })
      }
    } catch {
      setToast({
        type: "error",
        message: "Preferensi notifikasi tidak dapat dimuat.",
      })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!toast) return

    const timer = setTimeout(() => {
      setToast(null)
    }, 3500)

    return () => clearTimeout(timer)
  }, [toast])

  function toggleSetting(key: keyof NotificationSettings) {
    setSettings((current) => ({
      ...current,
      [key]: !current[key],
    }))
  }

  function handleSave() {
    try {
      setSaving(true)

      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(settings)
      )

      setToast({
        type: "success",
        message: "Preferensi notifikasi berhasil disimpan.",
      })
    } catch {
      setToast({
        type: "error",
        message: "Gagal menyimpan preferensi notifikasi.",
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-7 w-7 animate-spin text-[#E53935]" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Toast */}
        {toast && (
          <div
            className={[
              "fixed right-4 top-4 z-[60] flex max-w-sm items-start gap-3 rounded-xl border px-4 py-3 shadow-xl",
              toast.type === "success"
                ? "border-emerald-200 bg-white text-emerald-700"
                : "border-red-200 bg-white text-red-700",
            ].join(" ")}
          >
            <div
              className={[
                "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
                toast.type === "success"
                  ? "bg-emerald-100"
                  : "bg-red-100",
              ].join(" ")}
            >
              {toast.type === "success" ? (
                <Check className="h-4 w-4" />
              ) : (
                <span className="text-xs font-bold">!</span>
              )}
            </div>

            <p className="text-sm font-medium">{toast.message}</p>
          </div>
        )}

        {/* Header */}
        <div>
          <Link
            href="/dashboard/tutor/settings"
            className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-[#111827]"
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali ke Pengaturan
          </Link>

          <div className="flex items-center gap-2 text-sm font-semibold text-[#E53935]">
            <Bell className="h-4 w-4" />
            NOTIFIKASI
          </div>

          <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#111827] sm:text-3xl">
            Notifikasi
          </h1>

          <p className="mt-1 text-sm text-slate-500 sm:text-base">
            Atur jenis pengingat yang ingin Anda terima sebagai tutor.
          </p>
        </div>

        {/* Notification list */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-[#111827]">
                <Bell className="h-5 w-5" />
              </div>

              <div>
                <h2 className="font-semibold text-[#111827]">
                  Preferensi Notifikasi
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Aktifkan atau nonaktifkan pengingat sesuai kebutuhan.
                </p>
              </div>
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {notificationItems.map((item) => {
              const Icon = item.icon
              const enabled = settings[item.key]

              return (
                <div
                  key={item.key}
                  className="flex items-start gap-4 p-5 sm:p-6"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-[#111827]">
                    <Icon className="h-5 w-5" />
                  </div>

                  <div className="min-w-0 flex-1 pr-3">
                    <h3 className="font-semibold text-[#111827]">
                      {item.title}
                    </h3>

                    <p className="mt-1 text-sm leading-5 text-slate-500">
                      {item.description}
                    </p>
                  </div>

                  <button
                    type="button"
                    role="switch"
                    aria-checked={enabled}
                    aria-label={`Aktifkan ${item.title}`}
                    onClick={() => toggleSetting(item.key)}
                    className={[
                      "relative mt-1 h-6 w-11 shrink-0 rounded-full transition",
                      enabled ? "bg-[#E53935]" : "bg-slate-300",
                    ].join(" ")}
                  >
                    <span
                      className={[
                        "absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition",
                        enabled ? "left-6" : "left-1",
                      ].join(" ")}
                    />
                  </button>
                </div>
              )
            })}
          </div>

          <div className="flex justify-end border-t border-slate-100 bg-slate-50/70 p-5 sm:p-6">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#E53935] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#d32f2f] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}

              {saving ? "Menyimpan..." : "Simpan Preferensi"}
            </button>
          </div>
        </section>

        {/* Info */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-[#E53935]">
              <Bell className="h-5 w-5" />
            </div>

            <div>
              <h2 className="font-semibold text-[#111827]">
                Catatan
              </h2>

              <p className="mt-1 text-sm leading-6 text-slate-500">
                Preferensi ini mengatur pilihan notifikasi pada perangkat
                yang sedang digunakan. Sistem notifikasi terpusat dapat
                dihubungkan ke database pada tahap pengembangan berikutnya.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}