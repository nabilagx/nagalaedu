"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  UsersRound,
  CalendarCheck,
  GraduationCap,
  BookOpen,
  MessageSquareText,
  Settings,
  LogOut,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"

import { createClient } from "@/lib/supabase/client"
import NagalaLogo from "@/components/brand/NagalaLogo"

interface TutorSidebarProps {
  collapsed: boolean
  mobileOpen: boolean
  onToggleCollapse: () => void
  onCloseMobile: () => void
}

const menuSections = [
  {
    label: "MENU UTAMA",
    items: [
      {
        label: "Dashboard",
        href: "/dashboard/tutor",
        icon: LayoutDashboard,
      },
      {
        label: "Kelas Saya",
        href: "/dashboard/tutor/classes",
        icon: BookOpen,
      },
    ],
  },
  {
    label: "PEMBELAJARAN",
    items: [
      {
        label: "Siswa",
        href: "/dashboard/tutor/students",
        icon: UsersRound,
      },
      {
        label: "Kehadiran",
        href: "/dashboard/tutor/attendance",
        icon: CalendarCheck,
      },
      {
        label: "Nilai",
        href: "/dashboard/tutor/grades",
        icon: GraduationCap,
      },
      {
        label: "Modul Belajar",
        href: "/dashboard/tutor/modules",
        icon: BookOpen,
      },
      {
        label: "Feedback",
        href: "/dashboard/tutor/feedback",
        icon: MessageSquareText,
      },
    ],
  },
  {
    label: "SISTEM",
    items: [
      {
        label: "Pengaturan",
        href: "/dashboard/tutor/settings",
        icon: Settings,
      },
    ],
  },
]

export default function TutorSidebar({
  collapsed,
  mobileOpen,
  onToggleCollapse,
  onCloseMobile,
}: TutorSidebarProps) {
  const pathname = usePathname()

  function isActive(href: string) {
    if (href === "/dashboard/tutor") {
      return pathname === href
    }

    return pathname === href || pathname.startsWith(`${href}/`)
  }

  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.href = "/login"
  }

  return (
    <>
      {/* Mobile Overlay */}
      {mobileOpen && (
        <button
          type="button"
          aria-label="Tutup sidebar"
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
        />
      )}

      {/* Sidebar */}
      <aside
        className={[
          "fixed inset-y-0 left-0 z-50 flex w-72 flex-col",
          "bg-[#111827] text-white shadow-2xl",
          "transition-all duration-300",
          "lg:translate-x-0",
          collapsed ? "lg:w-20" : "lg:w-72",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
      >
        {/* Brand */}
        <div
                  className={`
                    flex
                    h-20
                    shrink-0
                    items-center
                    border-b
                    border-white/10
                    ${
                      collapsed
                        ? 'lg:justify-center lg:px-3'
                        : 'gap-3 px-5'
                    }
                  `}
                >
                  <NagalaLogo
                    size="md"
                    rounded="md"
                  />
        
                  {!collapsed && (
                    <div className="min-w-0">
                      <p className="text-sm font-bold tracking-wide">
                        NAGALA
                      </p>
        
                      <p className="text-[10px] font-medium tracking-[0.2em] text-slate-400">
                        EDUCATION
                      </p>
                    </div>
                  )}
        
                  {/* CLOSE MOBILE */}
                  <button
                    type="button"
                    onClick={onCloseMobile}
                    aria-label="Tutup menu"
                    className="
                      ml-auto
                      rounded-lg
                      p-2
                      text-slate-400
                      hover:bg-white/10
                      hover:text-white
                      lg:hidden
                    "
                  >
                    <X size={20} />
                  </button>
                </div>

        {/* Navigation */}
        <nav
          className={[
            "flex-1 overflow-y-auto px-3 py-5",
            "[scrollbar-width:none]",
            "[-ms-overflow-style:none]",
            "[&::-webkit-scrollbar]:hidden",
          ].join(" ")}
        >
          <div className="space-y-6">
            {menuSections.map((section) => (
              <div key={section.label}>
                {/* Section Label */}
                {!collapsed && (
                  <p className="mb-2 px-3 text-[10px] font-bold tracking-[0.16em] text-slate-500">
                    {section.label}
                  </p>
                )}

                {/* Menu Items */}
                <div className="space-y-1">
                  {section.items.map((item) => {
                    const Icon = item.icon
                    const active = isActive(item.href)

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={onCloseMobile}
                        title={collapsed ? item.label : undefined}
                        className={[
                          "group flex items-center rounded-xl px-3 py-3",
                          "text-sm font-medium",
                          "transition-all duration-200",
                          active
                            ? "bg-gradient-to-r from-[#E53935] to-[#FF5722] text-white shadow-lg shadow-red-900/20"
                            : "text-slate-400 hover:bg-white/5 hover:text-white",
                          collapsed ? "justify-center" : "gap-3",
                        ].join(" ")}
                      >
                        <Icon
                          className={[
                            "h-5 w-5 shrink-0 transition-transform duration-200",
                            active
                              ? "text-white"
                              : "text-slate-500 group-hover:text-slate-300",
                          ].join(" ")}
                        />

                        {!collapsed && (
                          <span className="truncate">
                            {item.label}
                          </span>
                        )}
                      </Link>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </nav>

        {/* Bottom Section */}
        <div className="shrink-0 border-t border-white/10 bg-[#111827] p-3">
          {/* Profile */}
          <div
            className={[
              "mb-2 flex items-center rounded-xl bg-white/5",
              collapsed ? "justify-center p-2" : "gap-3 px-3 py-3",
            ].join(" ")}
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-500/10">
              <GraduationCap className="h-5 w-5 text-[#E53935]" />
            </div>

            {!collapsed && (
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">
                  Tutor
                </p>
                <p className="truncate text-xs text-slate-500">
                  Pengajar
                </p>
              </div>
            )}
          </div>

          {/* Logout */}
          <button
            type="button"
            onClick={handleLogout}
            title={collapsed ? "Keluar" : undefined}
            className={[
              "flex w-full items-center rounded-xl",
              "text-sm font-medium text-slate-400",
              "transition-all duration-200",
              "hover:bg-red-500/10 hover:text-red-400",
              collapsed
                ? "justify-center px-3 py-3"
                : "gap-3 px-3 py-3",
            ].join(" ")}
          >
            <LogOut className="h-5 w-5 shrink-0" />

            {!collapsed && <span>Keluar</span>}
          </button>

          {/* Desktop Collapse */}
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label={
              collapsed
                ? "Buka sidebar"
                : "Ciutkan sidebar"
            }
            className="mt-2 hidden w-full items-center justify-center rounded-xl border border-white/10 py-2.5 text-slate-500 transition hover:bg-white/5 hover:text-white lg:flex"
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>
        </div>
      </aside>
    </>
  )
}