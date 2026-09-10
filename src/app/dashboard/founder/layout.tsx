'use client'

import { useState } from 'react'
import { Bell, Menu } from 'lucide-react'

import FounderSidebar from '@/components/founder/FounderSidebar'
import NagalaLogo from '@/components/brand/NagalaLogo'

export default function FounderLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <FounderSidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onToggleCollapse={() =>
          setCollapsed((prev) => !prev)
        }
        onCloseMobile={() =>
          setMobileOpen(false)
        }
      />

      <div
        className={`
          min-h-screen
          transition-all
          duration-300
          ${collapsed ? 'lg:pl-20' : 'lg:pl-72'}
        `}
      >
        {/* MOBILE HEADER */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur lg:hidden">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="rounded-xl p-2 text-slate-600 hover:bg-slate-100"
              aria-label="Buka menu"
            >
              <Menu size={21} />
            </button>

            <NagalaLogo
              size="sm"
              rounded="sm"
            />

            <div>
              <p className="text-sm font-bold text-slate-900">
                NAGALA
              </p>

              <p className="text-[9px] font-medium tracking-[0.15em] text-slate-400">
                EDUCATION
              </p>
            </div>
          </div>

          <button
            type="button"
            className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"
            aria-label="Notifikasi"
          >
            <Bell size={19} />
          </button>
        </header>

        {/* PAGE */}
        <main className="min-h-screen">
          {children}
        </main>
      </div>
    </div>
  )
}