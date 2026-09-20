"use client"

import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  BookOpen,
  Brain,
  CalendarDays,
  Check,
  ChevronDown,
  Clock3,
  GraduationCap,
  Menu,
  Play,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  Users,
  X,
  type LucideIcon,
} from "lucide-react"
import Link from "next/link"
import { useEffect, useMemo, useRef, useState } from "react"
import NagalaLogo from "@/components/brand/NagalaLogo"

/* =========================================================
   TYPES
========================================================= */

type RoleKey = "student" | "tutor" | "parent"

type RoleData = {
  label: string
  eyebrow: string
  title: string
  description: string
  icon: LucideIcon
  accent: string
  metrics: {
    label: string
    value: string
    change: string
  }[]
  insight: string
  schedule: {
    time: string
    title: string
    meta: string
  }[]
}

type CursorState = {
  label: string
  visible: boolean
}

/* =========================================================
   DATA
========================================================= */

const roles: Record<RoleKey, RoleData> = {
  student: {
    label: "Siswa",
    eyebrow: "LEARNING OVERVIEW",
    title: "Belajar lebih terarah.",
    description:
      "Pantau jadwal, materi, kehadiran, nilai, dan perkembangan belajar dalam satu tempat.",
    icon: GraduationCap,
    accent: "#E53935",
    metrics: [
      {
        label: "Progress belajar",
        value: "82%",
        change: "+12%",
      },
      {
        label: "Kehadiran",
        value: "96%",
        change: "+4%",
      },
      {
        label: "Rata-rata nilai",
        value: "88.4",
        change: "+6.2",
      },
    ],
    insight:
      "Kamu konsisten belajar minggu ini. Pertahankan ritme untuk membuka pencapaian berikutnya.",
    schedule: [
      {
        time: "15:30",
        title: "Matematika",
        meta: "Persamaan Kuadrat",
      },
      {
        time: "19:00",
        title: "Bahasa Inggris",
        meta: "Reading Practice",
      },
    ],
  },

  tutor: {
    label: "Tutor",
    eyebrow: "TEACHING OVERVIEW",
    title: "Mengajar lebih terstruktur.",
    description:
      "Kelola kelas, presensi, materi, penilaian, dan feedback tanpa berpindah-pindah platform.",
    icon: Users,
    accent: "#E53935",
    metrics: [
      {
        label: "Siswa aktif",
        value: "24",
        change: "+3",
      },
      {
        label: "Kehadiran",
        value: "94%",
        change: "+5%",
      },
      {
        label: "Tugas selesai",
        value: "87%",
        change: "+9%",
      },
    ],
    insight:
      "3 siswa membutuhkan perhatian lebih pada materi minggu ini berdasarkan perkembangan nilai.",
    schedule: [
      {
        time: "14:00",
        title: "Kelas 8A",
        meta: "Aljabar Dasar",
      },
      {
        time: "16:00",
        title: "Kelas 9B",
        meta: "Persiapan Ujian",
      },
    ],
  },

  parent: {
    label: "Orang Tua",
    eyebrow: "FAMILY OVERVIEW",
    title: "Perkembangan lebih terlihat.",
    description:
      "Lihat aktivitas belajar, kehadiran, nilai, materi, dan pembayaran anak dari satu dashboard.",
    icon: BarChart3,
    accent: "#E53935",
    metrics: [
      {
        label: "Kehadiran anak",
        value: "96%",
        change: "+4%",
      },
      {
        label: "Rata-rata nilai",
        value: "89.2",
        change: "+7.1",
      },
      {
        label: "Tagihan aktif",
        value: "1",
        change: "SPP",
      },
    ],
    insight:
      "Performa belajar meningkat dibandingkan periode sebelumnya. Tidak ada pembayaran yang terlambat.",
    schedule: [
      {
        time: "15:30",
        title: "Matematika",
        meta: "Kelas Reguler",
      },
      {
        time: "18:30",
        title: "Review Materi",
        meta: "Mandiri",
      },
    ],
  },
}

const features = [
  {
    icon: Users,
    number: "01",
    title: "Manajemen pengguna",
    description:
      "Kelola Founder, Tutor, dan Orang Tua dengan hak akses yang jelas.",
  },
  {
    icon: GraduationCap,
    number: "02",
    title: "Akademik terpusat",
    description:
      "Kelas, siswa, presensi, materi, nilai, dan feedback berada dalam satu sistem.",
  },
  {
    icon: Target,
    number: "03",
    title: "Monitoring perkembangan",
    description:
      "Data belajar disajikan menjadi insight yang mudah dipahami.",
  },
  {
    icon: Brain,
    number: "04",
    title: "Learning intelligence",
    description:
      "Bantu tutor dan orang tua melihat pola perkembangan siswa secara lebih jelas.",
  },
]

const processSteps = [
  {
    number: "01",
    title: "Kelola",
    description:
      "Founder mengatur pengguna, siswa, kelas, tutor, program, dan keuangan.",
    icon: Users,
  },
  {
    number: "02",
    title: "Ajarkan",
    description:
      "Tutor mengelola presensi, materi, penilaian, dan feedback siswa.",
    icon: BookOpen,
  },
  {
    number: "03",
    title: "Pantau",
    description:
      "Orang tua melihat perkembangan anak secara langsung melalui dashboard.",
    icon: TrendingUp,
  },
]

const programs = [
  {
    title: "Matematika",
    category: "ACADEMIC",
    description: "Bangun kemampuan numerasi dan problem solving.",
    students: "SD • SMP • SMA",
    icon: Target,
  },
  {
    title: "Bahasa Inggris",
    category: "LANGUAGE",
    description: "Develop practical communication and confidence.",
    students: "SD • SMP • SMA",
    icon: BookOpen,
  },
  {
    title: "IPAS",
    category: "SCIENCE",
    description: "Eksplorasi sains melalui pembelajaran yang relevan.",
    students: "SD • SMP",
    icon: Brain,
  },
]

/* =========================================================
   REVEAL
========================================================= */

