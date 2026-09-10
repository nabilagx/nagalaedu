"use client"

import { FormEvent, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowRight,
  Eye,
  EyeOff,
  GraduationCap,
  Loader2,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const [cursor, setCursor] = useState({
    x: -200,
    y: -200,
  })

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

  async function handleLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()

    setLoading(true)
    setError("")

    const { data, error: loginError } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      })

    if (loginError) {
      console.error("LOGIN ERROR:", loginError)

      setError(`Login gagal: ${loginError.message}`)
      setLoading(false)

      return
    }

    if (!data.user) {
      setError("User tidak ditemukan.")
      setLoading(false)

      return
    }

    console.log("AUTH BERHASIL:", data.user.id)

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role_id")
      .eq("id", data.user.id)
      .single()

    if (profileError) {
      console.error("PROFILE ERROR:", profileError)

      setError(
        `Login berhasil, tapi profile gagal dibaca: ${profileError.message}`
      )

      setLoading(false)

      return
    }

    console.log("PROFILE:", profile)

    if (profile.role_id === 1) {
      router.push("/dashboard/founder")
      return
    }

    if (profile.role_id === 2) {
      router.push("/dashboard/tutor")
      return
    }

    if (profile.role_id === 3) {
      router.push("/dashboard/parent")
      return
    }

    setError("Role user tidak dikenali.")
    setLoading(false)
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f8fafc]">
      {/* Cursor glow */}
      <div
        className="pointer-events-none fixed z-0 hidden h-80 w-80 rounded-full bg-red-500/10 blur-3xl transition-transform duration-150 ease-out lg:block"
        style={{
          transform: `translate3d(${cursor.x - 160}px, ${
            cursor.y - 160
          }px, 0)`,
        }}
      />

      {/* Ambient background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-red-500/10 blur-3xl animate-pulse" />

        <div
          className="absolute -bottom-40 -right-20 h-[28rem] w-[28rem] rounded-full bg-orange-400/10 blur-3xl"
          style={{
            animation: "float 8s ease-in-out infinite",
          }}
        />

        <div
          className="absolute left-[45%] top-[20%] h-32 w-32 rounded-full bg-red-300/5 blur-2xl"
          style={{
            animation: "float 6s ease-in-out infinite reverse",
          }}
        />

        {/* Grid */}
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage:
              "linear-gradient(#111827 1px, transparent 1px), linear-gradient(90deg, #111827 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
      </div>

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-10 sm:px-6">
        <div className="grid w-full max-w-6xl overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white/80 shadow-2xl shadow-slate-900/10 backdrop-blur-xl lg:grid-cols-[1.05fr_0.95fr]">
          {/* Left visual panel */}
          <section className="relative hidden overflow-hidden bg-[#111827] p-10 text-white lg:flex lg:min-h-[680px] lg:flex-col lg:justify-between xl:p-14">
            {/* Decorative circles */}
            <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full border border-white/10" />
            <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full border border-white/10" />

            <div className="absolute bottom-20 left-10 h-40 w-40 rounded-full bg-[#E53935]/20 blur-3xl" />

            {/* Brand */}
            <div className="relative z-10">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#E53935] to-[#FF5722] shadow-lg shadow-red-950/30">
                  <GraduationCap className="h-6 w-6 text-white" />
                </div>

                <div>
                  <p className="text-lg font-bold tracking-tight">
                    NAGALA
                  </p>

                  <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
                    Education
                  </p>
                </div>
              </div>
            </div>

            {/* Main copy */}
            <div className="relative z-10 max-w-lg">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300 backdrop-blur-sm">
                <Sparkles className="h-3.5 w-3.5 text-[#FF6B5F]" />
                Student Management System
              </div>

              <h1 className="text-4xl font-bold leading-[1.1] tracking-tight xl:text-5xl">
                Belajar lebih terarah,
                <span className="mt-1 block text-[#FF5A52]">
                  berkembang bersama.
                </span>
              </h1>

              <p className="mt-6 max-w-md text-sm leading-7 text-slate-400">
                Satu ruang untuk mengelola pembelajaran, siswa,
                kehadiran, nilai, modul, dan aktivitas pendidikan
                NAGALA.
              </p>

              <div className="mt-10 flex flex-wrap gap-3">
                <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-xs text-slate-300">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  Secure Access
                </div>

                <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-xs text-slate-300">
                  <GraduationCap className="h-4 w-4 text-[#FF6B5F]" />
                  Education Focused
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="relative z-10 flex items-center justify-between border-t border-white/10 pt-6">
              <p className="text-xs text-slate-500">
                NAGALA Education
              </p>

              <p className="text-xs text-slate-500">
                © {new Date().getFullYear()}
              </p>
            </div>
          </section>

          {/* Right login panel */}
          <section className="relative flex min-h-[680px] items-center justify-center p-6 sm:p-10 lg:p-12">
            <div className="w-full max-w-md">
              {/* Mobile brand */}
              <div className="mb-10 flex items-center gap-3 lg:hidden">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#E53935] to-[#FF5722] text-white shadow-lg shadow-red-500/20">
                  <GraduationCap className="h-5 w-5" />
                </div>

                <div>
                  <p className="font-bold tracking-tight text-[#111827]">
                    NAGALA
                  </p>

                  <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-slate-400">
                    Education
                  </p>
                </div>
              </div>

              {/* Heading */}
              <div className="mb-8">
                <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-[#E53935]">
                  <LockKeyhole className="h-5 w-5" />
                </div>

                <h2 className="text-3xl font-bold tracking-tight text-[#111827]">
                  Selamat datang 👋
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Masuk ke akun NAGALA Education untuk melanjutkan.
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleLogin} className="space-y-5">
                {/* Email */}
                <div>
                  <label
                    htmlFor="email"
                    className="mb-2 block text-sm font-semibold text-[#111827]"
                  >
                    Email
                  </label>

                  <div className="group relative">
                    <Mail className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400 transition group-focus-within:text-[#E53935]" />

                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white py-3.5 pl-11 pr-4 text-sm text-[#111827] outline-none transition duration-200 placeholder:text-slate-400 hover:border-slate-300 focus:border-[#E53935] focus:ring-4 focus:ring-red-50"
                      placeholder="email@nagala.edu"
                      autoComplete="email"
                      required
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label
                      htmlFor="password"
                      className="block text-sm font-semibold text-[#111827]"
                    >
                      Password
                    </label>
                  </div>

                  <div className="group relative">
                    <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400 transition group-focus-within:text-[#E53935]" />

                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white py-3.5 pl-11 pr-12 text-sm text-[#111827] outline-none transition duration-200 placeholder:text-slate-400 hover:border-slate-300 focus:border-[#E53935] focus:ring-4 focus:ring-red-50"
                      placeholder="Masukkan password"
                      autoComplete="current-password"
                      required
                    />

                    {/* Eye button */}
                    <button
                      type="button"
                      onClick={() =>
                        setShowPassword((value) => !value)
                      }
                      className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-[#111827] focus:outline-none focus:ring-2 focus:ring-red-100"
                      aria-label={
                        showPassword
                          ? "Sembunyikan password"
                          : "Tampilkan password"
                      }
                    >
                      {showPassword ? (
                        <EyeOff className="h-[18px] w-[18px]" />
                      ) : (
                        <Eye className="h-[18px] w-[18px]" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Error */}
                {error && (
                  <div className="flex items-start gap-3 rounded-xl border border-red-100 bg-red-50 p-3.5 text-sm text-red-700">
                    <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-100 text-xs font-bold">
                      !
                    </div>

                    <p className="leading-5">{error}</p>
                  </div>
                )}

                {/* Login button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="group relative mt-2 flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-[#E53935] to-[#FF5722] px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-red-500/20 transition duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-red-500/25 disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-60"
                >
                  <span className="absolute inset-0 -translate-x-full bg-white/10 transition-transform duration-500 group-hover:translate-x-full" />

                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Memproses...
                    </>
                  ) : (
                    <>
                      Masuk ke Dashboard
                      <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                    </>
                  )}
                </button>
              </form>

              {/* Bottom note */}
              <div className="mt-8 flex items-center justify-center gap-2 text-center text-xs text-slate-400">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Akses aman untuk pengguna NAGALA Education</span>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Floating animation */}
      <style jsx global>{`
        @keyframes float {
          0%,
          100% {
            transform: translate3d(0, 0, 0);
          }

          50% {
            transform: translate3d(0, -18px, 0);
          }
        }
      `}</style>
    </main>
  )
}