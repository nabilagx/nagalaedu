'use client'

import {
  useEffect,
  useState,
} from 'react'

import Link from 'next/link'

import {
  Search,
  Users,
  UserRoundCheck,
  BookOpen,
  GraduationCap,
  ChevronRight,
  RefreshCw,
} from 'lucide-react'

type Tutor = {
  id: string
  fullName: string
  phoneNumber: string
  totalClasses: number
  activeClasses: number
  totalActiveStudents: number
  attendanceRate: number
  gradeAverage: number
  totalGrades: number
  totalModules: number
  activityStatus: 'AKTIF' | 'TIDAK_AKTIF'
}

type TutorResponse = {
  summary: {
    totalTutors: number
    activeTutors: number
    totalClasses: number
    totalActiveStudents: number
  }
  tutors: Tutor[]
}

export default function MonitoringTutorPage() {
  const [data, setData] =
    useState<TutorResponse | null>(null)

  const [loading, setLoading] =
    useState(true)

  const [error, setError] =
    useState('')

  const [search, setSearch] =
    useState('')

  const [status, setStatus] =
    useState('ALL')

  async function loadTutors() {
    try {
      setLoading(true)
      setError('')

      const params = new URLSearchParams()

      if (search.trim()) {
        params.set(
          'search',
          search.trim(),
        )
      }

      if (status !== 'ALL') {
        params.set('status', status)
      }

      const query = params.toString()

      // =========================
      // ENDPOINT YANG BENAR
      // =========================

      const response = await fetch(
        `/api/founder/academic/tutors${
          query ? `?${query}` : ''
        }`,
        {
          cache: 'no-store',
        },
      )

      const result = await response.json()

      if (!response.ok) {
        throw new Error(
          result?.error ??
            'Gagal mengambil data tutor.',
        )
      }

      setData(result)
    } catch (err) {
      console.error(
        'LOAD MONITORING TUTOR ERROR:',
        err,
      )

      setError(
        err instanceof Error
          ? err.message
          : 'Gagal mengambil data tutor.',
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      loadTutors()
    }, 300)

    return () => clearTimeout(timer)
  }, [search, status])

  const summary = data?.summary ?? {
    totalTutors: 0,
    activeTutors: 0,
    totalClasses: 0,
    totalActiveStudents: 0,
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* HEADER */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-blue-600">
              Akademik
            </p>

            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
              Monitoring Tutor
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Pantau aktivitas dan performa tutor
              secara keseluruhan.
            </p>
          </div>

          <button
            type="button"
            onClick={loadTutors}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw
              className={`h-4 w-4 ${
                loading
                  ? 'animate-spin'
                  : ''
              }`}
            />

            Refresh
          </button>
        </div>

        {/* SUMMARY */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard
            icon={Users}
            label="Total Tutor"
            value={summary.totalTutors}
          />

          <SummaryCard
            icon={UserRoundCheck}
            label="Tutor Aktif"
            value={summary.activeTutors}
          />

          <SummaryCard
            icon={BookOpen}
            label="Total Kelas"
            value={summary.totalClasses}
          />

          <SummaryCard
            icon={GraduationCap}
            label="Siswa Aktif"
            value={
              summary.totalActiveStudents
            }
          />
        </div>

        {/* FILTER */}
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <input
                type="text"
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value,
                  )
                }
                placeholder="Cari nama atau nomor telepon tutor..."
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <select
              value={status}
              onChange={(event) =>
                setStatus(event.target.value)
              }
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="ALL">
                Semua Status
              </option>

              <option value="AKTIF">
                Aktif
              </option>

              <option value="TIDAK_AKTIF">
                Tidak Aktif
              </option>
            </select>
          </div>
        </div>

        {/* ERROR */}
        {error && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* TABLE */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-[900px] w-full">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Tutor
                  </th>

                  <th className="px-5 py-4 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Kelas
                  </th>

                  <th className="px-5 py-4 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Siswa Aktif
                  </th>

                  <th className="px-5 py-4 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Kehadiran
                  </th>

                  <th className="px-5 py-4 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Rata-rata Nilai
                  </th>

                  <th className="px-5 py-4 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Aktivitas
                  </th>

                  <th className="px-5 py-4" />
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-5 py-12 text-center text-sm text-slate-500"
                    >
                      Memuat data tutor...
                    </td>
                  </tr>
                ) : data?.tutors.length ? (
                  data.tutors.map(
                    (tutor) => (
                      <tr
                        key={tutor.id}
                        className="transition hover:bg-slate-50"
                      >
                        <td className="px-5 py-4">
                          <div>
                            <p className="font-semibold text-slate-900">
                              {tutor.fullName}
                            </p>

                            <p className="mt-0.5 text-xs text-slate-500">
                              {tutor.phoneNumber}
                            </p>
                          </div>
                        </td>

                        <td className="px-5 py-4 text-center">
                          <div>
                            <p className="font-semibold text-slate-900">
                              {
                                tutor.activeClasses
                              }
                            </p>

                            <p className="text-xs text-slate-400">
                              dari{' '}
                              {
                                tutor.totalClasses
                              }
                            </p>
                          </div>
                        </td>

                        <td className="px-5 py-4 text-center font-medium text-slate-700">
                          {
                            tutor.totalActiveStudents
                          }
                        </td>

                        <td className="px-5 py-4 text-center">
                          <span className="font-semibold text-slate-900">
                            {
                              tutor.attendanceRate
                            }
                            %
                          </span>
                        </td>

                        <td className="px-5 py-4 text-center">
                          <span className="font-semibold text-slate-900">
                            {
                              tutor.gradeAverage
                            }
                          </span>
                        </td>

                        <td className="px-5 py-4 text-center">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                              tutor.activityStatus ===
                              'AKTIF'
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {tutor.activityStatus ===
                            'AKTIF'
                              ? 'Aktif'
                              : 'Tidak Aktif'}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-right">
                          <Link
                            href={`/dashboard/founder/academic/tutors/${tutor.id}`}
                            className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-blue-600 transition hover:bg-blue-50"
                          >
                            Detail
                            <ChevronRight className="h-4 w-4" />
                          </Link>
                        </td>
                      </tr>
                    ),
                  )
                ) : (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-5 py-12 text-center"
                    >
                      <Users className="mx-auto h-10 w-10 text-slate-300" />

                      <p className="mt-3 text-sm font-medium text-slate-700">
                        Tidak ada tutor
                        ditemukan.
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        Coba ubah pencarian
                        atau filter status.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  )
}

function SummaryCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users
  label: string
  value: number
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">
            {label}
          </p>

          <p className="mt-2 text-2xl font-bold text-slate-900">
            {value}
          </p>
        </div>

        <div className="rounded-xl bg-blue-50 p-3">
          <Icon className="h-5 w-5 text-blue-600" />
        </div>
      </div>
    </div>
  )
}
