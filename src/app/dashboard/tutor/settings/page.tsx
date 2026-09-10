"use client"

import Link from "next/link"
import {
  Bell,
  ChevronRight,
  LockKeyhole,
  Settings,
  UserRound,
} from "lucide-react"

const settingsItems = [
  {
    title: "Profil",
    description: "Kelola nama lengkap dan nomor HP akun tutor.",
    href: "/dashboard/tutor/settings/profile",
    icon: UserRound,
  },
  {
    title: "Keamanan",
    description: "Ubah password untuk menjaga keamanan akun.",
    href: "/dashboard/tutor/settings/security",
    icon: LockKeyhole,
  },
  {
    title: "Notifikasi",
    description: "Atur notifikasi yang berkaitan dengan aktivitas mengajar.",
    href: "/dashboard/tutor/settings/notifications",
    icon: Bell,
  },
]

export default function TutorSettingsPage() {
  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Header */}
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#E53935]">
            <Settings className="h-4 w-4" />
            SISTEM
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-[#111827] sm:text-3xl">
            Pengaturan
          </h1>

          <p className="mt-1 text-sm text-slate-500 sm:text-base">
            Kelola profil, keamanan, dan preferensi akun tutor.
          </p>
        </div>

        {/* Account summary */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-5 sm:p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#111827] text-lg font-bold text-white">
                T
              </div>

              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-500">
                  Akun saat ini
                </p>

                <h2 className="truncate text-lg font-bold text-[#111827]">
                  Tutor
                </h2>

                <p className="mt-0.5 text-sm text-slate-500">
                  Pengajar Nagala Education
                </p>
              </div>
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {settingsItems.map((item) => {
              const Icon = item.icon

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group flex items-center gap-4 p-5 transition hover:bg-slate-50 sm:p-6"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-[#111827] transition group-hover:bg-[#111827] group-hover:text-white">
                    <Icon className="h-5 w-5" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-[#111827]">
                      {item.title}
                    </h3>

                    <p className="mt-1 text-sm leading-5 text-slate-500">
                      {item.description}
                    </p>
                  </div>

                  <ChevronRight className="h-5 w-5 shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-[#E53935]" />
                </Link>
              )
            })}
          </div>
        </section>

        {/* Role information */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-[#E53935]">
              <UserRound className="h-5 w-5" />
            </div>

            <div>
              <h2 className="font-semibold text-[#111827]">
                Akses Akun
              </h2>

              <p className="mt-1 text-sm leading-6 text-slate-500">
                Akun ini memiliki role sebagai Tutor. Akses sistem disesuaikan
                dengan kelas dan siswa yang ditugaskan kepada Anda.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}