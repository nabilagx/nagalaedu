'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  UsersRound,
  ChartColumn,
  CalendarCheck,
  GraduationCap,
  BookOpen,
  Wallet,
  CreditCard,
  Settings,
  LogOut,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import NagalaLogo from '@/components/brand/NagalaLogo'

interface ParentSidebarProps {
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
        href: '/dashboard/parent',
        icon: LayoutDashboard,
      },
      {
        label: 'Anak Saya',
        href: '/dashboard/parent/children',
        icon: UsersRound,
      },
    ],
  },
  {
    title: 'AKADEMIK',
    items: [
      {
        label: 'Akademik',
        href: '/dashboard/parent/academic',
        icon: ChartColumn,
      },
      {
        label: 'Kehadiran',
        href: '/dashboard/parent/attendance',
        icon: CalendarCheck,
      },
      {
        label: 'Nilai',
        href: '/dashboard/parent/grades',
        icon: GraduationCap,
      },
      {
        label: 'Modul Belajar',
        href: '/dashboard/parent/modules',
        icon: BookOpen,
      },
    ],
  },
  {
    title: 'KEUANGAN',
    items: [
      {
        label: 'Tagihan SPP',
        href: '/dashboard/parent/finance',
        icon: Wallet,
      },
      {
        label: 'Riwayat Pembayaran',
        href: '/dashboard/parent/payments',
        icon: CreditCard,
      },
    ],
  },
  {
    title: 'SISTEM',
    items: [
      {
        label: 'Pengaturan',
        href: '/dashboard/parent/settings',
        icon: Settings,
      },
    ],
  },
]

export default function ParentSidebar({
  collapsed,
  mobileOpen,
  onToggleCollapse,
  onCloseMobile,
}: ParentSidebarProps) {
  const pathname = usePathname()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  function isActive(href: string) {
    if (href === '/dashboard/parent') {
      return pathname === href
    }

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
          className="
            fixed
            inset-0
            z-40
            bg-black/50
            lg:hidden
          "
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
          w-72
          flex-col
          bg-[#111827]
          text-white
          shadow-2xl
          transition-all
          duration-300
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

        {/* MENU */}
        <nav
          className="
            min-h-0
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

        {/* BOTTOM */}
        <div
          className="
            sticky
            bottom-0
            z-10
            shrink-0
            border-t
            border-white/10
            bg-[#111827]
            p-3
          "
        >
          {/* PROFILE */}
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
              <UsersRound
                size={17}
                strokeWidth={2}
              />
            </div>

            {!collapsed && (
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">
                  Orang Tua
                </p>

                <p className="text-xs text-slate-500">
                  Wali Siswa
                </p>
              </div>
            )}
          </div>

          {/* LOGOUT */}
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
              py-3
              text-sm
              font-medium
              text-slate-300
              transition
              hover:bg-red-500/10
              hover:text-red-400
              active:bg-red-500/20
              ${
                collapsed
                  ? 'lg:justify-center lg:px-0'
                  : 'gap-3 px-3'
              }
            `}
          >
            <LogOut
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
              Keluar
            </span>
          </button>

          {/* COLLAPSE — DESKTOP ONLY */}
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