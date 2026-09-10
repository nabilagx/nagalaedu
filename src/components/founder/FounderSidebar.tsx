'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  ChartColumn,
  UserRoundCheck,
  Wallet,
  CreditCard,
  FileText,
  Settings,
  LogOut,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'

import { createClient } from '@/lib/supabase/client'
import NagalaLogo from '@/components/brand/NagalaLogo'

interface FounderSidebarProps {
  collapsed: boolean
  mobileOpen: boolean
  onToggleCollapse: () => void
  onCloseMobile: () => void
}

const menuSections = [
  {
    title: 'MENU UTAMA',
    items: [
      {
        label: 'Dashboard',
        href: '/dashboard/founder',
        icon: LayoutDashboard,
      },
    ],
  },
  {
    title: 'OPERASIONAL',
    items: [
      {
        label: 'Pengguna',
        href: '/dashboard/founder/users',
        icon: Users,
      },
      {
        label: 'Siswa',
        href: '/dashboard/founder/students',
        icon: GraduationCap,
      },
      {
        label: 'Kelas',
        href: '/dashboard/founder/classes',
        icon: BookOpen,
      },
    ],
  },
  {
    title: 'AKADEMIK',
    items: [
      {
        label: 'Akademik',
        href: '/dashboard/founder/academic',
        icon: ChartColumn,
      },
      {
        label: 'Monitoring Tutor',
        href: '/dashboard/founder/academic/tutors',
        icon: UserRoundCheck,
      },
    ],
  },
  {
    title: 'KEUANGAN',
    items: [
      {
        label: 'SPP & Tagihan',
        href: '/dashboard/founder/finance',
        icon: Wallet,
      },
      {
        label: 'Transaksi',
        href: '/dashboard/founder/transactions',
        icon: CreditCard,
      },
    ],
  },
  {
    title: 'LAPORAN',
    items: [
      {
        label: 'Laporan',
        href: '/dashboard/founder/reports',
        icon: FileText,
      },
    ],
  },
  {
    title: 'SISTEM',
    items: [
      {
        label: 'Pengaturan',
        href: '/dashboard/founder/settings',
        icon: Settings,
      },
    ],
  },
]

