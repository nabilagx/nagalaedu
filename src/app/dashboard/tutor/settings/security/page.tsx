"use client"

import { FormEvent, useEffect, useState } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  Check,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  LockKeyhole,
  Save,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"

type Toast = {
  type: "success" | "error"
  message: string
} | null

export default function TutorSecuritySettingsPage() {
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [toast, setToast] = useState<Toast>(null)

  useEffect(() => {
    async function verifySession() {
      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser()

        if (authError) {
          throw new Error(authError.message)
        }

        if (!user) {
          throw new Error("Sesi login tidak ditemukan.")
        }

        const { data: profile, error } = await supabase
          .from("profiles")
          .select("role_id")
          .eq("id", user.id)
          .single()

        if (error) {
          throw new Error(error.message)
        }

        if (profile.role_id !== 2) {
          throw new Error("Akses hanya untuk tutor.")
        }
      } catch (error) {
        setToast({
          type: "error",
          message:
            error instanceof Error
              ? error.message
              : "Gagal memverifikasi akun.",
        })
      } finally {
        setLoading(false)
      }
    }

    verifySession()
  }, [])

  useEffect(() => {
    if (!toast) return

    const timer = setTimeout(() => {
      setToast(null)
    }, 3500)

    return () => clearTimeout(timer)
  }, [toast])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (newPassword.length < 8) {
      setToast({
        type: "error",
        message: "Password baru minimal 8 karakter.",
      })
      return
    }

    if (newPassword !== confirmPassword) {
      setToast({
        type: "error",
        message: "Konfirmasi password tidak cocok.",
      })
      return
    }

    try {
      setSaving(true)

      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (error) {
        throw new Error(error.message)
      }

      setNewPassword("")
      setConfirmPassword("")

      setToast({
        type: "success",
        message: "Password berhasil diperbarui.",
      })
    } catch (error) {
      setToast({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Gagal memperbarui password.",
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-7 w-7 animate-spin text-[#E53935]" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Toast */}
        {toast && (
          <div
            className={[
              "fixed right-4 top-4 z-[60] flex max-w-sm items-start gap-3 rounded-xl border px-4 py-3 shadow-xl",
              toast.type === "success"
                ? "border-emerald-200 bg-white text-emerald-700"
                : "border-red-200 bg-white text-red-700",
            ].join(" ")}
          >
            <div
              className={[
                "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
                toast.type === "success"
                  ? "bg-emerald-100"
                  : "bg-red-100",
              ].join(" ")}
            >
              {toast.type === "success" ? (
                <Check className="h-4 w-4" />
              ) : (
                <span className="text-xs font-bold">!</span>
              )}
            </div>

            <p className="text-sm font-medium">{toast.message}</p>
          </div>
        )}

        {/* Header */}
        <div>
          <Link
            href="/dashboard/tutor/settings"
            className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-[#111827]"
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali ke Pengaturan
          </Link>

          <div className="flex items-center gap-2 text-sm font-semibold text-[#E53935]">
            <LockKeyhole className="h-4 w-4" />
            KEAMANAN
          </div>

          <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#111827] sm:text-3xl">
            Keamanan Akun
          </h1>

          <p className="mt-1 text-sm text-slate-500 sm:text-base">
            Perbarui password akun tutor Anda secara berkala.
          </p>
        </div>

        {/* Security info */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-[#111827]">
              <KeyRound className="h-5 w-5" />
            </div>

            <div>
              <h2 className="font-semibold text-[#111827]">
                Ganti Password
              </h2>

              <p className="mt-1 text-sm leading-6 text-slate-500">
                Gunakan password yang cukup panjang dan tidak mudah ditebak.
                Minimal 8 karakter.
              </p>
            </div>
          </div>
        </section>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
        >
          <div className="space-y-5 p-5 sm:p-6">
            {/* New password */}
            <div>
              <label
                htmlFor="new_password"
                className="mb-2 block text-sm font-semibold text-[#111827]"
              >
                Password Baru
              </label>

              <div className="relative">
                <input
                  id="new_password"
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  placeholder="Masukkan password baru"
                  className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-4 pr-11 text-sm text-[#111827] outline-none transition placeholder:text-slate-400 focus:border-[#E53935] focus:ring-4 focus:ring-red-50"
                  minLength={8}
                  required
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-[#111827]"
                  aria-label={
                    showPassword
                      ? "Sembunyikan password"
                      : "Tampilkan password"
                  }
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Confirm password */}
            <div>
              <label
                htmlFor="confirm_password"
                className="mb-2 block text-sm font-semibold text-[#111827]"
              >
                Konfirmasi Password Baru
              </label>

              <div className="relative">
                <input
                  id="confirm_password"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(event) =>
                    setConfirmPassword(event.target.value)
                  }
                  placeholder="Masukkan kembali password baru"
                  className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-4 pr-11 text-sm text-[#111827] outline-none transition placeholder:text-slate-400 focus:border-[#E53935] focus:ring-4 focus:ring-red-50"
                  minLength={8}
                  required
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowConfirmPassword((value) => !value)
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-[#111827]"
                  aria-label={
                    showConfirmPassword
                      ? "Sembunyikan password"
                      : "Tampilkan password"
                  }
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-slate-50/70 p-5 sm:flex-row sm:justify-end sm:p-6">
            <Link
              href="/dashboard/tutor/settings"
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              Batal
            </Link>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#E53935] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#d32f2f] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}

              {saving ? "Menyimpan..." : "Perbarui Password"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}