function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode
  className?: string
  delay?: number
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const reducedQuery = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    )

    const revealImmediately = () => {
      element.dataset.revealed = "true"
      element.style.removeProperty("--reveal-delay")
    }

    if (reducedQuery.matches) {
      revealImmediately()

      return () => {
        delete element.dataset.revealed
      }
    }

    element.style.setProperty("--reveal-delay", `${delay}ms`)

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          element.dataset.revealed = "true"
          observer.unobserve(element)
        }
      },
      {
        threshold: 0.12,
        rootMargin: "0px 0px -60px 0px",
      },
    )

    observer.observe(element)

    return () => {
      observer.disconnect()
      delete element.dataset.revealed
    }
  }, [delay])

  return (
    <div
      ref={ref}
      className={`reveal ${className}`}
      style={{ "--reveal-delay": `${delay}ms` } as React.CSSProperties}
    >
      {children}
    </div>
  )
}

/* =========================================================
   MAGNETIC
========================================================= */

function Magnetic({
  children,
  strength = 0.18,
  className = "",
}: {
  children: React.ReactNode
  strength?: number
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const finePointer = window.matchMedia(
      "(pointer: fine) and (prefers-reduced-motion: no-preference)",
    )

    if (!finePointer.matches) return

    const move = (event: MouseEvent) => {
      const rect = element.getBoundingClientRect()
      const x = event.clientX - rect.left - rect.width / 2
      const y = event.clientY - rect.top - rect.height / 2

      element.style.transform = `translate(${x * strength}px, ${
        y * strength
      }px)`
    }

    const leave = () => {
      element.style.transform = "translate(0, 0)"
    }

    element.addEventListener("mousemove", move)
    element.addEventListener("mouseleave", leave)

    return () => {
      element.removeEventListener("mousemove", move)
      element.removeEventListener("mouseleave", leave)
    }
  }, [strength])

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  )
}

/* =========================================================
   CURSOR FX
========================================================= */

function CursorFX() {
  const dotRef = useRef<HTMLDivElement>(null)
  const ringRef = useRef<HTMLDivElement>(null)
  const spotlightRef = useRef<HTMLDivElement>(null)
  const labelRef = useRef<HTMLDivElement>(null)

  const position = useRef({
    x: -100,
    y: -100,
  })

  const ringPosition = useRef({
    x: -100,
    y: -100,
  })

  const raf = useRef<number | null>(null)
  const labelTimer = useRef<number | null>(null)

  useEffect(() => {
    const finePointer = window.matchMedia(
      "(pointer: fine) and (prefers-reduced-motion: no-preference)",
    )

    if (!finePointer.matches) return

    document.documentElement.classList.add("cursor-enhanced")

    const updateCursor = (event: MouseEvent) => {
      position.current.x = event.clientX
      position.current.y = event.clientY
    }

    const loop = () => {
      ringPosition.current.x +=
        (position.current.x - ringPosition.current.x) * 0.14

      ringPosition.current.y +=
        (position.current.y - ringPosition.current.y) * 0.14

      if (dotRef.current) {
        dotRef.current.style.transform = `translate3d(${position.current.x}px, ${position.current.y}px, 0)`
      }

      if (ringRef.current) {
        ringRef.current.style.transform = `translate3d(${ringPosition.current.x}px, ${ringPosition.current.y}px, 0)`
      }

      if (spotlightRef.current) {
        spotlightRef.current.style.transform = `translate3d(${position.current.x}px, ${position.current.y}px, 0)`
      }

      raf.current = requestAnimationFrame(loop)
    }

    const handleOver = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null
      const interactive = target?.closest<HTMLElement>("[data-cursor]")

      const label = interactive?.dataset.cursor ?? ""
      const type = interactive?.dataset.cursorType ?? ""

      ringRef.current?.classList.toggle(
        "cursor-ring-active",
        Boolean(interactive),
      )

      ringRef.current?.classList.toggle(
        "cursor-ring-play",
        type === "play",
      )

      if (labelRef.current) {
        labelRef.current.classList.remove("cursor-label-visible")

        if (labelTimer.current) {
          window.clearTimeout(labelTimer.current)
        }

        labelTimer.current = window.setTimeout(() => {
          if (!labelRef.current) return

          labelRef.current.textContent = label

          if (label) {
            labelRef.current.classList.add("cursor-label-visible")
          }
        }, 75)
      }
    }

    window.addEventListener("mousemove", updateCursor)
    document.addEventListener("mouseover", handleOver)

    raf.current = requestAnimationFrame(loop)

    return () => {
      window.removeEventListener("mousemove", updateCursor)
      document.removeEventListener("mouseover", handleOver)

      if (raf.current) {
        cancelAnimationFrame(raf.current)
      }

      if (labelTimer.current) {
        window.clearTimeout(labelTimer.current)
      }

      document.documentElement.classList.remove("cursor-enhanced")
    }
  }, [])

  return (
    <>
      <div ref={dotRef} className="cursor-dot" />
      <div ref={ringRef} className="cursor-ring">
        <div ref={labelRef} className="cursor-label" />
      </div>
      <div ref={spotlightRef} className="cursor-spotlight" />
    </>
  )
}

/* =========================================================
   ANIMATED NUMBER
========================================================= */

function AnimatedNumber({
  value,
  suffix = "",
}: {
  value: number
  suffix?: string
}) {
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches

    if (reduced) {
      element.textContent = `${value}${suffix}`
      return
    }

    let start = 0
    const duration = 900
    const startTime = performance.now()

    const animate = (time: number) => {
      const progress = Math.min((time - startTime) / duration, 1)

      const eased = 1 - Math.pow(1 - progress, 3)

      start = value * eased

      element.textContent = `${Math.round(start)}${suffix}`

      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }

    requestAnimationFrame(animate)
  }, [value, suffix])

  return <span ref={ref}>0{suffix}</span>
}

/* =========================================================
   DASHBOARD NAV ITEM
========================================================= */

