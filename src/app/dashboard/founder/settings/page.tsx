"use client"

import Link from "next/link"
import {
  User,
  ShieldCheck,
  Bell,
  ChevronRight,
  Settings as SettingsIcon,
} from "lucide-react"

const settingsItems = [
  {
    title: "Profil Akun",
    description: "Kelola informasi profil dan data akun Anda.",
    href: "/dashboard/founder/settings/profile",
    icon: User,
  },
  {
    title: "Keamanan",
    description: "Kelola password dan keamanan akun.",
    href: "/dashboard/founder/settings/security",
    icon: ShieldCheck,
  },
  {
    title: "Notifikasi",
    description: "Atur preferensi notifikasi sistem.",
    href: "/dashboard/founder/settings/notifications",
    icon: Bell,
  },
]

export default function SettingsPage() {
  return (
    <main className="min-h-screen bg-gray-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-8">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#111827] text-white">
              <SettingsIcon size={22} />
            </div>

            <div>
              <h1 className="text-2xl font-bold tracking-tight text-[#111827]">
                Pengaturan
              </h1>

              <p className="text-sm text-gray-500">
                Kelola akun dan preferensi sistem NAGALA Education.
              </p>
            </div>
          </div>
        </div>

        {/* Settings Cards */}
        <div className="grid gap-4">
          {settingsItems.map((item) => {
            const Icon = item.icon

            return (
              <Link
                key={item.href}
                href={item.href}
                className="group flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-[#E53935]/40 hover:shadow-md"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#111827] text-white transition group-hover:bg-[#E53935]">
                  <Icon size={21} />
                </div>

                <div className="min-w-0 flex-1">
                  <h2 className="font-semibold text-[#111827]">
                    {item.title}
                  </h2>

                  <p className="mt-1 text-sm text-gray-500">
                    {item.description}
                  </p>
                </div>

                <ChevronRight
                  size={20}
                  className="shrink-0 text-gray-400 transition group-hover:translate-x-1 group-hover:text-[#E53935]"
                />
              </Link>
            )
          })}
        </div>

        {/* Account Info */}
        <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            NAGALA Education
          </p>

          <p className="mt-2 text-sm text-gray-500">
            Student Management System
          </p>

          <p className="mt-1 text-xs text-gray-400">
            Pengaturan akun Founder
          </p>
        </div>
      </div>
    </main>
  )
}