export default function FounderSidebar({
  collapsed,
  mobileOpen,
  onToggleCollapse,
  onCloseMobile,
}: FounderSidebarProps) {
  const pathname = usePathname()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  function isActive(href: string) {
  // Dashboard Founder harus exact
  if (href === '/dashboard/founder') {
    return pathname === href
  }

  // Academic hanya aktif di halaman utama Academic,
  // bukan di sub-halaman seperti /academic/tutors
  if (href === '/dashboard/founder/academic') {
    return pathname === href
  }

  // Monitoring Tutor aktif di dirinya dan detail tutor
  if (href === '/dashboard/founder/academic/tutors') {
    return (
      pathname === href ||
      pathname.startsWith(`${href}/`)
    )
  }

  // Menu lainnya tetap mendukung halaman detail/sub-route
  return (
    pathname === href ||
    pathname.startsWith(`${href}/`)
  )
}

  return (
    <>
      {/* OVERLAY MOBILE */}
      {mobileOpen && (
        <button
          type="button"
          aria-label="Tutup menu"
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
        />
      )}

      {/* SIDEBAR */}
      <aside
        className={`
          fixed
          inset-y-0
          left-0
          z-50
          flex
          flex-col
          bg-[#111827]
          text-white
          shadow-2xl
          transition-all
          duration-300
          w-72
          ${collapsed ? 'lg:w-20' : 'lg:w-72'}
          ${
            mobileOpen
              ? 'translate-x-0'
              : '-translate-x-full lg:translate-x-0'
          }
        `}
      >
        {/* BRAND */}
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

          {/* TOMBOL TUTUP MOBILE */}
          <button
            type="button"
            onClick={onCloseMobile}
            className="
              ml-auto
              rounded-lg
              p-2
              text-slate-400
              hover:bg-white/10
              hover:text-white
              lg:hidden
            "
            aria-label="Tutup menu"
          >
            <X size={20} />
          </button>
        </div>

        {/* MENU */}
        <nav
          className="
            flex-1
            overflow-y-auto
            px-3
            py-5
            [scrollbar-width:none]
            [-ms-overflow-style:none]
            [&::-webkit-scrollbar]:hidden
          "
        >
          {menuSections.map((section) => (
            <div
              key={section.title}
              className="mb-6"
            >
              {/* JUDUL BAGIAN */}
              {!collapsed && (
                <p
                  className="
                    mb-2
                    px-3
                    text-[10px]
                    font-bold
                    tracking-[0.15em]
                    text-slate-500
                  "
                >
                  {section.title}
                </p>
              )}

              {/* ITEM MENU */}
              <div className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon
                  const active = isActive(item.href)

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onCloseMobile}
                      title={
                        collapsed
                          ? item.label
                          : undefined
                      }
                      className={`
                        flex
                        items-center
                        rounded-xl
                        py-2.5
                        text-sm
                        font-medium
                        transition-all

                        ${
                          collapsed
                            ? 'lg:justify-center lg:px-0'
                            : 'gap-3 px-3'
                        }

                        ${
                          active
                            ? `
                              bg-gradient-to-r
                              from-[#E53935]
                              to-[#FF5722]
                              text-white
                              shadow-lg
                              shadow-red-900/20
                            `
                            : `
                              text-slate-400
                              hover:bg-white/5
                              hover:text-white
                            `
                        }
                      `}
                    >
                      <Icon
                        size={18}
                        strokeWidth={2}
                        className="shrink-0"
                      />

                      <span
                        className={
                          collapsed
                            ? 'lg:hidden'
                            : ''
                        }
                      >
                        {item.label}
                      </span>
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* BAGIAN BAWAH */}
        <div className="shrink-0 border-t border-white/10 p-3">
          {/* PROFIL */}
          <div
            className={`
              mb-3
              flex
              items-center
              rounded-xl
              bg-white/5
              p-3
              ${
                collapsed
                  ? 'lg:justify-center'
                  : 'gap-3'
              }
            `}
          >
            {/* AVATAR */}
            <div
              className="
                flex
                h-9
                w-9
                shrink-0
                items-center
                justify-center
                rounded-full
                bg-white/10
              "
            >
              <Users size={17} />
            </div>

            {!collapsed && (
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">
                  Founder
                </p>

                <p className="text-xs text-slate-500">
                  Administrator
                </p>
              </div>
            )}
          </div>

          {/* KELUAR */}
          <button
            type="button"
            onClick={handleLogout}
            title={
              collapsed
                ? 'Keluar'
                : undefined
            }
            className={`
              flex
              w-full
              items-center
              rounded-xl
              py-2.5
              text-sm
              font-medium
              text-slate-400
              transition

              hover:bg-red-500/10
              hover:text-red-400

              ${
                collapsed
                  ? 'lg:justify-center lg:px-0'
                  : 'gap-3 px-3'
              }
            `}
          >
            <LogOut
              size={18}
              className="shrink-0"
            />

            <span
              className={
                collapsed
                  ? 'lg:hidden'
                  : ''
              }
            >
              Keluar
            </span>
          </button>

          {/* COLLAPSE SIDEBAR */}
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label={
              collapsed
                ? 'Perbesar sidebar'
                : 'Perkecil sidebar'
            }
            className="
              mt-2
              hidden
              w-full
              items-center
              justify-center
              rounded-xl
              border
              border-white/10
              py-2
              text-slate-400
              hover:bg-white/5
              hover:text-white
              lg:flex
            "
          >
            {collapsed ? (
              <ChevronRight size={17} />
            ) : (
              <ChevronLeft size={17} />
            )}
          </button>
        </div>
      </aside>
    </>
  )
}

