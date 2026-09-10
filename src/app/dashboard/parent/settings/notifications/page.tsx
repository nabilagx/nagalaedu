"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  Bell,
  Check,
  Mail,
  Receipt,
  GraduationCap,
  CalendarCheck,
} from "lucide-react"

type NotificationSettings = {
  academic: boolean
  attendance: boolean
  finance: boolean
  email: boolean
}

const defaultSettings: NotificationSettings = {
  academic: true,
  attendance: true,
  finance: true,
  email: true,
}

const notificationItems = [
  {
    key: "academic" as const,
    icon: GraduationCap,
    title: "Informasi Akademik",
    description:
      "Notifikasi mengenai nilai, modul, dan perkembangan belajar anak.",
  },
  {
    key: "attendance" as const,
    icon: CalendarCheck,
    title: "Kehadiran",
    description:
      "Pemberitahuan terkait status kehadiran anak dalam pembelajaran.",
  },
  {
    key: "finance" as const,
    icon: Receipt,
    title: "Tagihan & Pembayaran",
    description:
      "Pengingat tagihan SPP dan informasi pembayaran.",
  },
  {
    key: "email" as const,
    icon: Mail,
    title: "Notifikasi Email",
    description:
      "Izinkan NAGALA mengirim pemberitahuan melalui email.",
  },
]

export default function ParentNotificationSettingsPage() {
  const [settings, setSettings] =
    useState<NotificationSettings>(defaultSettings)

  const [saved, setSaved] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(
        "nagala-parent-notification-settings"
      )

      if (stored) {
        setSettings({
          ...defaultSettings,
          ...JSON.parse(stored),
        })
      }
    } catch (error) {
      console.error("Failed to load notification settings:", error)
    }
  }, [])

  function toggleSetting(key: keyof NotificationSettings) {
    setSettings((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))

    setSaved(false)
  }

  function saveSettings() {
    try {
      localStorage.setItem(
        "nagala-parent-notification-settings",
        JSON.stringify(settings)
      )

      setSaved(true)

      window.setTimeout(() => {
        setSaved(false)
      }, 2500)
    } catch (error) {
      console.error("Failed to save notification settings:", error)
    }
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
        <Link
          href="/dashboard/parent/settings"
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-[#E53935]"
        >
          <ArrowLeft size={17} />
          Kembali ke Pengaturan
        </Link>

        <div className="mb-6">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#111827] text-white">
            <Bell size={22} />
          </div>

          <h1 className="text-2xl font-bold text-[#111827]">
            Notifikasi
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Atur jenis pemberitahuan yang ingin Anda terima.
          </p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {notificationItems.map((item, index) => {
            const Icon = item.icon
            const enabled = settings[item.key]

            return (
              <div
                key={item.key}
                className={`flex items-center gap-4 px-5 py-5 sm:px-6 ${
                  index !== notificationItems.length - 1
                    ? "border-b border-slate-100"
                    : ""
                }`}
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-[#111827]">
                  <Icon size={20} />
                </div>

                <div className="min-w-0 flex-1">
                  <h2 className="text-sm font-semibold text-[#111827]">
                    {item.title}
                  </h2>

                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    {item.description}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => toggleSetting(item.key)}
                  aria-pressed={enabled}
                  className={`relative h-7 w-12 shrink-0 rounded-full transition ${
                    enabled ? "bg-[#E53935]" : "bg-slate-300"
                  }`}
                >
                  <span
                    className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition ${
                      enabled ? "left-6" : "left-1"
                    }`}
                  />
                </button>
              </div>
            )
          })}
        </div>

        <div className="mt-5 flex items-center justify-end gap-3">
          {saved && (
            <div className="flex items-center gap-1.5 text-sm font-medium text-emerald-600">
              <Check size={17} />
              Tersimpan
            </div>
          )}

          <button
            type="button"
            onClick={saveSettings}
            className="rounded-xl bg-[#E53935] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#c92f2f]"
          >
            Simpan Preferensi
          </button>
        </div>
      </div>
    </main>
  )
}