"use client"

import { FormEvent, useState } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  Eye,
  EyeOff,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react"
import { createBrowserClient } from "@supabase/ssr"

export default function ParentSecuritySettingsPage() {
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    setMessage("")
    setError("")

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("Semua kolom password wajib diisi.")
      return
    }

    if (newPassword.length < 8) {
      setError("Password baru minimal 8 karakter.")
      return
    }

    if (newPassword !== confirmPassword) {
      setError("Konfirmasi password tidak sama.")
      return
    }

    setSaving(true)

    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
      )

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user?.email) {
        throw new Error("Sesi login tidak ditemukan.")
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role_id")
        .eq("id", user.id)
        .single()

      if (profileError) {
        throw profileError
      }

      if (profile.role_id !== 3) {
        throw new Error("Akses hanya tersedia untuk Parent.")
      }

      // Verify current password first.
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      })

      if (signInError) {
        throw new Error("Password saat ini tidak benar.")
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (updateError) {
        throw updateError
      }

      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
      setMessage("Password berhasil diperbarui.")
    } catch (err) {
      console.error(err)

      setError(
        err instanceof Error
          ? err.message
          : "Gagal memperbarui password."
      )
    } finally {
      setSaving(false)
    }
  }

  function PasswordInput({
    id,
    label,
    value,
    onChange,
    visible,
    setVisible,
    placeholder,
  }: {
    id: string
    label: string
    value: string
    onChange: (value: string) => void
    visible: boolean
    setVisible: (value: boolean) => void
    placeholder: string
  }) {
    return (
      <div>
        <label
          htmlFor={id}
          className="mb-2 block text-sm font-semibold text-[#111827]"
        >
          {label}
        </label>

        <div className="relative">
          <LockKeyhole
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />

          <input
            id={id}
            type={visible ? "text" : "password"}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-11 text-sm text-[#111827] outline-none transition placeholder:text-slate-400 focus:border-[#E53935] focus:ring-2 focus:ring-[#E53935]/10"
          />

          <button
            type="button"
            onClick={() => setVisible(!visible)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-[#111827]"
            aria-label={visible ? "Sembunyikan password" : "Tampilkan password"}
          >
            {visible ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
        <Link
          href="/dashboard/parent/settings"
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-[#E53935]"
        >
          <ArrowLeft size={17} />
          Kembali ke Pengaturan
        </Link>

        <div className="mb-6">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#111827] text-white">
            <ShieldCheck size={22} />
          </div>

          <h1 className="text-2xl font-bold text-[#111827]">
            Keamanan
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Perbarui password untuk menjaga keamanan akun Anda.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-6 flex gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4">
            <ShieldCheck
              size={20}
              className="mt-0.5 shrink-0 text-blue-600"
            />

            <div>
              <p className="text-sm font-semibold text-blue-900">
                Tips keamanan
              </p>

              <p className="mt-1 text-xs leading-5 text-blue-700">
                Gunakan password minimal 8 karakter dan jangan gunakan
                password yang sama dengan akun lain.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <PasswordInput
              id="current-password"
              label="Password Saat Ini"
              value={currentPassword}
              onChange={setCurrentPassword}
              visible={showCurrent}
              setVisible={setShowCurrent}
              placeholder="Masukkan password saat ini"
            />

            <PasswordInput
              id="new-password"
              label="Password Baru"
              value={newPassword}
              onChange={setNewPassword}
              visible={showNew}
              setVisible={setShowNew}
              placeholder="Minimal 8 karakter"
            />

            <PasswordInput
              id="confirm-password"
              label="Konfirmasi Password Baru"
              value={confirmPassword}
              onChange={setConfirmPassword}
              visible={showConfirm}
              setVisible={setShowConfirm}
              placeholder="Ulangi password baru"
            />

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

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-[#E53935] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#c92f2f] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <ShieldCheck size={17} />
                {saving ? "Memperbarui..." : "Perbarui Password"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  )
}