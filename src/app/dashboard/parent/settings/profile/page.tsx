"use client"

import { FormEvent, useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Save, User, Mail, Phone } from "lucide-react"
import { createBrowserClient } from "@supabase/ssr"

type Profile = {
  full_name: string
  phone_number: string | null
}

export default function ParentProfileSettingsPage() {
  const [profile, setProfile] = useState<Profile>({
    full_name: "",
    phone_number: "",
  })

  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  useEffect(() => {
    async function loadProfile() {
      try {
        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
        )

        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          setError("Sesi login tidak ditemukan.")
          return
        }

        setEmail(user.email ?? "")

        const { data, error: profileError } = await supabase
          .from("profiles")
          .select("full_name, phone_number, role_id")
          .eq("id", user.id)
          .single()

        if (profileError) {
          throw profileError
        }

        if (data.role_id !== 3) {
          setError("Akses hanya tersedia untuk akun Parent.")
          return
        }

        setProfile({
          full_name: data.full_name ?? "",
          phone_number: data.phone_number ?? "",
        })
      } catch (err) {
        console.error(err)
        setError("Gagal memuat profil.")
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    setSaving(true)
    setMessage("")
    setError("")

    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
      )

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        throw new Error("Sesi login tidak ditemukan.")
      }

      const { data: currentProfile, error: roleError } = await supabase
        .from("profiles")
        .select("role_id")
        .eq("id", user.id)
        .single()

      if (roleError) {
        throw roleError
      }

      if (currentProfile.role_id !== 3) {
        throw new Error("Akses hanya tersedia untuk Parent.")
      }

      if (!profile.full_name.trim()) {
        throw new Error("Nama lengkap wajib diisi.")
      }

      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          full_name: profile.full_name.trim(),
          phone_number: profile.phone_number?.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id)

      if (updateError) {
        throw updateError
      }

      setMessage("Profil berhasil diperbarui.")
    } catch (err) {
      console.error(err)

      setError(
        err instanceof Error
          ? err.message
          : "Gagal memperbarui profil."
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Back */}
        <Link
          href="/dashboard/parent/settings"
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-[#E53935]"
        >
          <ArrowLeft size={17} />
          Kembali ke Pengaturan
        </Link>

        {/* Header */}
        <div className="mb-6">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#111827] text-white">
            <User size={22} />
          </div>

          <h1 className="text-2xl font-bold text-[#111827]">
            Profil Akun
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Perbarui informasi profil akun Anda.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          {loading ? (
            <div className="space-y-5 animate-pulse">
              <div className="h-11 rounded-xl bg-slate-100" />
              <div className="h-11 rounded-xl bg-slate-100" />
              <div className="h-11 rounded-xl bg-slate-100" />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Name */}
              <div>
                <label
                  htmlFor="full_name"
                  className="mb-2 block text-sm font-semibold text-[#111827]"
                >
                  Nama Lengkap
                </label>

                <div className="relative">
                  <User
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    id="full_name"
                    type="text"
                    value={profile.full_name}
                    onChange={(e) =>
                      setProfile((prev) => ({
                        ...prev,
                        full_name: e.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-sm text-[#111827] outline-none transition placeholder:text-slate-400 focus:border-[#E53935] focus:ring-2 focus:ring-[#E53935]/10"
                    placeholder="Masukkan nama lengkap"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-semibold text-[#111827]"
                >
                  Email
                </label>

                <div className="relative">
                  <Mail
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    id="email"
                    type="email"
                    value={email}
                    disabled
                    className="w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm text-slate-500 outline-none"
                  />
                </div>

                <p className="mt-1.5 text-xs text-slate-400">
                  Email dikelola melalui akun autentikasi.
                </p>
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
                  <Phone
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    id="phone_number"
                    type="tel"
                    value={profile.phone_number ?? ""}
                    onChange={(e) =>
                      setProfile((prev) => ({
                        ...prev,
                        phone_number: e.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-sm text-[#111827] outline-none transition placeholder:text-slate-400 focus:border-[#E53935] focus:ring-2 focus:ring-[#E53935]/10"
                    placeholder="Contoh: 081234567890"
                  />
                </div>
              </div>

              {/* Messages */}
              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                  {error}
                </div>
              )}

              {message && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {message}
                </div>
              )}

              {/* Submit */}
              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#E53935] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#c92f2f] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Save size={17} />
                  {saving ? "Menyimpan..." : "Simpan Perubahan"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </main>
  )
}