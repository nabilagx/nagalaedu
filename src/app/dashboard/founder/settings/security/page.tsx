"use client"

import { FormEvent, useState } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  ShieldCheck,
  Lock,
  Save,
  Loader2,
  Eye,
  EyeOff,
} from "lucide-react"
import { createBrowserClient } from "@supabase/ssr"

export default function SecuritySettingsPage() {
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  )

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    setSaving(true)
    setMessage("")
    setError("")

    if (password.length < 8) {
      setError("Password minimal 8 karakter.")
      setSaving(false)
      return
    }

    if (password !== confirmPassword) {
      setError("Konfirmasi password tidak cocok.")
      setSaving(false)
      return
    }

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      })

      if (updateError) {
        throw updateError
      }

      setPassword("")
      setConfirmPassword("")
      setMessage("Password berhasil diperbarui.")
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Gagal memperbarui password."
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/dashboard/founder/settings"
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-gray-500 transition hover:text-[#E53935]"
        >
          <ArrowLeft size={17} />
          Kembali ke Pengaturan
        </Link>


        <div className="mb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#111827] text-white">
              <ShieldCheck size={21} />
            </div>

            <div>
              <h1 className="text-2xl font-bold text-[#111827]">
                Keamanan
              </h1>

              <p className="text-sm text-gray-500">
                Kelola keamanan akun Founder.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {/* Password */}
          <form
            onSubmit={handleSubmit}
            className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7"
          >
            <div className="mb-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-[#E53935]">
                  <Lock size={19} />
                </div>

                <div>
                  <h2 className="font-semibold text-[#111827]">
                    Ubah Password
                  </h2>

                  <p className="text-sm text-gray-500">
                    Gunakan password yang kuat dan mudah Anda ingat.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-5">
              <div className="relative">
  <input
    type={showPassword ? "text" : "password"}
    value={password}
    onChange={(e) => setPassword(e.target.value)}
    placeholder="Minimal 8 karakter"
    autoComplete="new-password"
    className="w-full rounded-xl border border-gray-300 px-4 py-3 pr-12 text-sm text-gray-900 outline-none transition focus:border-[#E53935] focus:ring-2 focus:ring-[#E53935]/10"
  />

  <button
    type="button"
    onClick={() => setShowPassword((value) => !value)}
    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition hover:text-[#E53935]"
    aria-label={
      showPassword
        ? "Sembunyikan password"
        : "Tampilkan password"
    }
  >
    {showPassword ? (
      <EyeOff size={19} />
    ) : (
      <Eye size={19} />
    )}
  </button>
</div>

              <div className="relative">
  <input
    type={showConfirmPassword ? "text" : "password"}
    value={confirmPassword}
    onChange={(e) => setConfirmPassword(e.target.value)}
    placeholder="Ulangi password baru"
    autoComplete="new-password"
    className="w-full rounded-xl border border-gray-300 px-4 py-3 pr-12 text-sm text-gray-900 outline-none transition focus:border-[#E53935] focus:ring-2 focus:ring-[#E53935]/10"
  />

  <button
    type="button"
    onClick={() =>
      setShowConfirmPassword((value) => !value)
    }
    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition hover:text-[#E53935]"
    aria-label={
      showConfirmPassword
        ? "Sembunyikan konfirmasi password"
        : "Tampilkan konfirmasi password"
    }
  >
    {showConfirmPassword ? (
      <EyeOff size={19} />
    ) : (
      <Eye size={19} />
    )}
  </button>
</div>

              {message && (
                <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                  {message}
                </div>
              )}

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="flex justify-end border-t border-gray-100 pt-5">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#E53935] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#c92f2b] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? (
                    <>
                      <Loader2 size={17} className="animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    <>
                      <Save size={17} />
                      Perbarui Password
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>

          {/* Security Information */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-[#111827]">
              Keamanan Akun
            </h2>

            <div className="mt-4 rounded-xl bg-gray-50 p-4">
              <p className="text-sm font-medium text-gray-700">
                Autentikasi dikelola oleh Supabase Auth
              </p>

              <p className="mt-1 text-xs leading-5 text-gray-500">
                Password tidak disimpan secara langsung di tabel profil
                aplikasi.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}