'use client'

import { useState } from 'react'

import TutorSidebar from '@/components/dashboard/TutorSidebar'

export default function TutorDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="min-h-screen bg-slate-50">
      <TutorSidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onToggleCollapse={() =>
          setCollapsed((prev) => !prev)
        }
        onCloseMobile={() => setMobileOpen(false)}
      />

      <div
        className={[
          'min-h-screen transition-all duration-300',
          collapsed ? 'lg:pl-20' : 'lg:pl-72',
        ].join(' ')}
      >
        {/* Mobile Header */}
        <div className="sticky top-0 z-30 flex h-16 items-center border-b border-slate-200 bg-white/95 px-4 backdrop-blur lg:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Buka menu"
            className="rounded-xl p-2 text-slate-600 transition hover:bg-slate-100"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="4" x2="20" y1="6" y2="6" />
              <line x1="4" x2="20" y1="12" y2="12" />
              <line x1="4" x2="20" y1="18" y2="18" />
            </svg>
          </button>

          <div className="ml-3">
            <p className="text-sm font-bold text-slate-900">
              NAGALA Education
            </p>

            <p className="text-xs text-slate-500">
              Tutor Dashboard
            </p>
          </div>
        </div>

        <main>{children}</main>
      </div>
    </div>
  )
}