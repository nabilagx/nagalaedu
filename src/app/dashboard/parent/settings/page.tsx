"use client"

import Link from "next/link"
import {
  User,
  ShieldCheck,
  Bell,
  ChevronRight,
  Settings,
} from "lucide-react"

const settingsItems = [
  {
    href: "/dashboard/parent/settings/profile",
    icon: User,
    title: "Profil Akun",
    description: "Kelola nama dan informasi profil Anda",
  },
  {
    href: "/dashboard/parent/settings/security",
    icon: ShieldCheck,
    title: "Keamanan",
    description: "Kelola password dan keamanan akun",
  },
  {
    href: "/dashboard/parent/settings/notifications",
    icon: Bell,
    title: "Notifikasi",
    description: "Atur preferensi pemberitahuan akun",
  },
]

export default function ParentSettingsPage() {
  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#111827] text-white">
            <Settings size={22} />
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-[#111827]">
            Pengaturan
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Kelola profil, keamanan, dan preferensi akun Anda.
          </p>
        </div>

        {/* Settings list */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {settingsItems.map((item, index) => {
            const Icon = item.icon

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex items-center gap-4 px-5 py-5 transition hover:bg-slate-50 ${
                  index !== settingsItems.length - 1
                    ? "border-b border-slate-100"
                    : ""
                }`}
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-[#111827] transition group-hover:bg-[#111827] group-hover:text-white">
                  <Icon size={20} />
                </div>

                <div className="min-w-0 flex-1">
                  <h2 className="text-sm font-semibold text-[#111827]">
                    {item.title}
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    {item.description}
                  </p>
                </div>

                <ChevronRight
                  size={19}
                  className="shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-[#E53935]"
                />
              </Link>
            )
          })}
        </div>
      </div>
    </main>
  )
}