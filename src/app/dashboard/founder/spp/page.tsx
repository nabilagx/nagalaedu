"use client"

import { useEffect, useMemo, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import {
  BadgeDollarSign,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  FileText,
  Loader2,
  LogOut,
  Plus,
  Receipt,
  Search,
  Users,
  XCircle,
} from "lucide-react"
import { useRouter } from "next/navigation"

type Student = {
  id: string
  student_name: string
  grade_level: string | null
  school_name: string | null
  status: string
}

type Bill = {
  id: string
  order_id: string
  month_period: string
  amount: number
  payment_status:
    | "PENDING"
    | "PAID"
    | "FAILED"
    | "EXPIRED"
    | "CANCELLED"
  paid_at: string | null
  created_at: string
  student: {
    student_name: string
  } | null
}

const formatRupiah = (value: number) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value)
}

const formatMonth = (date: string) => {
  return new Intl.DateTimeFormat("id-ID", {
    month: "long",
    year: "numeric",
  }).format(new Date(date))
}

const statusLabel: Record<Bill["payment_status"], string> = {
  PENDING: "Belum Dibayar",
  PAID: "Lunas",
  FAILED: "Gagal",
  EXPIRED: "Kedaluwarsa",
  CANCELLED: "Dibatalkan",
}

function StatusBadge({
  status,
}: {
  status: Bill["payment_status"]
}) {
  const config = {
    PENDING: {
      className: "bg-amber-50 text-amber-700 border-amber-200",
      icon: CircleDollarSign,
    },
    PAID: {
      className: "bg-emerald-50 text-emerald-700 border-emerald-200",
      icon: CheckCircle2,
    },
    FAILED: {
      className: "bg-red-50 text-red-700 border-red-200",
      icon: XCircle,
    },
    EXPIRED: {
      className: "bg-red-50 text-red-700 border-red-200",
      icon: XCircle,
    },
    CANCELLED: {
      className: "bg-slate-100 text-slate-600 border-slate-200",
      icon: XCircle,
    },
  }[status]

  const Icon = config.icon

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${config.className}`}
    >
      <Icon size={14} />
      {statusLabel[status]}
    </span>
  )
}

export default function FounderSPPPage() {
  const supabase = createClient()
  const router = useRouter()

  const [students, setStudents] = useState<Student[]>([])
  const [bills, setBills] = useState<Bill[]>([])

  const [selectedStudent, setSelectedStudent] = useState("")
  const [monthPeriod, setMonthPeriod] = useState("")
  const [amount, setAmount] = useState("")

  const [statusFilter, setStatusFilter] = useState("ALL")
  const [search, setSearch] = useState("")

  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const loadData = async () => {
    setLoading(true)
    setError("")

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.replace("/login")
        return
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role_id")
        .eq("id", user.id)
        .single()

      if (profileError) {
        throw profileError
      }

      if (profile?.role_id !== 1) {
        router.replace("/dashboard")
        return
      }

      const { data: studentsData, error: studentsError } = await supabase
        .from("students")
        .select(
          "id, student_name, grade_level, school_name, status"
        )
        .eq("status", "ACTIVE")
        .order("student_name")

      if (studentsError) {
        throw studentsError
      }

      const { data: billsData, error: billsError } = await supabase
        .from("spp_bills")
        .select(
          `
          id,
          order_id,
          month_period,
          amount,
          payment_status,
          paid_at,
          created_at,
          student:students (
            student_name
          )
        `
        )
        .order("created_at", { ascending: false })

      if (billsError) {
        throw billsError
      }

      setStudents(studentsData ?? [])
      setBills((billsData ?? []) as unknown as Bill[])
    } catch (err) {
      console.error(err)
      setError("Gagal memuat data tagihan.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const createBill = async (event: React.FormEvent) => {
    event.preventDefault()

    setError("")
    setSuccess("")

    if (!selectedStudent) {
      setError("Pilih siswa terlebih dahulu.")
      return
    }

    if (!monthPeriod) {
      setError("Pilih periode tagihan.")
      return
    }

    const numericAmount = Number(amount)

    if (!numericAmount || numericAmount <= 0) {
      setError("Nominal tagihan harus lebih dari Rp0.")
      return
    }

    setCreating(true)

    try {
      const response = await fetch("/dashboard/founder/spp/bills", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          studentId: selectedStudent,
          monthPeriod: `${monthPeriod}-01`,
          amount: numericAmount,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(
          result.error || "Gagal membuat tagihan."
        )
      }

      setSuccess("Tagihan berhasil dibuat.")

      setSelectedStudent("")
      setMonthPeriod("")
      setAmount("")

      await loadData()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Gagal membuat tagihan."
      )
    } finally {
      setCreating(false)
    }
  }

  const filteredBills = useMemo(() => {
    return bills.filter((bill) => {
      const matchesStatus =
        statusFilter === "ALL" ||
        bill.payment_status === statusFilter

      const studentName =
        bill.student?.student_name?.toLowerCase() ?? ""

      const orderId = bill.order_id.toLowerCase()

      const matchesSearch =
        !search ||
        studentName.includes(search.toLowerCase()) ||
        orderId.includes(search.toLowerCase())

      return matchesStatus && matchesSearch
    })
  }, [bills, statusFilter, search])

  const summary = useMemo(() => {
    return {
      total: bills.length,
      pending: bills.filter(
        (bill) => bill.payment_status === "PENDING"
      ).length,
      paid: bills.filter(
        (bill) => bill.payment_status === "PAID"
      ).length,
      totalPaid: bills
        .filter((bill) => bill.payment_status === "PAID")
        .reduce((sum, bill) => sum + Number(bill.amount), 0),
    }
  }, [bills])

  const logout = async () => {
    await supabase.auth.signOut()
    router.replace("/login")
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-slate-800 bg-[#111827] lg:block">
        <div className="flex h-full flex-col">
          <div className="border-b border-slate-800 px-6 py-6">
            <h1 className="text-xl font-bold text-white">
              NAGALA
            </h1>
            <p className="mt-1 text-xs text-slate-400">
              Education Management
            </p>
          </div>

          <nav className="flex-1 space-y-1 px-3 py-5">
            <button
              onClick={() =>
                router.push("/dashboard/founder")
              }
              className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm text-slate-300 transition hover:bg-slate-800"
            >
              <FileText size={18} />
              Dashboard
            </button>

            <button
              onClick={() =>
                router.push("/dashboard/founder/spp")
              }
              className="flex w-full items-center gap-3 rounded-lg bg-gradient-to-r from-[#E53935] to-[#FF5722] px-4 py-3 text-sm font-semibold text-white"
            >
              <Receipt size={18} />
              SPP / Tagihan
            </button>
          </nav>

          <div className="border-t border-slate-800 p-3">
            <button
              onClick={logout}
              className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm text-slate-300 transition hover:bg-slate-800"
            >
              <LogOut size={18} />
              Keluar
            </button>
          </div>
        </div>
      </aside>

      <main className="lg:pl-64">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="mb-8">
            <p className="text-sm font-medium text-slate-500">
              Founder
            </p>
            <h2 className="mt-1 text-2xl font-bold text-slate-900">
              SPP & Tagihan
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Kelola tagihan pembayaran siswa.
            </p>
          </div>

          {error && (
            <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {success}
            </div>
          )}

          <section className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">
                    Total Tagihan
                  </p>
                  <p className="mt-2 text-2xl font-bold text-slate-900">
                    {summary.total}
                  </p>
                </div>

                <div className="rounded-lg bg-slate-100 p-3">
                  <Receipt size={22} className="text-slate-600" />
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">
                    Belum Dibayar
                  </p>
                  <p className="mt-2 text-2xl font-bold text-amber-600">
                    {summary.pending}
                  </p>
                </div>

                <div className="rounded-lg bg-amber-50 p-3">
                  <CircleDollarSign
                    size={22}
                    className="text-amber-600"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">
                    Lunas
                  </p>
                  <p className="mt-2 text-2xl font-bold text-emerald-600">
                    {summary.paid}
                  </p>
                </div>

                <div className="rounded-lg bg-emerald-50 p-3">
                  <CheckCircle2
                    size={22}
                    className="text-emerald-600"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">
                    Pendapatan Lunas
                  </p>
                  <p className="mt-2 text-xl font-bold text-slate-900">
                    {formatRupiah(summary.totalPaid)}
                  </p>
                </div>

                <div className="rounded-lg bg-red-50 p-3">
                  <BadgeDollarSign
                    size={22}
                    className="text-red-600"
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="mb-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5">
              <div className="flex items-center gap-2">
                <Plus size={20} className="text-red-500" />
                <h3 className="text-lg font-bold text-slate-900">
                  Buat Tagihan Baru
                </h3>
              </div>

              <p className="mt-1 text-sm text-slate-500">
                Tagihan yang dibuat akan langsung muncul di akun Parent.
              </p>
            </div>

            <form
              onSubmit={createBill}
              className="grid gap-4 md:grid-cols-4"
            >
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Siswa
                </label>

                <div className="relative">
                  <Users
                    size={17}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <select
                    value={selectedStudent}
                    onChange={(e) =>
                      setSelectedStudent(e.target.value)
                    }
                    className="w-full appearance-none rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-10 text-sm outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100"
                  >
                    <option value="">
                      Pilih siswa
                    </option>

                    {students.map((student) => (
                      <option
                        key={student.id}
                        value={student.id}
                      >
                        {student.student_name}
                      </option>
                    ))}
                  </select>

                  <ChevronDown
                    size={17}
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Periode
                </label>

                <div className="relative">
                  <CalendarDays
                    size={17}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    type="month"
                    value={monthPeriod}
                    onChange={(e) =>
                      setMonthPeriod(e.target.value)
                    }
                    className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Nominal
                </label>

                <div className="relative">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <span className="text-sm font-bold">Rp</span>
            </div>

                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={amount}
                    onChange={(e) =>
                      setAmount(e.target.value)
                    }
                    placeholder="150000"
                    className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100"
                  />
                </div>
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={creating}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#E53935] to-[#FF5722] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {creating ? (
                    <>
                      <Loader2
                        size={17}
                        className="animate-spin"
                      />
                      Membuat...
                    </>
                  ) : (
                    <>
                      <Plus size={17} />
                      Buat Tagihan
                    </>
                  )}
                </button>
              </div>
            </form>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    Daftar Tagihan
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Semua tagihan SPP siswa.
                  </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <div className="relative">
                    <Search
                      size={17}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                    <input
                      value={search}
                      onChange={(e) =>
                        setSearch(e.target.value)
                      }
                      placeholder="Cari siswa..."
                      className="w-full rounded-lg border border-slate-300 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 sm:w-56"
                    />
                  </div>

                  <select
                    value={statusFilter}
                    onChange={(e) =>
                      setStatusFilter(e.target.value)
                    }
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
                  >
                    <option value="ALL">Semua Status</option>
                    <option value="PENDING">
                      Belum Dibayar
                    </option>
                    <option value="PAID">Lunas</option>
                    <option value="FAILED">Gagal</option>
                    <option value="EXPIRED">
                      Kedaluwarsa
                    </option>
                    <option value="CANCELLED">
                      Dibatalkan
                    </option>
                  </select>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2
                  size={28}
                  className="animate-spin text-red-500"
                />
              </div>
            ) : filteredBills.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                <div className="rounded-full bg-slate-100 p-4">
                  <Receipt
                    size={28}
                    className="text-slate-400"
                  />
                </div>

                <h4 className="mt-4 font-semibold text-slate-900">
                  Belum ada tagihan
                </h4>

                <p className="mt-1 max-w-md text-sm text-slate-500">
                  Buat tagihan pertama menggunakan form di atas.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px]">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Siswa
                      </th>

                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Periode
                      </th>

                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Nominal
                      </th>

                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Status
                      </th>

                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Order ID
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredBills.map((bill) => (
                      <tr
                        key={bill.id}
                        className="border-b border-slate-100 last:border-0"
                      >
                        <td className="px-5 py-4">
                          <p className="font-medium text-slate-900">
                            {bill.student?.student_name ??
                              "Siswa tidak ditemukan"}
                          </p>
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-600">
                          {formatMonth(bill.month_period)}
                        </td>

                        <td className="px-5 py-4 text-sm font-semibold text-slate-900">
                          {formatRupiah(
                            Number(bill.amount)
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <StatusBadge
                            status={bill.payment_status}
                          />
                        </td>

                        <td className="px-5 py-4">
                          <code className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-600">
                            {bill.order_id}
                          </code>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  )
}
