'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: FormEvent) {
    e.preventDefault()

    setLoading(true)
    setError('')

    // LOGIN AUTH
    const { data, error: loginError } =
        await supabase.auth.signInWithPassword({
        email,
        password,
        })

    if (loginError) {
        console.error('LOGIN ERROR:', loginError)
        setError(`Login gagal: ${loginError.message}`)
        setLoading(false)
        return
    }

    if (!data.user) {
        setError('User tidak ditemukan.')
        setLoading(false)
        return
    }

    console.log('AUTH BERHASIL:', data.user.id)

    // AMBIL ROLE DARI PROFILES
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role_id')
        .eq('id', data.user.id)
        .single()

    if (profileError) {
        console.error('PROFILE ERROR:', profileError)

        setError(
        `Login berhasil, tapi profile gagal dibaca: ${profileError.message}`
        )

        setLoading(false)
        return
    }

    console.log('PROFILE:', profile)

    // REDIRECT BERDASARKAN ROLE_ID
    if (profile.role_id === 1) {
        router.push('/dashboard/founder')
        return
    }

    if (profile.role_id === 2) {
        router.push('/dashboard/tutor')
        return
    }

    if (profile.role_id === 3) {
        router.push('/dashboard/parent')
        return
    }

    setError('Role user tidak dikenali.')
    setLoading(false)
    }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50">
      <form
        onSubmit={handleLogin}
        className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm"
      >
        <h1 className="text-2xl font-bold text-slate-900">
          NAGALA Education
        </h1>

        <p className="mt-2 text-sm text-slate-500">
          Student Management System
        </p>

        <div className="mt-8 space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium">
              Email
            </label>

            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-4 py-3 outline-none focus:border-red-500"
              placeholder="email@nagala.edu"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Password
            </label>

            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-4 py-3 outline-none focus:border-red-500"
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-gradient-to-r from-red-600 to-orange-500 px-4 py-3 font-semibold text-white disabled:opacity-50"
          >
            {loading ? 'Masuk...' : 'Masuk'}
          </button>
        </div>
      </form>
    </main>
  )
}