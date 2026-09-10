"use client"

import { FormEvent, useEffect, useState } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  User,
  Mail,
  ShieldCheck,
  Save,
  Loader2,
} from "lucide-react"
import { createBrowserClient } from "@supabase/ssr"

type Profile = {
  id: string
  full_name: string | null
  phone_number: string | null
  role_id: number | null
}

export default function ProfileSettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [email, setEmail] = useState("")
  const [fullName, setFullName] = useState("")
  const [phoneNumber, setPhoneNumber] = useState("")

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  )

  useEffect(() => {
    loadProfile()
  }, [])

  async function loadProfile() {
    setLoading(true)
    setError("")

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError) {
        throw userError
      }

      if (!user) {
        throw new Error("User tidak ditemukan.")
      }

      setEmail(user.email ?? "")

      const { data, error: profileError } = await supabase
        .from("profiles")
        .select("id, full_name, phone_number, role_id")
        .eq("id", user.id)
        .single()

      if (profileError) {
        throw profileError
      }

      setProfile(data)
      setFullName(data.full_name ?? "")
      setPhoneNumber(data.phone_number ?? "")
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Gagal memuat profil."
      )
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    setSaving(true)
    setMessage("")
    setError("")

    try {
      if (!profile) {
        throw new Error("Data profil belum tersedia.")
      }

      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          full_name: fullName.trim(),
          phone_number: phoneNumber.trim() || null,
        })
        .eq("id", profile.id)

      if (updateError) {
        throw updateError
      }

      setMessage("Profil berhasil diperbarui.")
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Gagal memperbarui profil."
      )
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50">
        <Loader2 className="animate-spin text-[#E53935]" size={28} />
      </main>
    )
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
              <User size={21} />
            </div>

            <div>
              <h1 className="text-2xl font-bold text-[#111827]">
                Profil Akun
              </h1>

              <p className="text-sm text-gray-500">
                Kelola informasi profil akun Anda.
              </p>
            </div>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7"
        >
          <div className="space-y-6">
            {/* Name */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Nama Lengkap
              </label>

              <div className="relative">
                <User
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />

                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Masukkan nama lengkap"
                  className="w-full rounded-xl border border-gray-300 bg-white py-3 pl-10 pr-4 text-sm text-gray-900 outline-none transition focus:border-[#E53935] focus:ring-2 focus:ring-[#E53935]/10"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Email
              </label>

              <div className="relative">
                <Mail
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />

                <input
                  value={email}
                  disabled
                  className="w-full cursor-not-allowed rounded-xl border border-gray-200 bg-gray-100 py-3 pl-10 pr-4 text-sm text-gray-500"
                />
              </div>

              <p className="mt-2 text-xs text-gray-400">
                Email terhubung dengan akun autentikasi dan tidak dapat
                diubah dari halaman ini.
              </p>
            </div>

            {/* Phone */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Nomor HP
              </label>

              <input
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="Contoh: 081234567890"
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-[#E53935] focus:ring-2 focus:ring-[#E53935]/10"
              />
            </div>

            {/* Role */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Role
              </label>

              <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                <ShieldCheck size={18} className="text-[#E53935]" />

                <div>
                  <p className="text-sm font-semibold text-[#111827]">
                    Founder
                  </p>

                  <p className="text-xs text-gray-400">
                    Role dikelola oleh administrator sistem.
                  </p>
                </div>
              </div>
            </div>

            {/* Messages */}
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

            {/* Submit */}
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
                    Simpan Perubahan
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </main>
  )
}