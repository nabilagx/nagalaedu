"use client"

import { useState } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  Bell,
  CreditCard,
  GraduationCap,
  Settings2,
  Check,
} from "lucide-react"

type NotificationSetting = {
  id: string
  title: string
  description: string
  enabled: boolean
}

export default function NotificationsSettingsPage() {
  const [settings, setSettings] = useState<NotificationSetting[]>([
    {
      id: "payment",
      title: "Pembayaran SPP",
      description:
        "Terima notifikasi ketika pembayaran SPP berhasil atau mengalami masalah.",
      enabled: true,
    },
    {
      id: "academic",
      title: "Aktivitas Akademik",
      description:
        "Terima informasi ketika terdapat siswa dengan kehadiran atau nilai yang perlu diperhatikan.",
      enabled: true,
    },
    {
      id: "system",
      title: "Notifikasi Sistem",
      description:
        "Terima informasi penting mengenai sistem NAGALA Education.",
      enabled: true,
    },
  ])

  const [saved, setSaved] = useState(false)

  function toggleSetting(id: string) {
    setSaved(false)

    setSettings((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              enabled: !item.enabled,
            }
          : item
      )
    )
  }

  function saveSettings() {
    /*
      Saat tabel notification_preferences sudah tersedia,
      state ini bisa langsung dipersist ke Supabase.

      Untuk sekarang halaman ini menyimpan preferensi
      selama session halaman berlangsung.
    */

    setSaved(true)
  }

  const icons = {
    payment: CreditCard,
    academic: GraduationCap,
    system: Settings2,
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/dashboard/founder/settings"
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-gray-500 transition hover:text-[#E53935]"
        >
          <ArrowLeft size={17} />
          Kembali ke Pengaturan
        </Link>

        <div className="mb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#111827] text-white">
              <Bell size={21} />
            </div>

            <div>
              <h1 className="text-2xl font-bold text-[#111827]">
                Notifikasi
              </h1>

              <p className="text-sm text-gray-500">
                Atur informasi apa saja yang ingin Anda terima.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="space-y-3">
            {settings.map((item) => {
              const Icon =
                icons[item.id as keyof typeof icons]

              return (
                <div
                  key={item.id}
                  className="flex items-center gap-4 rounded-xl border border-gray-200 p-4 transition hover:border-gray-300"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-[#111827]">
                    <Icon size={19} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <h2 className="text-sm font-semibold text-[#111827]">
                      {item.title}
                    </h2>

                    <p className="mt-1 text-xs leading-5 text-gray-500">
                      {item.description}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleSetting(item.id)}
                    aria-label={`Toggle ${item.title}`}
                    className={`relative h-6 w-11 shrink-0 rounded-full transition ${
                      item.enabled
                        ? "bg-[#E53935]"
                        : "bg-gray-300"
                    }`}
                  >
                    <span
                      className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition ${
                        item.enabled
                          ? "left-6"
                          : "left-1"
                      }`}
                    />
                  </button>
                </div>
              )
            })}
          </div>

          <div className="mt-6 flex items-center justify-between border-t border-gray-100 pt-5">
            {saved ? (
              <div className="flex items-center gap-2 text-sm font-medium text-green-600">
                <Check size={17} />
                Preferensi diperbarui
              </div>
            ) : (
              <p className="text-xs text-gray-400">
                Pilih notifikasi yang ingin Anda terima.
              </p>
            )}

            <button
              type="button"
              onClick={saveSettings}
              className="rounded-xl bg-[#E53935] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#c92f2b]"
            >
              Simpan Preferensi
            </button>
          </div>
        </div>

        {/* Info */}
        <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 p-4">
          <p className="text-sm font-medium text-blue-800">
            Tentang notifikasi
          </p>

          <p className="mt-1 text-xs leading-5 text-blue-700">
            Preferensi ini nantinya dapat dihubungkan dengan sistem
            notifikasi pembayaran, aktivitas akademik, dan informasi
            penting NAGALA Education.
          </p>
        </div>
      </div>
    </main>
  )
}