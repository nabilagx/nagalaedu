'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  BookOpen,
  CreditCard,
  FileText,
  GraduationCap,
  RefreshCw,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Profile {
  id: string
  full_name: string
  role_id: number
}

interface Role {
  id: number
  role_name: string
}

interface Student {
  id: string
  student_name: string
  grade_level: string | null
  school_name?: string | null
  status: string
}

interface ClassItem {
  id: string
  class_name: string
  subject: string
  description?: string | null
  schedule_day?: string | null
  schedule_start?: string | null
  schedule_end?: string | null
  status: string
  tutor_id: string
}

interface SppBill {
  id: string
  student_id: string
  order_id: string
  month_period: string
  amount: number
  payment_status: string
  paid_at?: string | null
}

interface Transaction {
  id: string
  spp_bill_id: string
  transaction_id?: string | null
  transaction_status: string
  payment_type?: string | null
  gross_amount: number
  transaction_time?: string | null
  settlement_time?: string | null
  signature_verified?: boolean
}

const rupiah = (value: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value)

const formatDate = (value?: string | null) => {
  if (!value) return '-'

  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}

const formatMonth = (value: string) =>
  new Intl.DateTimeFormat('id-ID', {
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${value}-01`))

const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    PAID: 'Lunas',
    PENDING: 'Belum Dibayar',
    FAILED: 'Gagal',
    EXPIRED: 'Kadaluarsa',
    CANCELLED: 'Dibatalkan',
    settlement: 'Berhasil',
    capture: 'Berhasil',
    pending: 'Menunggu',
    deny: 'Ditolak',
    cancel: 'Dibatalkan',
    expire: 'Kadaluarsa',
    failure: 'Gagal',
  }

  return labels[status] ?? status
}

const getStatusClass = (status: string) => {
  const normalized = status.toUpperCase()

  if (
    normalized === 'PAID' ||
    normalized === 'SETTLEMENT' ||
    normalized === 'CAPTURE'
  ) {
    return 'bg-emerald-50 text-emerald-700'
  }

  if (normalized === 'PENDING') {
    return 'bg-amber-50 text-amber-700'
  }

  if (
    normalized === 'FAILED' ||
    normalized === 'DENY' ||
    normalized === 'FAILURE'
  ) {
    return 'bg-red-50 text-red-700'
  }

  if (
    normalized === 'EXPIRED' ||
    normalized === 'EXPIRE'
  ) {
    return 'bg-slate-100 text-slate-600'
  }

  return 'bg-slate-100 text-slate-600'
}

export default function FounderDashboardPage() {
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

  const [profiles, setProfiles] = useState<Profile[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [classes, setClasses] = useState<ClassItem[]>([])
  const [bills, setBills] = useState<SppBill[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])

  async function loadDashboard() {
    try {
      setError('')

      const [
        profilesResult,
        rolesResult,
        studentsResult,
        classesResult,
        billsResult,
        transactionsResult,
      ] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, full_name, role_id'),

        supabase
          .from('roles')
          .select('id, role_name'),

        supabase
          .from('students')
          .select(
            'id, student_name, grade_level, school_name, status'
          )
          .order('student_name', {
            ascending: true,
          }),

        supabase
          .from('classes')
          .select(`
            id,
            class_name,
            subject,
            description,
            schedule_day,
            schedule_start,
            schedule_end,
            status,
            tutor_id
          `)
          .order('class_name', {
            ascending: true,
          }),

        supabase
          .from('spp_bills')
          .select(`
            id,
            student_id,
            order_id,
            month_period,
            amount,
            payment_status,
            paid_at
          `)
          .order('month_period', {
            ascending: false,
          }),

        supabase
          .from('payment_transactions')
          .select(`
            id,
            spp_bill_id,
            transaction_id,
            transaction_status,
            payment_type,
            gross_amount,
            transaction_time,
            settlement_time,
            signature_verified
          `)
          .order('created_at', {
            ascending: false,
          })
          .limit(10),
      ])

      if (profilesResult.error) throw profilesResult.error
      if (rolesResult.error) throw rolesResult.error
      if (studentsResult.error) throw studentsResult.error
      if (classesResult.error) throw classesResult.error
      if (billsResult.error) throw billsResult.error
      if (transactionsResult.error) throw transactionsResult.error

      setProfiles((profilesResult.data ?? []) as Profile[])
      setRoles((rolesResult.data ?? []) as Role[])
      setStudents((studentsResult.data ?? []) as Student[])
      setClasses((classesResult.data ?? []) as ClassItem[])
      setBills((billsResult.data ?? []) as SppBill[])
      setTransactions(
        (transactionsResult.data ?? []) as Transaction[]
      )
    } catch (err) {
      console.error('FOUNDER DASHBOARD ERROR:', err)

      setError(
        'Gagal memuat data dashboard. Silakan coba lagi.'
      )
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadDashboard()
  }, [])

  const founderRoleId = useMemo(
    () =>
      roles.find(
        (role) =>
          role.role_name.toLowerCase() === 'founder'
      )?.id,
    [roles]
  )

  const tutorRoleId = useMemo(
    () =>
      roles.find(
        (role) =>
          role.role_name.toLowerCase() === 'tutor'
      )?.id,
    [roles]
  )

  const parentRoleId = useMemo(
    () =>
      roles.find(
        (role) =>
          role.role_name.toLowerCase() === 'parent'
      )?.id,
    [roles]
  )

  const founderCount = useMemo(
    () =>
      founderRoleId
        ? profiles.filter(
            (profile) =>
              profile.role_id === founderRoleId
          ).length
        : 0,
    [profiles, founderRoleId]
  )

  const tutorCount = useMemo(
    () =>
      tutorRoleId
        ? profiles.filter(
            (profile) =>
              profile.role_id === tutorRoleId
          ).length
        : 0,
    [profiles, tutorRoleId]
  )

  const parentCount = useMemo(
    () =>
      parentRoleId
        ? profiles.filter(
            (profile) =>
              profile.role_id === parentRoleId
          ).length
        : 0,
    [profiles, parentRoleId]
  )

  const totalUsers = profiles.length

  const activeStudentCount = students.filter(
    (student) => student.status === 'ACTIVE'
  ).length

  const inactiveStudentCount = students.filter(
    (student) => student.status !== 'ACTIVE'
  ).length

  const activeClassCount = classes.filter(
    (item) => item.status === 'ACTIVE'
  ).length

  const inactiveClassCount = classes.filter(
    (item) => item.status !== 'ACTIVE'
  ).length

  const paidBills = useMemo(
    () =>
      bills.filter(
        (bill) => bill.payment_status === 'PAID'
      ),
    [bills]
  )

  const pendingBills = useMemo(
    () =>
      bills.filter(
        (bill) =>
          bill.payment_status === 'PENDING'
      ),
    [bills]
  )

  const failedBills = useMemo(
    () =>
      bills.filter(
        (bill) =>
          bill.payment_status === 'FAILED' ||
          bill.payment_status === 'EXPIRED' ||
          bill.payment_status === 'CANCELLED'
      ),
    [bills]
  )

  const totalRevenue = paidBills.reduce(
    (total, bill) =>
      total + Number(bill.amount),
    0
  )

  const pendingRevenue = pendingBills.reduce(
    (total, bill) =>
      total + Number(bill.amount),
    0
  )

  const currentMonthRevenue = useMemo(() => {
    const now = new Date()

    return paidBills
      .filter((bill) => {
        const date = new Date(
          bill.month_period
        )

        return (
          date.getFullYear() === now.getFullYear() &&
          date.getMonth() === now.getMonth()
        )
      })
      .reduce(
        (total, bill) =>
          total + Number(bill.amount),
        0
      )
  }, [paidBills])

  const revenueByMonth = useMemo(() => {
    const map = new Map<string, number>()

    paidBills.forEach((bill) => {
      const date = new Date(
        bill.month_period
      )

      const key = `${date.getFullYear()}-${String(
        date.getMonth() + 1
      ).padStart(2, '0')}`

      map.set(
        key,
        (map.get(key) ?? 0) +
          Number(bill.amount)
      )
    })

    return Array.from(map.entries())
      .sort(([a], [b]) =>
        a.localeCompare(b)
      )
      .slice(-6)
      .map(([month, revenue]) => ({
        month,
        revenue,
      }))
  }, [paidBills])

  const maxRevenue = useMemo(
    () =>
      Math.max(
        ...revenueByMonth.map(
          (item) => item.revenue
        ),
        1
      ),
    [revenueByMonth]
  )

  const collectionRate = useMemo(() => {
    if (bills.length === 0) return 0

    return Math.round(
      (paidBills.length / bills.length) * 100
    )
  }, [bills, paidBills])

  const recentBills = useMemo(
    () =>
      [...bills]
        .sort(
          (a, b) =>
            new Date(
              b.month_period
            ).getTime() -
            new Date(
              a.month_period
            ).getTime()
        )
        .slice(0, 6),
    [bills]
  )

  async function handleRefresh() {
    setRefreshing(true)
    await loadDashboard()
  }

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-[#E53935]" />

          <p className="text-sm text-slate-500">
            Memuat dashboard...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-[1600px] p-4 sm:p-6 lg:p-8">

        {/* HEADER */}
        <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />

              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Ringkasan Sistem
              </span>
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Dashboard Founder
            </h1>

            <p className="mt-1 max-w-2xl text-sm text-slate-500">
              Pantau operasional, akademik,
              pengguna, dan keuangan NAGALA
              Education dari satu tempat.
            </p>
          </div>


          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="
              inline-flex
              items-center
              justify-center
              gap-2
              rounded-xl
              border
              border-slate-200
              bg-white
              px-4
              py-2.5
              text-sm
              font-semibold
              text-slate-700
              shadow-sm
              transition
              hover:bg-slate-50
              hover:text-slate-900
              disabled:cursor-not-allowed
              disabled:opacity-50
            "
          >
            <RefreshCw
              size={17}
              className={
                refreshing ? 'animate-spin' : ''
              }
            />

            Perbarui Data
          </button>

          
        </div>

        {/* ERROR */}
        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-4">
            <Activity
              size={18}
              className="mt-0.5 shrink-0 text-red-600"
            />

            <div>
              <p className="text-sm font-semibold text-red-800">
                Terjadi kesalahan
              </p>

              <p className="mt-1 text-sm text-red-700">
                {error}
              </p>
            </div>
          </div>
        )}

        {/* KPI */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="Siswa Aktif"
            value={activeStudentCount}
            description={`${inactiveStudentCount} siswa tidak aktif`}
            icon={GraduationCap}
            href="/dashboard/founder/students"
          />

          <MetricCard
            title="Kelas Aktif"
            value={activeClassCount}
            description={`${inactiveClassCount} kelas tidak aktif`}
            icon={BookOpen}
            href="/dashboard/founder/classes"
          />

          <MetricCard
            title="Tutor"
            value={tutorCount}
            description={`${totalUsers} total pengguna`}
            icon={Users}
            href="/dashboard/founder/users"
          />

          <MetricCard
            title="Orang Tua"
            value={parentCount}
            description={`${founderCount} akun founder`}
            icon={Users}
            href="/dashboard/founder/users"
          />
        </div>

        {/* KEUANGAN */}
        <div className="mb-6 grid gap-4 lg:grid-cols-3">
          <FinanceCard
            title="Total Pendapatan"
            value={rupiah(totalRevenue)}
            description={`${paidBills.length} tagihan telah dibayar`}
            icon={Wallet}
            trend="Total pembayaran berhasil"
          />

          <FinanceCard
            title="Pendapatan Bulan Ini"
            value={rupiah(currentMonthRevenue)}
            description="Pendapatan periode berjalan"
            icon={TrendingUp}
            trend="Periode berjalan"
          />

          <FinanceCard
            title="Tagihan Belum Dibayar"
            value={rupiah(pendingRevenue)}
            description={`${pendingBills.length} tagihan menunggu pembayaran`}
            icon={FileText}
            trend="Menunggu pembayaran"
          />
        </div>

        {/* GRAFIK + STATUS */}
        <div className="mb-6 grid gap-6 xl:grid-cols-[1.7fr_1fr]">

          {/* GRAFIK PENDAPATAN */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <div className="mb-1 flex items-center gap-2">
                  <BarChart3
                    size={18}
                    className="text-[#E53935]"
                  />

                  <h2 className="font-semibold text-slate-900">
                    Pendapatan
                  </h2>
                </div>

                <p className="text-xs text-slate-500">
                  Pendapatan berdasarkan periode tagihan
                </p>
              </div>

              <span className="rounded-lg bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-500">
                6 bulan terakhir
              </span>
            </div>

            {revenueByMonth.length === 0 ? (
              <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-slate-200">
                <div className="text-center">
                  <BarChart3
                    size={30}
                    className="mx-auto mb-2 text-slate-300"
                  />

                  <p className="text-sm text-slate-500">
                    Belum ada data pendapatan.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex h-64 items-end gap-4 px-2">
                {revenueByMonth.map((item) => {
                  const height = Math.max(
                    8,
                    Math.round(
                      (item.revenue /
                        maxRevenue) *
                        100
                    )
                  )

                  return (
                    <div
                      key={item.month}
                      className="flex min-w-0 flex-1 flex-col items-center justify-end gap-2"
                    >
                      <span className="whitespace-nowrap text-[10px] font-semibold text-slate-500">
                        {rupiah(
                          item.revenue
                        ).replace('Rp', '')}
                      </span>

                      <div className="flex h-48 w-full items-end justify-center">
                        <div
                          className="
                            w-full
                            max-w-[44px]
                            rounded-t-lg
                            bg-gradient-to-t
                            from-[#E53935]
                            to-[#FF7043]
                          "
                          style={{
                            height: `${height}%`,
                          }}
                        />
                      </div>

                      <span className="text-[10px] font-medium text-slate-400">
                        {formatMonth(
                          item.month
                        )}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </section>

          {/* STATUS PEMBAYARAN */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-6">
              <div className="mb-1 flex items-center gap-2">
                <CreditCard
                  size={18}
                  className="text-[#E53935]"
                />

                <h2 className="font-semibold text-slate-900">
                  Status Pembayaran
                </h2>
              </div>

              <p className="text-xs text-slate-500">
                Status seluruh tagihan SPP
              </p>
            </div>

            <div className="mb-7 flex justify-center">
              <div className="relative flex h-40 w-40 items-center justify-center rounded-full border-[14px] border-slate-100">
                <div
                  className="
                    absolute
                    inset-[-14px]
                    rounded-full
                    border-[14px]
                    border-transparent
                    border-t-emerald-500
                    border-r-emerald-500
                  "
                  style={{
                    transform: `rotate(${collectionRate * 3.6}deg)`,
                  }}
                />

                <div className="text-center">
                  <p className="text-3xl font-bold text-slate-900">
                    {collectionRate}%
                  </p>

                  <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
                    Tertagih
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <StatusRow
                label="Lunas"
                count={paidBills.length}
                amount={paidBills.reduce(
                  (sum, bill) =>
                    sum + Number(bill.amount),
                  0
                )}
                type="success"
              />

              <StatusRow
                label="Belum Dibayar"
                count={pendingBills.length}
                amount={pendingRevenue}
                type="warning"
              />

              <StatusRow
                label="Gagal / Kadaluarsa"
                count={failedBills.length}
                amount={failedBills.reduce(
                  (sum, bill) =>
                    sum + Number(bill.amount),
                  0
                )}
                type="danger"
              />
            </div>
          </section>
        </div>

        {/* PENGGUNA + AKADEMIK */}
        <div className="mb-6 grid gap-6 xl:grid-cols-2">

          {/* PENGGUNA */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5 flex items-start justify-between">
              <div>
                <h2 className="font-semibold text-slate-900">
                  Pengguna Sistem
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Distribusi pengguna berdasarkan peran
                </p>
              </div>

              <Users
                size={20}
                className="text-slate-300"
              />
            </div>

            <div className="space-y-3">
              <OverviewRow
                label="Founder"
                value={founderCount}
                total={totalUsers}
              />

              <OverviewRow
                label="Tutor"
                value={tutorCount}
                total={totalUsers}
              />

              <OverviewRow
                label="Orang Tua"
                value={parentCount}
                total={totalUsers}
              />
            </div>

            <div className="mt-5 border-t border-slate-100 pt-5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  Total pengguna
                </span>

                <span className="text-sm font-bold text-slate-900">
                  {totalUsers}
                </span>
              </div>
            </div>
          </section>

          {/* AKADEMIK */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5 flex items-start justify-between">
              <div>
                <h2 className="font-semibold text-slate-900">
                  Ringkasan Akademik
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Kondisi operasional akademik
                </p>
              </div>

              <GraduationCap
                size={20}
                className="text-slate-300"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <AcademicStat
                label="Siswa Aktif"
                value={activeStudentCount}
                icon={GraduationCap}
              />

              <AcademicStat
                label="Kelas Aktif"
                value={activeClassCount}
                icon={BookOpen}
              />

              <AcademicStat
                label="Tutor"
                value={tutorCount}
                icon={Users}
              />

              <AcademicStat
                label="Orang Tua"
                value={parentCount}
                icon={Users}
              />
            </div>
          </section>
        </div>

        {/* TAGIHAN TERBARU */}
        <section className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div>
              <div className="mb-1 flex items-center gap-2">
                <FileText
                  size={18}
                  className="text-[#E53935]"
                />

                <h2 className="font-semibold text-slate-900">
                  Tagihan SPP Terbaru
                </h2>
              </div>

              <p className="text-xs text-slate-500">
                Daftar tagihan SPP terbaru
              </p>
            </div>

            <a
              href="/dashboard/founder/finance"
              className="text-xs font-semibold text-[#E53935] transition hover:text-[#C62828]"
            >
              Lihat semua
            </a>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-left">
                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    ID Pesanan
                  </th>

                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Periode
                  </th>

                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Nominal
                  </th>

                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Status
                  </th>

                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Waktu Bayar
                  </th>
                </tr>
              </thead>

              <tbody>
                {recentBills.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-5 py-12 text-center"
                    >
                      <FileText
                        size={30}
                        className="mx-auto mb-2 text-slate-300"
                      />

                      <p className="text-sm text-slate-500">
                        Belum ada tagihan.
                      </p>
                    </td>
                  </tr>
                ) : (
                  recentBills.map((bill) => (
                    <tr
                      key={bill.id}
                      className="border-b border-slate-50 last:border-0"
                    >
                      <td className="px-5 py-4">
                        <span className="font-mono text-xs font-medium text-slate-700">
                          {bill.order_id}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-600">
                        {formatDate(
                          bill.month_period
                        )}
                      </td>

                      <td className="px-5 py-4 text-sm font-semibold text-slate-800">
                        {rupiah(
                          Number(bill.amount)
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`
                            inline-flex
                            rounded-full
                            px-2.5
                            py-1
                            text-[11px]
                            font-semibold
                            ${getStatusClass(
                              bill.payment_status
                            )}
                          `}
                        >
                          {getStatusLabel(
                            bill.payment_status
                          )}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-xs text-slate-500">
                        {formatDate(
                          bill.paid_at
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* TRANSAKSI */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div>
              <div className="mb-1 flex items-center gap-2">
                <CreditCard
                  size={18}
                  className="text-[#E53935]"
                />

                <h2 className="font-semibold text-slate-900">
                  Transaksi Terbaru
                </h2>
              </div>

              <p className="text-xs text-slate-500">
                Transaksi pembayaran terbaru melalui Midtrans
              </p>
            </div>

            <a
              href="/dashboard/founder/transactions"
              className="text-xs font-semibold text-[#E53935] transition hover:text-[#C62828]"
            >
              Lihat semua
            </a>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-left">
                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Transaksi
                  </th>

                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Metode Pembayaran
                  </th>

                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Nominal
                  </th>

                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Status
                  </th>

                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Tanggal
                  </th>
                </tr>
              </thead>

              <tbody>
                {transactions.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-5 py-12 text-center"
                    >
                      <CreditCard
                        size={30}
                        className="mx-auto mb-2 text-slate-300"
                      />

                      <p className="text-sm text-slate-500">
                        Belum ada transaksi.
                      </p>
                    </td>
                  </tr>
                ) : (
                  transactions.map(
                    (transaction) => (
                      <tr
                        key={transaction.id}
                        className="border-b border-slate-50 last:border-0"
                      >
                        <td className="px-5 py-4">
                          <p className="font-mono text-xs font-semibold text-slate-700">
                            {(
                              transaction.transaction_id ??
                              transaction.id
                            ).slice(0, 16)}
                          </p>

                          {transaction.signature_verified && (
                            <p className="mt-1 text-[10px] text-emerald-600">
                              Tanda tangan terverifikasi
                            </p>
                          )}
                        </td>

                        <td className="px-5 py-4 text-sm capitalize text-slate-600">
                          {transaction.payment_type ??
                            '-'}
                        </td>

                        <td className="px-5 py-4 text-sm font-semibold text-slate-800">
                          {rupiah(
                            Number(
                              transaction.gross_amount
                            )
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`
                              inline-flex
                              rounded-full
                              px-2.5
                              py-1
                              text-[11px]
                              font-semibold
                              ${getStatusClass(
                                transaction.transaction_status
                              )}
                            `}
                          >
                            {getStatusLabel(
                              transaction.transaction_status
                            )}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-xs text-slate-500">
                          {formatDate(
                            transaction.transaction_time
                          )}
                        </td>
                      </tr>
                    )
                  )
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="mt-8 border-t border-slate-200 pt-5 text-center">
          <p className="text-xs text-slate-400">
            NAGALA Education — Dashboard Founder
          </p>

          <p className="mt-1 text-[10px] text-slate-300">
            Sistem Manajemen Operasional dan Keuangan
          </p>
        </footer>
      </div>
    </div>
  )
}

function MetricCard({
  title,
  value,
  description,
  icon: Icon,
  href,
}: {
  title: string
  value: number | string
  description: string
  icon: React.ElementType
  href: string
}) {
  return (
    <a
      href={href}
      className="
        group
        rounded-2xl
        border
        border-slate-200
        bg-white
        p-5
        shadow-sm
        transition-all
        hover:-translate-y-0.5
        hover:border-slate-300
        hover:shadow-md
      "
    >
      <div className="mb-4 flex items-start justify-between">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-[#E53935] transition group-hover:bg-[#E53935] group-hover:text-white">
          <Icon size={20} />
        </div>

        <ArrowUpRight
          size={17}
          className="text-slate-300 transition group-hover:text-[#E53935]"
        />
      </div>

      <p className="text-sm font-medium text-slate-500">
        {title}
      </p>

      <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
        {value}
      </p>

      <p className="mt-1 text-xs text-slate-400">
        {description}
      </p>
    </a>
  )
}

function FinanceCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
}: {
  title: string
  value: string
  description: string
  icon: React.ElementType
  trend: string
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">
            {title}
          </p>

          <p className="mt-2 truncate text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            {value}
          </p>

          <p className="mt-1 text-xs text-slate-400">
            {description}
          </p>
        </div>

        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
          <Icon size={19} />
        </div>
      </div>

      <div className="mt-5 flex items-center gap-1.5 border-t border-slate-100 pt-4">
        <TrendingUp
          size={13}
          className="text-emerald-500"
        />

        <span className="text-[11px] font-medium text-slate-500">
          {trend}
        </span>
      </div>
    </div>
  )
}

function StatusRow({
  label,
  count,
  amount,
  type,
}: {
  label: string
  count: number
  amount: number
  type: 'success' | 'warning' | 'danger'
}) {
  const styles = {
    success: 'bg-emerald-50 text-emerald-700',
    warning: 'bg-amber-50 text-amber-700',
    danger: 'bg-red-50 text-red-700',
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <span
          className={`
            flex
            h-8
            w-8
            shrink-0
            items-center
            justify-center
            rounded-lg
            text-xs
            font-bold
            ${styles[type]}
          `}
        >
          {count}
        </span>

        <span className="truncate text-sm font-medium text-slate-600">
          {label}
        </span>
      </div>

      <span className="shrink-0 text-xs font-semibold text-slate-700">
        {rupiah(amount)}
      </span>
    </div>
  )
}

function OverviewRow({
  label,
  value,
  total,
}: {
  label: string
  value: number
  total: number
}) {
  const percentage =
    total > 0
      ? Math.round((value / total) * 100)
      : 0

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium text-slate-600">
          {label}
        </span>

        <span className="text-sm font-bold text-slate-900">
          {value}
        </span>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#E53935] to-[#FF7043] transition-all"
          style={{
            width: `${percentage}%`,
          }}
        />
      </div>
    </div>
  )
}

function AcademicStat({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: number
  icon: React.ElementType
}) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-white text-slate-500 shadow-sm">
        <Icon size={17} />
      </div>

      <p className="text-xs font-medium text-slate-500">
        {label}
      </p>

      <p className="mt-1 text-xl font-bold text-slate-900">
        {value}
      </p>
    </div>
  )
}

