"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  ArrowRight,
  BookOpen,
  CalendarCheck,
  CheckCircle2,
  ChevronRight,
  GraduationCap,
  Menu,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
  UsersRound,
  X,
} from "lucide-react"

export default function HomePage() {
  const [cursor, setCursor] = useState({
    x: -200,
    y: -200,
  })

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    function handleMouseMove(event: MouseEvent) {
      setCursor({
        x: event.clientX,
        y: event.clientY,
      })
    }

    window.addEventListener("mousemove", handleMouseMove)

    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
    }
  }, [])

  return (
    <main className="min-h-screen overflow-hidden bg-[#f8fafc] text-[#111827]">
      {/* =========================================================
          CURSOR GLOW
      ========================================================= */}
      <div
        className="pointer-events-none fixed z-0 hidden h-96 w-96 rounded-full bg-red-500/10 blur-3xl transition-transform duration-150 ease-out lg:block"
        style={{
          transform: `translate3d(${cursor.x - 192}px, ${
            cursor.y - 192
          }px, 0)`,
        }}
      />

      {/* =========================================================
          GLOBAL AMBIENT BACKGROUND
      ========================================================= */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-[30rem] w-[30rem] rounded-full bg-red-500/10 blur-3xl" />

        <div className="absolute -bottom-40 -right-40 h-[34rem] w-[34rem] rounded-full bg-orange-400/10 blur-3xl" />

        <div
          className="absolute left-[48%] top-[25%] h-40 w-40 rounded-full bg-red-300/10 blur-3xl"
          style={{
            animation: "nagalaFloat 7s ease-in-out infinite",
          }}
        />

        <div
          className="absolute right-[15%] top-[12%] h-20 w-20 rounded-full bg-orange-300/10 blur-2xl"
          style={{
            animation: "nagalaFloat 5s ease-in-out infinite reverse",
          }}
        />
      </div>

      {/* =========================================================
          NAVBAR
      ========================================================= */}
      <header className="relative z-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <nav className="flex h-20 items-center justify-between">
            {/* Logo */}
            <Link
              href="/"
              className="group flex items-center gap-3"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#E53935] to-[#FF5722] text-white shadow-lg shadow-red-500/20 transition duration-200 group-hover:-translate-y-0.5 group-hover:shadow-xl group-hover:shadow-red-500/25">
                <GraduationCap className="h-5 w-5" />
              </div>

              <div>
                <p className="font-bold tracking-tight text-[#111827]">
                  NAGALA
                </p>

                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Education
                </p>
              </div>
            </Link>

            {/* Desktop navigation */}
            <div className="hidden items-center gap-8 md:flex">
              <a
                href="#tentang"
                className="text-sm font-medium text-slate-500 transition hover:text-[#111827]"
              >
                Tentang
              </a>

              <a
                href="#program"
                className="text-sm font-medium text-slate-500 transition hover:text-[#111827]"
              >
                Program
              </a>

              <a
                href="#cara-kerja"
                className="text-sm font-medium text-slate-500 transition hover:text-[#111827]"
              >
                Cara Kerja
              </a>
            </div>

            {/* Desktop CTA */}
            <div className="hidden items-center gap-3 md:flex">
              <Link
                href="/login"
                className="rounded-xl px-4 py-2.5 text-sm font-semibold text-[#111827] transition hover:bg-slate-100"
              >
                Masuk
              </Link>

              <a
                href="#program"
                className="group inline-flex items-center gap-2 rounded-xl bg-[#111827] px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-slate-900/10 transition hover:-translate-y-0.5 hover:bg-slate-800"
              >
                Lihat Program
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </a>
            </div>

            {/* Mobile menu */}
            <button
              type="button"
              onClick={() =>
                setMobileMenuOpen((value) => !value)
              }
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-[#111827] md:hidden"
              aria-label={
                mobileMenuOpen
                  ? "Tutup menu"
                  : "Buka menu"
              }
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
          </nav>

          {/* Mobile dropdown */}
          {mobileMenuOpen && (
            <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl md:hidden">
              <div className="space-y-1">
                <a
                  href="#tentang"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block rounded-xl px-4 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  Tentang
                </a>

                <a
                  href="#program"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block rounded-xl px-4 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  Program
                </a>

                <a
                  href="#cara-kerja"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block rounded-xl px-4 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  Cara Kerja
                </a>

                <div className="my-2 border-t border-slate-100" />

                <Link
                  href="/login"
                  className="block rounded-xl bg-[#E53935] px-4 py-3 text-center text-sm font-semibold text-white"
                >
                  Masuk ke Sistem
                </Link>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* =========================================================
          HERO
      ========================================================= */}
      <section className="relative z-10">
        <div className="mx-auto max-w-7xl px-4 pb-20 pt-12 sm:px-6 sm:pt-16 lg:px-8 lg:pb-28 lg:pt-20">
          <div className="grid items-center gap-14 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
            {/* Hero copy */}
            <div className="max-w-2xl">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-red-100 bg-white px-3.5 py-2 text-xs font-semibold text-[#E53935] shadow-sm">
                <Sparkles className="h-3.5 w-3.5" />
                Ruang belajar untuk berkembang bersama
              </div>

              <h1 className="text-4xl font-bold leading-[1.08] tracking-tight text-[#111827] sm:text-5xl lg:text-6xl">
                Belajar lebih terarah,
                <span className="mt-1 block bg-gradient-to-r from-[#E53935] to-[#FF5722] bg-clip-text text-transparent">
                  berkembang bersama.
                </span>
              </h1>

              <p className="mt-6 max-w-xl text-base leading-7 text-slate-500 sm:text-lg sm:leading-8">
                NAGALA Education membantu siswa belajar dengan
                lebih personal dan terarah melalui pendampingan
                tutor serta keterlibatan orang tua.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/login"
                  className="group inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#E53935] to-[#FF5722] px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-red-500/20 transition duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-red-500/25"
                >
                  Masuk ke Sistem
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>

                <a
                  href="#tentang"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3.5 text-sm font-bold text-[#111827] shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
                >
                  Kenali NAGALA
                  <ChevronRight className="h-4 w-4" />
                </a>
              </div>

              {/* Trust points */}
              <div className="mt-9 flex flex-wrap gap-x-6 gap-y-3">
                {[
                  "Pembelajaran personal",
                  "Pendampingan tutor",
                  "Monitoring akademik",
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-2 text-xs font-medium text-slate-500"
                  >
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    {item}
                  </div>
                ))}
              </div>
            </div>

            {/* Hero visual */}
            <div className="relative mx-auto w-full max-w-xl lg:ml-auto">
              {/* Glow */}
              <div className="absolute inset-10 rounded-[3rem] bg-gradient-to-br from-red-500/20 to-orange-400/20 blur-3xl" />

              {/* Main dashboard mockup */}
              <div
                className="relative rounded-[2rem] border border-slate-200 bg-white p-3 shadow-2xl shadow-slate-900/10"
                style={{
                  animation:
                    "nagalaFloat 6s ease-in-out infinite",
                }}
              >
                <div className="overflow-hidden rounded-[1.5rem] bg-[#111827]">
                  {/* Fake browser bar */}
                  <div className="flex items-center gap-2 border-b border-white/10 px-5 py-4">
                    <div className="h-2.5 w-2.5 rounded-full bg-red-400/80" />
                    <div className="h-2.5 w-2.5 rounded-full bg-orange-300/70" />
                    <div className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />

                    <div className="ml-3 h-7 flex-1 rounded-lg bg-white/5" />
                  </div>

                  {/* Dashboard */}
                  <div className="grid grid-cols-[72px_1fr]">
                    {/* Sidebar */}
                    <div className="border-r border-white/10 p-3">
                      <div className="mb-8 flex h-9 w-9 items-center justify-center rounded-xl bg-[#E53935] text-white">
                        <GraduationCap className="h-4 w-4" />
                      </div>

                      <div className="space-y-3">
                        <div className="h-8 rounded-lg bg-white/10" />
                        <div className="h-8 rounded-lg bg-white/5" />
                        <div className="h-8 rounded-lg bg-white/5" />
                        <div className="h-8 rounded-lg bg-white/5" />
                      </div>
                    </div>

                    {/* Content */}
                    <div className="min-w-0 p-5 sm:p-6">
                      <div className="mb-6">
                        <div className="h-2.5 w-24 rounded-full bg-red-400/70" />

                        <div className="mt-3 h-6 w-44 rounded-md bg-white/90" />

                        <div className="mt-2 h-2.5 w-56 rounded-full bg-white/20" />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                          <UsersRound className="h-5 w-5 text-red-400" />

                          <div className="mt-4 h-5 w-16 rounded bg-white/80" />

                          <div className="mt-2 h-2 w-24 rounded bg-white/15" />
                        </div>

                        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                          <CalendarCheck className="h-5 w-5 text-orange-300" />

                          <div className="mt-4 h-5 w-16 rounded bg-white/80" />

                          <div className="mt-2 h-2 w-24 rounded bg-white/15" />
                        </div>
                      </div>

                      <div className="mt-3 rounded-xl border border-white/10 bg-white/5 p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="h-3 w-28 rounded bg-white/70" />
                            <div className="mt-2 h-2 w-20 rounded bg-white/15" />
                          </div>

                          <div className="h-8 w-8 rounded-lg bg-red-500/20" />
                        </div>

                        <div className="mt-5 flex items-end gap-2">
                          <div className="h-14 w-5 rounded-t bg-white/10" />
                          <div className="h-20 w-5 rounded-t bg-white/15" />
                          <div className="h-11 w-5 rounded-t bg-red-400/60" />
                          <div className="h-24 w-5 rounded-t bg-white/15" />
                          <div className="h-16 w-5 rounded-t bg-orange-300/60" />
                          <div className="h-28 w-5 rounded-t bg-white/20" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating student card */}
              <div
                className="absolute -left-4 bottom-8 hidden w-48 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl shadow-slate-900/10 sm:block"
                style={{
                  animation:
                    "nagalaFloat 5s ease-in-out infinite reverse",
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-[#E53935]">
                    <GraduationCap className="h-5 w-5" />
                  </div>

                  <div>
                    <p className="text-xs font-medium text-slate-400">
                      Siswa Aktif
                    </p>

                    <p className="mt-0.5 text-sm font-bold text-[#111827]">
                      Pembelajaran
                    </p>
                  </div>
                </div>

                <div className="mt-4 h-2 rounded-full bg-slate-100">
                  <div className="h-2 w-4/5 rounded-full bg-gradient-to-r from-[#E53935] to-[#FF5722]" />
                </div>
              </div>

              {/* Floating secure card */}
              <div
                className="absolute -right-3 top-12 hidden rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xl shadow-slate-900/10 sm:block"
                style={{
                  animation:
                    "nagalaFloat 4.5s ease-in-out infinite",
                }}
              >
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                    <ShieldCheck className="h-4.5 w-4.5" />
                  </div>

                  <div>
                    <p className="text-[10px] font-medium text-slate-400">
                      System
                    </p>

                    <p className="text-xs font-bold text-[#111827]">
                      Secure Access
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          STATS / INTRO STRIP
      ========================================================= */}
      <section className="relative z-10 border-y border-slate-200 bg-white/70">
        <div className="mx-auto grid max-w-7xl grid-cols-1 divide-y divide-slate-200 px-4 sm:px-6 md:grid-cols-3 md:divide-x md:divide-y-0 lg:px-8">
          <div className="flex items-center gap-4 py-7 md:px-8 md:first:pl-0">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-50 text-[#E53935]">
              <UsersRound className="h-5 w-5" />
            </div>

            <div>
              <p className="font-bold text-[#111827]">
                Siswa & Tutor
              </p>

              <p className="mt-0.5 text-xs text-slate-500">
                Terhubung dalam satu ruang belajar
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 py-7 md:px-8">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
              <BookOpen className="h-5 w-5" />
            </div>

            <div>
              <p className="font-bold text-[#111827]">
                Materi Terarah
              </p>

              <p className="mt-0.5 text-xs text-slate-500">
                Modul belajar sesuai kebutuhan siswa
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 py-7 md:px-8 md:last:pr-0">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <ShieldCheck className="h-5 w-5" />
            </div>

            <div>
              <p className="font-bold text-[#111827]">
                Data Terpantau
              </p>

              <p className="mt-0.5 text-xs text-slate-500">
                Informasi akademik tersimpan terstruktur
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          ABOUT
      ========================================================= */}
      <section
        id="tentang"
        className="relative z-10 scroll-mt-20"
      >
        <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8 lg:py-28">
          <div className="grid items-center gap-14 lg:grid-cols-2">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-[#E53935]">
                <span className="h-px w-7 bg-[#E53935]" />
                Tentang NAGALA
              </div>

              <h2 className="max-w-xl text-3xl font-bold tracking-tight text-[#111827] sm:text-4xl">
                Bukan sekadar tempat belajar.
                <span className="block text-slate-400">
                  Tapi ruang untuk bertumbuh.
                </span>
              </h2>

              <p className="mt-6 max-w-xl text-sm leading-7 text-slate-500 sm:text-base sm:leading-8">
                NAGALA Education hadir untuk menciptakan pengalaman
                belajar yang lebih dekat, terarah, dan relevan bagi
                setiap siswa. Tutor mendampingi proses belajar,
                sementara orang tua tetap dapat melihat perkembangan
                akademik anak.
              </p>

              <div className="mt-8 space-y-4">
                {[
                  {
                    icon: GraduationCap,
                    title: "Pendampingan personal",
                    text: "Siswa mendapatkan perhatian sesuai kebutuhan belajarnya.",
                  },
                  {
                    icon: UsersRound,
                    title: "Kolaborasi tutor & orang tua",
                    text: "Perkembangan siswa dapat dipantau secara lebih terstruktur.",
                  },
                  {
                    icon: MessageSquareText,
                    title: "Feedback pembelajaran",
                    text: "Proses belajar tidak berhenti pada nilai, tetapi juga refleksi.",
                  },
                ].map((item) => {
                  const Icon = item.icon

                  return (
                    <div
                      key={item.title}
                      className="flex gap-4"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#111827] text-white">
                        <Icon className="h-4.5 w-4.5" />
                      </div>

                      <div>
                        <h3 className="font-semibold text-[#111827]">
                          {item.title}
                        </h3>

                        <p className="mt-1 text-sm leading-6 text-slate-500">
                          {item.text}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* About visual */}
            <div className="relative">
              <div className="absolute inset-8 rounded-[3rem] bg-gradient-to-br from-red-500/10 to-orange-400/10 blur-3xl" />

              <div className="relative rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl shadow-slate-900/5 sm:p-8">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Learning Journey
                    </p>

                    <h3 className="mt-2 text-xl font-bold text-[#111827]">
                      Satu proses yang terarah
                    </h3>
                  </div>

                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-[#E53935]">
                    <Sparkles className="h-5 w-5" />
                  </div>
                </div>

                <div className="relative mt-8 space-y-5">
                  {[
                    {
                      number: "01",
                      title: "Kenali kebutuhan",
                      text: "Memahami siswa dan proses belajarnya.",
                    },
                    {
                      number: "02",
                      title: "Belajar bersama",
                      text: "Tutor mendampingi proses pembelajaran.",
                    },
                    {
                      number: "03",
                      title: "Pantau perkembangan",
                      text: "Nilai, kehadiran, dan feedback terdokumentasi.",
                    },
                    {
                      number: "04",
                      title: "Berkembang",
                      text: "Membangun kebiasaan belajar yang lebih baik.",
                    },
                  ].map((item, index) => (
                    <div
                      key={item.number}
                      className="relative flex gap-4"
                    >
                      {index !== 3 && (
                        <div className="absolute left-5 top-10 h-8 w-px bg-slate-200" />
                      )}

                      <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#111827] text-xs font-bold text-white">
                        {item.number}
                      </div>

                      <div className="pt-0.5">
                        <h4 className="font-semibold text-[#111827]">
                          {item.title}
                        </h4>

                        <p className="mt-1 text-sm leading-5 text-slate-500">
                          {item.text}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          PROGRAMS
      ========================================================= */}
      <section
        id="program"
        className="relative z-10 bg-[#111827] scroll-mt-20"
      >
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -left-32 top-20 h-72 w-72 rounded-full bg-red-500/10 blur-3xl" />
          <div className="absolute -right-32 bottom-0 h-96 w-96 rounded-full bg-orange-400/10 blur-3xl" />

          <div
            className="absolute inset-0 opacity-[0.025]"
            style={{
              backgroundImage:
                "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
              backgroundSize: "48px 48px",
            }}
          />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8 lg:py-28">
          <div className="max-w-2xl">
            <div className="mb-4 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-[#FF6B5F]">
              <span className="h-px w-7 bg-[#FF6B5F]" />
              Program Pembelajaran
            </div>

            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Belajar sesuai kebutuhan,
              <span className="block text-slate-500">
                berkembang sesuai kemampuan.
              </span>
            </h2>

            <p className="mt-5 text-sm leading-7 text-slate-400 sm:text-base sm:leading-8">
              NAGALA menyediakan pendampingan pembelajaran dengan
              pendekatan yang fleksibel dan dekat dengan kebutuhan
              siswa.
            </p>
          </div>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                title: "Matematika",
                description:
                  "Memahami konsep, latihan, dan penyelesaian masalah.",
                icon: "01",
              },
              {
                title: "Bahasa Inggris",
                description:
                  "Membangun kemampuan vocabulary, grammar, dan komunikasi.",
                icon: "02",
              },
              {
                title: "Bahasa Indonesia",
                description:
                  "Mengembangkan kemampuan membaca, menulis, dan memahami teks.",
                icon: "03",
              },
              {
                title: "Mata Pelajaran Lain",
                description:
                  "Pendampingan belajar sesuai kebutuhan akademik siswa.",
                icon: "04",
              },
            ].map((program) => (
              <div
                key={program.title}
                className="group rounded-2xl border border-white/10 bg-white/[0.04] p-6 transition duration-300 hover:-translate-y-1 hover:border-white/15 hover:bg-white/[0.07]"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-600">
                    {program.icon}
                  </span>

                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-[#FF6B5F] transition group-hover:bg-[#E53935] group-hover:text-white">
                    <BookOpen className="h-4.5 w-4.5" />
                  </div>
                </div>

                <h3 className="mt-7 font-bold text-white">
                  {program.title}
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-400">
                  {program.description}
                </p>

                <div className="mt-6 flex items-center gap-1 text-xs font-semibold text-[#FF6B5F]">
                  Pembelajaran terarah
                  <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-1" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================================
          HOW IT WORKS
      ========================================================= */}
      <section
        id="cara-kerja"
        className="relative z-10 scroll-mt-20"
      >
        <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8 lg:py-28">
          <div className="text-center">
            <div className="mb-4 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-[#E53935]">
              <span className="h-px w-7 bg-[#E53935]" />
              Cara Kerja
              <span className="h-px w-7 bg-[#E53935]" />
            </div>

            <h2 className="text-3xl font-bold tracking-tight text-[#111827] sm:text-4xl">
              Tiga pihak, satu tujuan.
            </h2>

            <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-slate-500 sm:text-base">
              NAGALA menghubungkan siswa, tutor, dan orang tua
              dalam ekosistem pembelajaran yang lebih terarah.
            </p>
          </div>

          <div className="relative mt-14 grid gap-6 lg:grid-cols-3">
            {/* Connecting line */}
            <div className="absolute left-[16.6%] right-[16.6%] top-16 hidden h-px bg-slate-200 lg:block" />

            {[
              {
                number: "01",
                title: "Siswa",
                description:
                  "Mengikuti pembelajaran, mengakses materi, dan melihat perkembangan akademik.",
                icon: GraduationCap,
              },
              {
                number: "02",
                title: "Tutor",
                description:
                  "Mendampingi pembelajaran, mengelola kehadiran, nilai, modul, dan feedback.",
                icon: UsersRound,
              },
              {
                number: "03",
                title: "Orang Tua",
                description:
                  "Memantau kehadiran, nilai, modul, dan informasi akademik anak.",
                icon: ShieldCheck,
              },
            ].map((item) => {
              const Icon = item.icon

              return (
                <div
                  key={item.number}
                  className="relative rounded-2xl border border-slate-200 bg-white p-7 text-center shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-900/5"
                >
                  <div className="relative z-10 mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#111827] text-white shadow-lg shadow-slate-900/10">
                    <Icon className="h-6 w-6" />
                  </div>

                  <span className="mt-5 block text-xs font-bold tracking-widest text-[#E53935]">
                    {item.number}
                  </span>

                  <h3 className="mt-2 text-xl font-bold text-[#111827]">
                    {item.title}
                  </h3>

                  <p className="mt-3 text-sm leading-6 text-slate-500">
                    {item.description}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* =========================================================
          CTA
      ========================================================= */}
      <section className="relative z-10 px-4 pb-20 sm:px-6 lg:px-8 lg:pb-28">
        <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#111827] to-[#1f2937] px-6 py-14 shadow-2xl shadow-slate-900/10 sm:px-10 lg:px-16 lg:py-16">
          <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-red-500/15 blur-3xl" />

          <div className="absolute -bottom-32 left-1/3 h-72 w-72 rounded-full bg-orange-400/10 blur-3xl" />

          <div className="relative grid items-center gap-10 lg:grid-cols-[1fr_auto]">
            <div className="max-w-2xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-300">
                <Sparkles className="h-3.5 w-3.5 text-[#FF6B5F]" />
                NAGALA Education
              </div>

              <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Mari tumbuh dan belajar
                <span className="text-[#FF6B5F]">
                  {" "}
                  bersama.
                </span>
              </h2>

              <p className="mt-4 max-w-xl text-sm leading-7 text-slate-400 sm:text-base">
                Akses Student Management System NAGALA untuk
                melanjutkan proses pembelajaran dan melihat
                perkembangan akademik.
              </p>
            </div>

            <Link
              href="/login"
              className="group inline-flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-bold text-[#111827] shadow-xl transition duration-200 hover:-translate-y-0.5 hover:bg-slate-50"
            >
              Masuk ke Sistem
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </section>

      {/* =========================================================
          FOOTER
      ========================================================= */}
      <footer className="relative z-10 border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#111827] text-white">
              <GraduationCap className="h-4 w-4" />
            </div>

            <div>
              <p className="text-sm font-bold text-[#111827]">
                NAGALA Education
              </p>

              <p className="text-xs text-slate-400">
                Student Management System
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-5 text-xs font-medium text-slate-400">
            <a
              href="#tentang"
              className="transition hover:text-[#111827]"
            >
              Tentang
            </a>

            <a
              href="#program"
              className="transition hover:text-[#111827]"
            >
              Program
            </a>

            <a
              href="#cara-kerja"
              className="transition hover:text-[#111827]"
            >
              Cara Kerja
            </a>

            <Link
              href="/login"
              className="font-semibold text-[#E53935] transition hover:text-[#c62828]"
            >
              Login
            </Link>
          </div>

          <p className="text-xs text-slate-400">
            © {new Date().getFullYear()} NAGALA Education
          </p>
        </div>
      </footer>

      {/* =========================================================
          ANIMATION
      ========================================================= */}
      <style jsx global>{`
        @keyframes nagalaFloat {
          0%,
          100% {
            transform: translate3d(0, 0, 0);
          }

          50% {
            transform: translate3d(0, -12px, 0);
          }
        }

        html {
          scroll-behavior: smooth;
        }
      `}</style>
    </main>
  )
}