function DashboardNavItem({
  icon: Icon,
  label,
  active = false,
}: {
  icon: LucideIcon
  label: string
  active?: boolean
}) {
  return (
    <div
      className={`flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-medium transition-all ${
        active
          ? "bg-[#111827] text-white shadow-sm"
          : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
      }`}
    >
      <Icon size={15} strokeWidth={1.8} />
      <span>{label}</span>
    </div>
  )
}

/* =========================================================
   METRIC CARD
========================================================= */

function MetricCard({
  label,
  value,
  change,
  index,
}: {
  label: string
  value: string
  change: string
  index: number
}) {
  return (
    <div
      className="dashboard-metric group rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.04)] transition-all duration-500 hover:-translate-y-1 hover:border-slate-300 hover:shadow-[0_18px_40px_rgba(15,23,42,0.08)]"
      style={{
        animationDelay: `${index * 90}ms`,
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="text-[10px] font-semibold uppercase tracking-[0.13em] text-slate-400">
          {label}
        </span>

        <span className="rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-semibold text-emerald-600">
          {change}
        </span>
      </div>

      <div className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-[#111827]">
        {value}
      </div>
    </div>
  )
}

/* =========================================================
   SCHEDULE ITEM
========================================================= */

function ScheduleItem({
  time,
  title,
  meta,
}: {
  time: string
  title: string
  meta: string
}) {
  return (
    <div className="group flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3 transition-all duration-300 hover:border-slate-200 hover:bg-white hover:shadow-sm">
      <div className="w-12 shrink-0 text-[10px] font-semibold text-slate-400">
        {time}
      </div>

      <div className="h-8 w-px bg-slate-200" />

      <div className="min-w-0">
        <div className="truncate text-xs font-semibold text-slate-800">
          {title}
        </div>
        <div className="mt-0.5 truncate text-[10px] text-slate-400">
          {meta}
        </div>
      </div>

      <ArrowUpRight
        size={14}
        className="ml-auto shrink-0 text-slate-300 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[#E53935]"
      />
    </div>
  )
}

/* =========================================================
   ROLE SWITCHER
========================================================= */

function RoleSwitcher({
  active,
  onChange,
}: {
  active: RoleKey
  onChange: (role: RoleKey) => void
}) {
  return (
    <div className="flex flex-wrap gap-1 rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
      {(Object.keys(roles) as RoleKey[]).map((role) => {
        const data = roles[role]
        const RoleIcon = data.icon

        return (
          <button
            key={role}
            type="button"
            onClick={() => onChange(role)}
            data-cursor="VIEW"
            className={`flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl px-3 text-xs font-semibold transition-all duration-300 ${
              active === role
                ? "bg-[#111827] text-white shadow-md"
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <RoleIcon size={15} />
            {data.label}
          </button>
        )
      })}
    </div>
  )
}

/* =========================================================
   DASHBOARD PREVIEW
========================================================= */

function DashboardPreview() {
  const [activeRole, setActiveRole] = useState<RoleKey>("student")
  const [tilt, setTilt] = useState({
    x: 0,
    y: 0,
  })

  const dashboardRef = useRef<HTMLDivElement>(null)

  const data = roles[activeRole]

  const chartPoints = useMemo(() => {
    if (activeRole === "student") {
      return "0,115 40,105 80,108 120,84 160,91 200,67 240,73 280,48 320,54 360,27"
    }

    if (activeRole === "tutor") {
      return "0,108 40,100 80,92 120,95 160,73 200,79 240,59 280,51 320,38 360,25"
    }

    return "0,110 40,102 80,95 120,89 160,80 200,83 240,64 280,58 320,42 360,31"
  }, [activeRole])

  useEffect(() => {
    const element = dashboardRef.current
    if (!element) return

    const media = window.matchMedia(
      "(min-width: 1024px) and (pointer: fine) and (prefers-reduced-motion: no-preference)",
    )

    if (!media.matches) return

    const move = (event: MouseEvent) => {
      const rect = element.getBoundingClientRect()

      const px = (event.clientX - rect.left) / rect.width
      const py = (event.clientY - rect.top) / rect.height

      setTilt({
        x: (0.5 - py) * 5,
        y: (px - 0.5) * 6,
      })
    }

    const leave = () => {
      setTilt({
        x: 0,
        y: 0,
      })
    }

    element.addEventListener("mousemove", move)
    element.addEventListener("mouseleave", leave)

    return () => {
      element.removeEventListener("mousemove", move)
      element.removeEventListener("mouseleave", leave)
    }
  }, [])

  return (
    <div
      ref={dashboardRef}
      className="relative mx-auto w-full max-w-[1120px]"
      style={{
        perspective: "1600px",
      }}
    >
      {/* ambient glow */}
      <div className="pointer-events-none absolute -inset-12 -z-10 rounded-[3rem] bg-[radial-gradient(circle_at_center,rgba(229,57,53,0.16),transparent_62%)] blur-3xl" />

      {/* dashboard shell */}
      <div
        className="dashboard-float overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-[0_40px_100px_rgba(15,23,42,0.16)] transition-transform duration-300 ease-out"
        style={{
          transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
          transformStyle: "preserve-3d",
        }}
      >
        <div className="grid min-h-[560px] transition-[min-height] duration-500 max-[379px]:min-h-[620px] lg:grid-cols-[190px_1fr]">
          {/* sidebar */}
          <aside className="hidden border-r border-slate-100 bg-[#FAFAFA] p-4 lg:block">
            <div className="flex items-center gap-2 px-2">
              <NagalaLogo size="sm" rounded="md" />

              <div>
                <div className="text-xs font-bold tracking-[-0.02em] text-[#111827]">
                  NAGALA
                </div>
                <div className="text-[8px] uppercase tracking-[0.14em] text-slate-400">
                  Education
                </div>
              </div>
            </div>

            <div className="mt-7 space-y-1">
              <DashboardNavItem
                icon={BarChart3}
                label="Overview"
                active
              />
              <DashboardNavItem icon={CalendarDays} label="Schedule" />
              <DashboardNavItem icon={BookOpen} label="Learning" />
              <DashboardNavItem icon={Target} label="Progress" />
            </div>

            <div className="mt-8">
              <div className="px-3 text-[8px] font-semibold uppercase tracking-[0.16em] text-slate-300">
                Account
              </div>

              <div className="mt-2 space-y-1">
                <DashboardNavItem icon={Users} label="People" />
                <DashboardNavItem icon={Clock3} label="Activity" />
              </div>
            </div>

            <div className="mt-auto pt-20">
              <div className="rounded-2xl bg-[#111827] p-3 text-white">
                <Sparkles size={15} className="text-[#FF8B86]" />

                <div className="mt-3 text-[10px] font-semibold">
                  Learning insight
                </div>

                <div className="mt-1 text-[9px] leading-relaxed text-slate-400">
                  Small progress compounds into big results.
                </div>
              </div>
            </div>
          </aside>

          {/* main */}
          <main className="min-w-0 bg-white p-4 sm:p-5 lg:p-6">
            {/* mobile mini nav */}
            <div className="mb-5 flex items-center justify-between lg:hidden">
              <div className="flex items-center gap-2">
                <NagalaLogo size="sm" rounded="md" />

                <div>
                  <div className="text-xs font-bold text-[#111827]">
                    NAGALA
                  </div>
                  <div className="text-[8px] uppercase tracking-[0.13em] text-slate-400">
                    Dashboard
                  </div>
                </div>
              </div>

              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100">
                <div className="h-2 w-2 rounded-full bg-[#E53935]" />
              </div>
            </div>

            {/* top */}
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <div className="text-[9px] font-semibold tracking-[0.18em] text-[#E53935]">
                  {data.eyebrow}
                </div>

                <h3 className="mt-1 text-lg font-semibold tracking-[-0.04em] text-[#111827] sm:text-xl">
                  {data.title}
                </h3>

                <p className="mt-1 max-w-lg text-[10px] leading-relaxed text-slate-400 sm:text-[11px]">
                  {data.description}
                </p>
              </div>

              <div className="hidden rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[9px] font-semibold text-slate-500 sm:block">
                September 2026
              </div>
            </div>

            <div className="mt-5">
              <RoleSwitcher
                active={activeRole}
                onChange={setActiveRole}
              />
            </div>

            {/* metrics */}
            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {data.metrics.map((metric, index) => (
                <MetricCard
                  key={`${activeRole}-${metric.label}`}
                  label={metric.label}
                  value={metric.value}
                  change={metric.change}
                  index={index}
                />
              ))}
            </div>

            {/* chart + insight */}
            <div className="mt-3 grid gap-3 lg:grid-cols-[1.55fr_0.8fr]">
              <div className="rounded-2xl border border-slate-200/80 bg-white p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                      Learning progress
                    </div>
                    <div className="mt-1 text-lg font-semibold tracking-[-0.04em] text-[#111827]">
                      +18.6%
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-[9px] font-semibold text-emerald-600">
                    <TrendingUp size={12} />
                    Growing
                  </div>
                </div>

                <div className="relative mt-5 h-[130px] overflow-hidden rounded-xl bg-slate-50/70">
                  <div className="absolute inset-x-0 top-1/4 border-t border-dashed border-slate-200" />
                  <div className="absolute inset-x-0 top-2/4 border-t border-dashed border-slate-200" />
                  <div className="absolute inset-x-0 top-3/4 border-t border-dashed border-slate-200" />

                  <svg
                    viewBox="0 0 360 130"
                    className="absolute inset-0 h-full w-full overflow-visible"
                    preserveAspectRatio="none"
                  >
                    <defs>
                      <linearGradient
                        id="chartFill"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="#E53935"
                          stopOpacity="0.20"
                        />
                        <stop
                          offset="100%"
                          stopColor="#E53935"
                          stopOpacity="0"
                        />
                      </linearGradient>
                    </defs>

                    <polyline
                      points={`${chartPoints} 360,130 0,130`}
                      fill="url(#chartFill)"
                      stroke="none"
                    />

                    <polyline
                      className="chart-line"
                      points={chartPoints}
                      fill="none"
                      stroke="#E53935"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />

                    <circle
                      className="chart-dot"
                      cx="360"
                      cy={activeRole === "student" ? "27" : activeRole === "tutor" ? "25" : "31"}
                      r="4"
                      fill="#E53935"
                    />
                  </svg>
                </div>

                <div className="mt-2 flex justify-between text-[8px] text-slate-300">
                  <span>W1</span>
                  <span>W2</span>
                  <span>W3</span>
                  <span>W4</span>
                </div>
              </div>

              <div className="min-h-[205px] rounded-2xl bg-[#111827] p-4 text-white transition-[min-height] duration-500">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/10">
                    <Sparkles size={14} className="text-[#FF8B86]" />
                  </div>

                  <div>
                    <div className="text-[9px] font-semibold uppercase tracking-[0.13em] text-slate-500">
                      NAGALA Insight
                    </div>
                    <div className="text-xs font-semibold">
                      Weekly overview
                    </div>
                  </div>
                </div>

                <p className="mt-5 min-h-[32px] text-[10px] leading-relaxed text-slate-300 transition-[min-height] duration-500">
                  {data.insight}
                </p>

                <div className="mt-5">
                  <div className="flex items-center justify-between text-[9px]">
                    <span className="text-slate-500">
                      Overall progress
                    </span>
                    <span className="font-semibold text-white">
                      <AnimatedNumber value={82} suffix="%" />
                    </span>
                  </div>

                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                    <div className="progress-bar h-full rounded-full bg-[#E53935]" />
                  </div>
                </div>
              </div>
            </div>

            {/* schedule */}
            <div className="mt-3 rounded-2xl border border-slate-200/80 bg-white p-4">
              <div className="flex items-center justify-between">
                <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                  Upcoming
                </div>

                <button
                  type="button"
                  className="text-[9px] font-semibold text-[#E53935] transition-colors hover:text-[#B71C1C]"
                  data-cursor="VIEW"
                >
                  View all
                </button>
              </div>

              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {data.schedule.map((item) => (
                  <ScheduleItem
                    key={`${activeRole}-${item.time}`}
                    {...item}
                  />
                ))}
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}

/* =========================================================
   FEATURE CARD
========================================================= */

function FeatureCard({
  icon: Icon,
  number,
  title,
  description,
}: {
  icon: LucideIcon
  number: string
  title: string
  description: string
}) {
  return (
    <article
      data-cursor="VIEW"
      className="group relative overflow-hidden rounded-[24px] border border-slate-200 bg-white p-6 transition-all duration-500 hover:-translate-y-2 hover:border-slate-300 hover:shadow-[0_24px_60px_rgba(15,23,42,0.09)] sm:p-7"
    >
      <div className="flex items-start justify-between">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-[#111827] transition-all duration-500 group-hover:bg-[#111827] group-hover:text-white">
          <Icon size={19} strokeWidth={1.7} />
        </div>

        <span className="text-xs font-semibold text-slate-300">
          {number}
        </span>
      </div>

      <h3 className="mt-8 text-lg font-semibold tracking-[-0.035em] text-[#111827]">
        {title}
      </h3>

      <p className="mt-2 text-sm leading-6 text-slate-500">
        {description}
      </p>

      <div className="mt-8 flex items-center gap-2 text-xs font-semibold text-slate-400 transition-all duration-300 group-hover:gap-3 group-hover:text-[#E53935]">
        Explore
        <ArrowRight size={14} />
      </div>

      <div className="pointer-events-none absolute -bottom-16 -right-16 h-32 w-32 rounded-full bg-[#E53935]/5 blur-2xl transition-all duration-500 group-hover:scale-150" />
    </article>
  )
}

/* =========================================================
   PROCESS CARD
========================================================= */

function ProcessCard({
  number,
  title,
  description,
  icon: Icon,
}: {
  number: string
  title: string
  description: string
  icon: LucideIcon
}) {
  return (
    <article className="relative">
      <div className="mb-5 flex items-center justify-between">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#111827] text-white">
          <Icon size={18} />
        </div>

        <span className="text-xs font-semibold text-slate-300">
          {number}
        </span>
      </div>

      <h3 className="text-xl font-semibold tracking-[-0.04em] text-[#111827]">
        {title}
      </h3>

      <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
        {description}
      </p>
    </article>
  )
}

/* =========================================================
   PROGRAM CARD
========================================================= */

function ProgramCard({
  title,
  category,
  description,
  students,
  icon: Icon,
}: {
  title: string
  category: string
  description: string
  students: string
  icon: LucideIcon
}) {
  return (
    <article
      data-cursor="VIEW"
      className="group relative min-h-[270px] overflow-hidden rounded-[28px] border border-slate-200 bg-white p-6 transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_30px_70px_rgba(15,23,42,0.10)] sm:p-7"
    >
      <div className="flex items-start justify-between">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#111827] text-white transition-all duration-500 group-hover:scale-105 group-hover:bg-[#E53935]">
          <Icon size={18} />
        </div>

        <ArrowUpRight
          size={18}
          className="text-slate-300 transition-all duration-500 group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-[#E53935]"
        />
      </div>

      <div className="mt-9 text-[9px] font-bold tracking-[0.18em] text-[#E53935]">
        {category}
      </div>

      <h3 className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-[#111827]">
        {title}
      </h3>

      <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
        {description}
      </p>

      <div className="absolute bottom-6 left-6 right-6 flex items-center justify-between border-t border-slate-100 pt-4">
        <span className="text-[10px] font-semibold text-slate-400">
          {students}
        </span>

        <span className="text-[10px] font-semibold text-slate-400 transition-colors group-hover:text-[#E53935]">
          Explore program
        </span>
      </div>

      <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-[#E53935]/5 blur-3xl transition-transform duration-700 group-hover:scale-150" />
    </article>
  )
}

/* =========================================================
   HOME
========================================================= */

export default function Home() {
  const [mobileMenu, setMobileMenu] = useState(false)

  const year = new Date().getFullYear()

  useEffect(() => {
    document.body.style.overflow = mobileMenu ? "hidden" : ""

    return () => {
      document.body.style.overflow = ""
    }
  }, [mobileMenu])

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#FAF9F7] text-[#111827]">
      <CursorFX />

      {/* =====================================================
          GLOBAL STYLE
      ===================================================== */}

      <style jsx global>{`
        html {
          scroll-behavior: smooth;
        }

        body {
          background: #faf9f7;
        }

        .reveal {
          opacity: 0;
          transform: translateY(30px);
          transition:
            opacity 800ms cubic-bezier(0.16, 1, 0.3, 1),
            transform 800ms cubic-bezier(0.16, 1, 0.3, 1);
          transition-delay: var(--reveal-delay, 0ms);
        }

        .reveal[data-revealed="true"] {
          opacity: 1;
          transform: translateY(0);
        }

        .cursor-dot,
        .cursor-ring,
        .cursor-spotlight {
          position: fixed;
          pointer-events: none;
          z-index: 9999;
          left: 0;
          top: 0;
        }

        .cursor-dot {
          width: 7px;
          height: 7px;
          margin-left: -3.5px;
          margin-top: -3.5px;
          border-radius: 999px;
          background: #e53935;
          opacity: 0;
        }

        .cursor-ring {
          width: 38px;
          height: 38px;
          margin-left: -19px;
          margin-top: -19px;
          border: 1px solid rgba(17, 24, 39, 0.25);
          border-radius: 999px;
          opacity: 0;
          transition:
            width 300ms cubic-bezier(0.16, 1, 0.3, 1),
            height 300ms cubic-bezier(0.16, 1, 0.3, 1),
            margin 300ms cubic-bezier(0.16, 1, 0.3, 1),
            background 300ms ease,
            border-color 300ms ease;
        }

        .cursor-ring-active {
          width: 58px;
          height: 58px;
          margin-left: -29px;
          margin-top: -29px;
          background: rgba(229, 57, 53, 0.08);
          border-color: rgba(229, 57, 53, 0.5);
        }

        .cursor-ring-play {
          width: 70px;
          height: 70px;
          margin-left: -35px;
          margin-top: -35px;
          background: rgba(229, 57, 53, 0.1);
          border-color: rgba(229, 57, 53, 0.7);
        }

        .cursor-label {
          position: absolute;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
          white-space: nowrap;
          font-size: 8px;
          font-weight: 800;
          letter-spacing: 0.12em;
          color: #e53935;
          opacity: 0;
          transition: opacity 180ms ease;
        }

        .cursor-label-visible {
          opacity: 1;
        }

        .cursor-spotlight {
          width: 420px;
          height: 420px;
          margin-left: -210px;
          margin-top: -210px;
          border-radius: 999px;
          background: radial-gradient(
            circle,
            rgba(229, 57, 53, 0.045),
            rgba(229, 57, 53, 0) 68%
          );
          z-index: 0;
          opacity: 0;
        }

        .dashboard-float {
          animation: dashboardFloat 7s ease-in-out infinite;
        }

        @keyframes dashboardFloat {
          0%,
          100% {
            transform: translateY(0);
          }

          50% {
            transform: translateY(-8px);
          }
        }

        .dashboard-metric {
          animation: metricIn 700ms cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        @keyframes metricIn {
          from {
            opacity: 0;
            transform: translateY(12px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .chart-line {
          stroke-dasharray: 600;
          stroke-dashoffset: 600;
          animation: chartDraw 1.5s cubic-bezier(0.16, 1, 0.3, 1)
            350ms forwards;
        }

        .chart-dot {
          opacity: 0;
          animation: dotAppear 500ms ease 1.45s forwards;
        }

        @keyframes chartDraw {
          to {
            stroke-dashoffset: 0;
          }
        }

        @keyframes dotAppear {
          to {
            opacity: 1;
          }
        }

        .progress-bar {
          width: 0;
          animation: progressIn 1.2s cubic-bezier(0.16, 1, 0.3, 1)
            800ms forwards;
        }

        @keyframes progressIn {
          to {
            width: 82%;
          }
        }

        @media (pointer: fine) and (prefers-reduced-motion: no-preference) {
          .cursor-enhanced,
          .cursor-enhanced body {
            cursor: none;
          }

          .cursor-enhanced .cursor-dot,
          .cursor-enhanced .cursor-ring,
          .cursor-enhanced .cursor-spotlight {
            opacity: 1;
          }
        }

        @media (max-width: 767px) {
          .dashboard-float {
            animation: none;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          html {
            scroll-behavior: auto;
          }

          .reveal {
            opacity: 1;
            transform: none;
            transition: none;
          }

          .dashboard-float,
          .dashboard-metric,
          .chart-line,
          .chart-dot,
          .progress-bar {
            animation: none !important;
          }

          .progress-bar {
            width: 82%;
          }
        }
      `}</style>

      {/* =====================================================
          NAVBAR
      ===================================================== */}

      <header className="fixed inset-x-0 top-0 z-50">
        <div className="mx-auto max-w-[1440px] px-4 pt-4 sm:px-6 lg:px-8">
          <nav className="flex h-14 items-center justify-between rounded-2xl border border-white/70 bg-white/80 px-3 shadow-[0_10px_40px_rgba(15,23,42,0.06)] backdrop-blur-xl sm:px-4">
            <Link
              href="/"
              className="flex items-center gap-2.5"
              data-cursor="HOME"
            >
              <NagalaLogo size="sm" rounded="md" />

              <div className="hidden sm:block">
                <div className="text-sm font-bold tracking-[-0.03em]">
                  NAGALA
                </div>
                <div className="text-[8px] font-medium uppercase tracking-[0.16em] text-slate-400">
                  Education
                </div>
              </div>
            </Link>

            <div className="hidden items-center gap-7 md:flex">
              <Link
                href="#about"
                className="text-xs font-medium text-slate-500 transition-colors hover:text-[#111827]"
                data-cursor="VIEW"
              >
                Tentang
              </Link>

              <Link
                href="#system"
                className="text-xs font-medium text-slate-500 transition-colors hover:text-[#111827]"
                data-cursor="VIEW"
              >
                Sistem
              </Link>

              <Link
                href="#program"
                className="text-xs font-medium text-slate-500 transition-colors hover:text-[#111827]"
                data-cursor="VIEW"
              >
                Program
              </Link>

              <Link
                href="#process"
                className="text-xs font-medium text-slate-500 transition-colors hover:text-[#111827]"
                data-cursor="VIEW"
              >
                Cara kerja
              </Link>
            </div>

            <div className="hidden md:block">
              <Magnetic strength={0.12}>
                <Link
                  href="/login"
                  data-cursor="OPEN"
                  className="inline-flex h-9 items-center gap-2 rounded-xl bg-[#111827] px-4 text-xs font-semibold text-white shadow-lg shadow-slate-900/10 transition-all hover:bg-[#E53935]"
                >
                  Masuk
                  <ArrowUpRight size={13} />
                </Link>
              </Magnetic>
            </div>

            <button
              type="button"
              aria-label={mobileMenu ? "Tutup menu" : "Buka menu"}
              onClick={() => setMobileMenu((value) => !value)}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 md:hidden"
            >
              {mobileMenu ? <X size={18} /> : <Menu size={18} />}
            </button>
          </nav>

          {mobileMenu && (
            <div className="mt-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl md:hidden">
              <div className="space-y-1">
                {[
                  ["Tentang", "#about"],
                  ["Sistem", "#system"],
                  ["Program", "#program"],
                  ["Cara kerja", "#process"],
                ].map(([label, href]) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setMobileMenu(false)}
                    className="flex min-h-11 items-center rounded-xl px-3 text-sm font-medium text-slate-600 hover:bg-slate-50"
                  >
                    {label}
                  </Link>
                ))}
              </div>

              <Link
                href="/login"
                onClick={() => setMobileMenu(false)}
                className="mt-2 flex min-h-11 items-center justify-center rounded-xl bg-[#111827] text-sm font-semibold text-white"
              >
                Masuk ke dashboard
              </Link>
            </div>
          )}
        </div>
      </header>

      {/* =====================================================
          HERO
      ===================================================== */}

      <section className="relative overflow-hidden px-4 pb-16 pt-32 sm:px-6 sm:pb-20 lg:px-8 lg:pb-28 lg:pt-40">
        <div className="pointer-events-none absolute left-1/2 top-0 h-[700px] w-[900px] -translate-x-1/2 bg-[radial-gradient(circle,rgba(229,57,53,0.07),transparent_65%)]" />

        <div className="relative mx-auto max-w-[1440px]">
          <div className="mx-auto max-w-4xl text-center">
            <Reveal>
              <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 shadow-sm">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#E53935]/10">
                  <Sparkles size={11} className="text-[#E53935]" />
                </span>

                <span className="text-[9px] font-bold uppercase tracking-[0.17em] text-slate-500">
                  Learning management, reimagined
                </span>
              </div>
            </Reveal>

            <Reveal delay={80}>
              <h1 className="mx-auto mt-6 max-w-4xl text-[clamp(2.7rem,7vw,6.5rem)] font-semibold leading-[0.94] tracking-[-0.075em] text-[#111827]">
                Belajar lebih{" "}
                <span className="text-[#E53935]">terarah.</span>
                <br />
                Berkembang lebih{" "}
                <span className="relative inline-block">
                  terlihat.
                  <span className="absolute -bottom-2 left-1/2 h-1 w-20 -translate-x-1/2 rounded-full bg-[#E53935]/20 sm:w-28" />
                </span>
              </h1>
            </Reveal>

            <Reveal delay={160}>
              <p className="mx-auto mt-6 max-w-xl text-sm leading-7 text-slate-500 sm:text-base">
                NAGALA Education menyatukan pembelajaran, pengelolaan
                akademik, perkembangan siswa, dan keuangan dalam satu
                ekosistem digital yang sederhana.
              </p>
            </Reveal>

            <Reveal delay={240}>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Magnetic strength={0.2}>
                  <Link
                    href="/login"
                    data-cursor="OPEN"
                    className="group inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#E53935] px-6 text-sm font-semibold text-white shadow-[0_14px_35px_rgba(229,57,53,0.22)] transition-all hover:-translate-y-0.5 hover:bg-[#D32F2F] hover:shadow-[0_18px_45px_rgba(229,57,53,0.28)]"
                  >
                    Mulai belajar
                    <ArrowRight
                      size={16}
                      className="transition-transform group-hover:translate-x-1"
                    />
                  </Link>
                </Magnetic>

                <Link
                  href="#system"
                  data-cursor="VIEW"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 text-sm font-semibold text-[#111827] transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg"
                >
                  Lihat sistem
                  <Play size={13} fill="currentColor" />
                </Link>
              </div>
            </Reveal>
          </div>

          {/* hero meta */}
          <Reveal delay={320} className="mt-12">
            <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-center gap-x-7 gap-y-3 text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-400">
              <span className="flex items-center gap-2">
                <Check size={12} className="text-[#E53935]" />
                Academic management
              </span>

              <span className="flex items-center gap-2">
                <Check size={12} className="text-[#E53935]" />
                Parent visibility
              </span>

              <span className="flex items-center gap-2">
                <Check size={12} className="text-[#E53935]" />
                Integrated finance
              </span>

              <span className="flex items-center gap-2">
                <Check size={12} className="text-[#E53935]" />
                Secure access
              </span>
            </div>
          </Reveal>

          {/* dashboard */}
          <Reveal delay={400} className="mt-12 sm:mt-16 lg:mt-20">
            <DashboardPreview />
          </Reveal>
        </div>
      </section>

      {/* =====================================================
          TRUST STRIP
      ===================================================== */}

      <section className="border-y border-slate-200/80 bg-white">
        <div className="mx-auto grid max-w-[1440px] grid-cols-2 divide-x divide-y divide-slate-100 sm:grid-cols-4 sm:divide-y-0">
          {[
            ["01", "One-stop portal"],
            ["02", "Role-based access"],
            ["03", "Real-time progress"],
            ["04", "Integrated payment"],
          ].map(([number, text]) => (
            <div
              key={number}
              className="flex items-center gap-3 px-4 py-5 sm:px-6 lg:px-8"
            >
              <span className="text-[9px] font-bold text-[#E53935]">
                {number}
              </span>

              <span className="text-[10px] font-semibold text-slate-500 sm:text-xs">
                {text}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* =====================================================
          ABOUT
      ===================================================== */}

      <section
        id="about"
        className="px-4 py-20 sm:px-6 sm:py-28 lg:px-8 lg:py-36"
      >
        <div className="mx-auto max-w-[1440px]">
          <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
            <Reveal>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#E53935]">
                  About NAGALA
                </div>

                <h2 className="mt-4 max-w-lg text-4xl font-semibold leading-[1.02] tracking-[-0.06em] text-[#111827] sm:text-5xl lg:text-6xl">
                  Bukan sekadar tempat les.
                </h2>
              </div>
            </Reveal>

            <Reveal delay={100}>
              <div className="max-w-2xl lg:pt-8">
                <p className="text-xl leading-8 tracking-[-0.025em] text-slate-600 sm:text-2xl">
                  NAGALA dirancang untuk membuat proses belajar lebih
                  terhubung — dari tutor yang mengajar, siswa yang
                  berkembang, sampai orang tua yang ingin melihat
                  progresnya.
                </p>

                <div className="mt-8 h-px w-full bg-slate-200" />

                <div className="mt-8 flex flex-wrap gap-x-8 gap-y-4 text-xs font-semibold text-slate-500">
                  <span>Learning</span>
                  <span>Teaching</span>
                  <span>Monitoring</span>
                  <span>Finance</span>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* =====================================================
          STATEMENT
      ===================================================== */}

      <section className="px-4 pb-20 sm:px-6 sm:pb-28 lg:px-8 lg:pb-36">
        <div className="mx-auto max-w-[1440px]">
          <Reveal>
            <div className="relative overflow-hidden rounded-[32px] bg-[#111827] px-6 py-14 text-center sm:px-12 sm:py-20 lg:px-20 lg:py-28">
              <div className="pointer-events-none absolute left-1/2 top-1/2 h-[500px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#E53935]/10 blur-3xl" />

              <div className="relative">
                <Star
                  size={20}
                  fill="currentColor"
                  className="mx-auto text-[#E53935]"
                />

                <blockquote className="mx-auto mt-6 max-w-5xl text-3xl font-medium leading-[1.05] tracking-[-0.055em] text-white sm:text-5xl lg:text-6xl">
                  “Ketika data belajar menjadi lebih terlihat,{" "}
                  <span className="text-[#FF7B76]">
                    keputusan menjadi lebih berarti.
                  </span>
                  ”
                </blockquote>

                <p className="mx-auto mt-7 max-w-xl text-sm leading-6 text-slate-400">
                  NAGALA membantu setiap pihak memahami proses belajar,
                  bukan sekadar melihat hasil akhirnya.
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* =====================================================
          SYSTEM
      ===================================================== */}

      <section
        id="system"
        className="bg-white px-4 py-20 sm:px-6 sm:py-28 lg:px-8 lg:py-36"
      >
        <div className="mx-auto max-w-[1440px]">
          <Reveal>
            <div className="max-w-2xl">
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#E53935]">
                One system
              </div>

              <h2 className="mt-4 text-4xl font-semibold leading-[1.02] tracking-[-0.06em] text-[#111827] sm:text-5xl lg:text-6xl">
                Semua yang penting,
                <br />
                tetap terhubung.
              </h2>

              <p className="mt-5 max-w-xl text-sm leading-7 text-slate-500 sm:text-base">
                Tidak perlu lagi berpindah-pindah spreadsheet,
                chat, dan aplikasi untuk memahami apa yang terjadi
                dalam proses belajar.
              </p>
            </div>
          </Reveal>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature, index) => (
              <Reveal key={feature.number} delay={index * 80}>
                <FeatureCard {...feature} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* =====================================================
          PROCESS
      ===================================================== */}

      <section
        id="process"
        className="px-4 py-20 sm:px-6 sm:py-28 lg:px-8 lg:py-36"
      >
        <div className="mx-auto max-w-[1440px]">
          <div className="grid gap-14 lg:grid-cols-[0.7fr_1.3fr]">
            <Reveal>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#E53935]">
                  How it works
                </div>

                <h2 className="mt-4 max-w-md text-4xl font-semibold leading-[1.03] tracking-[-0.06em] sm:text-5xl">
                  Satu alur.
                  <br />
                  Tiga peran.
                </h2>

                <p className="mt-5 max-w-md text-sm leading-7 text-slate-500">
                  Setiap orang mendapatkan pengalaman yang
                  disesuaikan dengan tanggung jawabnya.
                </p>
              </div>
            </Reveal>

            <div className="grid gap-10 sm:grid-cols-3">
              {processSteps.map((step, index) => (
                <Reveal key={step.number} delay={index * 100}>
                  <ProcessCard {...step} />
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================
          PROGRAM
      ===================================================== */}

      <section
        id="program"
        className="bg-[#F3F1ED] px-4 py-20 sm:px-6 sm:py-28 lg:px-8 lg:py-36"
      >
        <div className="mx-auto max-w-[1440px]">
          <Reveal>
            <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#E53935]">
                  Programs
                </div>

                <h2 className="mt-4 text-4xl font-semibold tracking-[-0.06em] sm:text-5xl">
                  Program yang relevan.
                </h2>
              </div>

              <p className="max-w-md text-sm leading-6 text-slate-500">
                Dirancang untuk mendukung kebutuhan belajar siswa
                dari berbagai jenjang dan karakter.
              </p>
            </div>
          </Reveal>

          <div className="mt-10 grid gap-4 lg:grid-cols-3">
            {programs.map((program, index) => (
              <Reveal key={program.title} delay={index * 100}>
                <ProgramCard {...program} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* =====================================================
          CTA
      ===================================================== */}

      <section className="px-4 py-20 sm:px-6 sm:py-28 lg:px-8 lg:py-36">
        <div className="mx-auto max-w-[1440px]">
          <Reveal>
            <div className="relative overflow-hidden rounded-[32px] border border-slate-200 bg-white px-6 py-16 text-center shadow-[0_30px_90px_rgba(15,23,42,0.07)] sm:px-12 sm:py-24">
              <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-[#E53935]/5 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-[#E53935]/5 blur-3xl" />

              <div className="relative">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#111827] text-white">
                  <Sparkles size={19} />
                </div>

                <h2 className="mx-auto mt-7 max-w-3xl text-4xl font-semibold leading-[1.02] tracking-[-0.06em] sm:text-5xl lg:text-6xl">
                  Saatnya membuat proses belajar lebih{" "}
                  <span className="text-[#E53935]">terlihat.</span>
                </h2>

                <p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-slate-500 sm:text-base">
                  Satu sistem untuk menghubungkan pembelajaran,
                  pengajaran, perkembangan, dan keuangan.
                </p>

                <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                  <Magnetic strength={0.2}>
                    <Link
                      href="/login"
                      data-cursor="OPEN"
                      className="group inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#111827] px-6 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-[#E53935]"
                    >
                      Masuk ke NAGALA
                      <ArrowRight
                        size={16}
                        className="transition-transform group-hover:translate-x-1"
                      />
                    </Link>
                  </Magnetic>

                  <Link
                    href="#about"
                    data-cursor="VIEW"
                    className="inline-flex h-12 items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 text-sm font-semibold text-[#111827] transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
                  >
                    Pelajari lebih lanjut
                  </Link>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* =====================================================
          FOOTER
      ===================================================== */}

      <footer className="border-t border-slate-200 bg-white px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-[1440px] flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2.5">
            <NagalaLogo size="sm" rounded="md" />

            <div>
              <div className="text-xs font-bold tracking-[-0.02em]">
                NAGALA Education
              </div>

              <div className="text-[9px] text-slate-400">
                Learning management ecosystem
              </div>
            </div>
          </div>

          <div className="text-[10px] text-slate-400">
            © {year} NAGALA Education. All rights reserved.
          </div>
        </div>
      </footer>
    </main>
  )
}