"use client"

import { FormEvent, useEffect, useState } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  Check,
  Loader2,
  Phone,
  Save,
  UserRound,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"

type Toast = {
  type: "success" | "error"
  message: string
} | null

export default function TutorProfileSettingsPage() {
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [fullName, setFullName] = useState("")
  const [phoneNumber, setPhoneNumber] = useState("")

  const [toast, setToast] = useState<Toast>(null)

  useEffect(() => {
    async function loadProfile() {
      try {
        setLoading(true)

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

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("full_name, phone_number, role_id")
          .eq("id", user.id)
          .single()

        if (profileError) {
          throw new Error(profileError.message)
        }

        if (profile.role_id !== 2) {
          throw new Error("Akses hanya untuk tutor.")
        }

        setFullName(profile.full_name ?? "")
        setPhoneNumber(profile.phone_number ?? "")
      } catch (error) {
        setToast({
          type: "error",
          message:
            error instanceof Error
              ? error.message
              : "Gagal memuat profil.",
        })
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
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

    if (!fullName.trim()) {
      setToast({
        type: "error",
        message: "Nama lengkap wajib diisi.",
      })
      return
    }

    try {
      setSaving(true)

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

      const { data: profile, error: roleError } = await supabase
        .from("profiles")
        .select("role_id")
        .eq("id", user.id)
        .single()

      if (roleError) {
        throw new Error(roleError.message)
      }

      if (profile.role_id !== 2) {
        throw new Error("Akses hanya untuk tutor.")
      }

      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName.trim(),
          phone_number: phoneNumber.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id)

      if (error) {
        throw new Error(error.message)
      }

      setToast({
        type: "success",
        message: "Profil berhasil diperbarui.",
      })
    } catch (error) {
      setToast({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Gagal menyimpan profil.",
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
            <UserRound className="h-4 w-4" />
            PROFIL
          </div>

          <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#111827] sm:text-3xl">
            Profil Tutor
          </h1>

          <p className="mt-1 text-sm text-slate-500 sm:text-base">
            Perbarui informasi dasar yang digunakan pada akun Anda.
          </p>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
        >
          <div className="border-b border-slate-100 p-5 sm:p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#111827] text-white">
                <UserRound className="h-6 w-6" />
              </div>

              <div>
                <h2 className="font-semibold text-[#111827]">
                  Informasi Pribadi
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Pastikan informasi yang diberikan tetap akurat.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-5 p-5 sm:p-6">
            {/* Name */}
            <div>
              <label
                htmlFor="full_name"
                className="mb-2 block text-sm font-semibold text-[#111827]"
              >
                Nama Lengkap
              </label>

              <div className="relative">
                <UserRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                <input
                  id="full_name"
                  type="text"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  placeholder="Masukkan nama lengkap"
                  className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm text-[#111827] outline-none transition placeholder:text-slate-400 focus:border-[#E53935] focus:ring-4 focus:ring-red-50"
                  required
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label
                htmlFor="phone_number"
                className="mb-2 block text-sm font-semibold text-[#111827]"
              >
                Nomor HP
              </label>

              <div className="relative">
                <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                <input
                  id="phone_number"
                  type="tel"
                  value={phoneNumber}
                  onChange={(event) => setPhoneNumber(event.target.value)}
                  placeholder="Contoh: 081234567890"
                  className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm text-[#111827] outline-none transition placeholder:text-slate-400 focus:border-[#E53935] focus:ring-4 focus:ring-red-50"
                />
              </div>
            </div>
          </div>

          {/* Footer */}
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

              {saving ? "Menyimpan..." : "Simpan Perubahan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}