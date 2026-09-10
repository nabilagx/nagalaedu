'use client'

import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import Link from 'next/link'

import {
  ArrowRight,
  CheckCircle2,
  FileText,
  Loader2,
  Plus,
  Search,
  Users,
  X,
} from 'lucide-react'

type StudentClass = {
  id: string
  class_name: string
  subject: string
  status: string
}

type ExistingBill = {
  id: string
  payment_status: string
  amount: number
}

type Student = {
  id: string
  student_name: string
  grade_level: string | null
  school_name: string | null
  parent_id: string | null
  classes?: StudentClass[]
  current_month_bill?: ExistingBill | null
}

type Bill = {
  id: string
  student_id: string
  order_id: string
  month_period: string
  amount: number
  payment_status: string
  snap_token: string | null
  paid_at: string | null
  created_at: string
  student: Student | null
}

type Summary = {
  totalBills: number
  paidBills: number
  pendingBills: number
  paidAmount: number
  unpaidAmount: number
}

type StudentSearchResponse = {
  students?: Student[]
  error?: string
}

type ToastType = 'success' | 'error' | 'info'

type Toast = {
  type: ToastType
  message: string
}

const MIN_BILL_AMOUNT = 1_000
const MAX_BILL_AMOUNT = 1_000_000

function formatRupiah(value: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value)
}

function formatMonth(value: string) {
  return new Intl.DateTimeFormat('id-ID', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(value))
}

function getCurrentMonthValue() {
  const now = new Date()

  return `${now.getFullYear()}-${String(
    now.getMonth() + 1,
  ).padStart(2, '0')}`
}

function getCurrentMonthLabel() {
  return new Intl.DateTimeFormat('id-ID', {
    month: 'long',
    year: 'numeric',
  }).format(new Date())
}

function getStatusLabel(status: string) {
  switch (status) {
    case 'PAID':
      return 'Lunas'

    case 'PENDING':
      return 'Menunggu Pembayaran'

    case 'FAILED':
      return 'Gagal'

    case 'EXPIRED':
      return 'Kedaluwarsa'

    case 'CANCELLED':
      return 'Dibatalkan'

    default:
      return status
  }
}

function getStatusClass(status: string) {
  switch (status) {
    case 'PAID':
      return 'bg-emerald-50 text-emerald-700'

    case 'PENDING':
      return 'bg-amber-50 text-amber-700'

    case 'FAILED':
      return 'bg-red-50 text-red-700'

    case 'EXPIRED':
      return 'bg-gray-100 text-gray-600'

    case 'CANCELLED':
      return 'bg-gray-100 text-gray-600'

    default:
      return 'bg-gray-100 text-gray-600'
  }
}

function getClassLabel(student: Student) {
  if (!student.classes?.length) {
    return null
  }

  return student.classes
    .map((item) => item.class_name)
    .join(', ')
}

export default function FounderFinancePage() {
  const [bills, setBills] = useState<Bill[]>([])

  const [summary, setSummary] =
    useState<Summary>({
      totalBills: 0,
      paidBills: 0,
      pendingBills: 0,
      paidAmount: 0,
      unpaidAmount: 0,
    })

  const [loading, setLoading] =
    useState(true)

  const [saving, setSaving] =
    useState(false)

  // Search tabel finance.
  const [search, setSearch] =
    useState('')

  const [status, setStatus] =
    useState('')

  const [month, setMonth] =
    useState('')

  // Modal create bill.
  const [showModal, setShowModal] =
    useState(false)

  const [studentId, setStudentId] =
    useState('')

  const [selectedStudent, setSelectedStudent] =
    useState<Student | null>(null)

  const [amount, setAmount] =
    useState('')

  // Search siswa di modal.
  const [studentSearch, setStudentSearch] =
    useState('')

  const [studentResults, setStudentResults] =
    useState<Student[]>([])

  const [studentSearchLoading, setStudentSearchLoading] =
    useState(false)

  const [showStudentResults, setShowStudentResults] =
    useState(false)

  const [toast, setToast] =
    useState<Toast | null>(null)

  const currentMonth = useMemo(
    () => getCurrentMonthValue(),
    [],
  )

  function showToast(
    type: ToastType,
    message: string,
  ) {
    setToast({
      type,
      message,
    })

    window.setTimeout(() => {
      setToast(null)
    }, 3500)
  }

  async function loadFinance() {
    try {
      setLoading(true)

      const params =
        new URLSearchParams()

      if (search.trim()) {
        params.set(
          'search',
          search.trim(),
        )
      }

      if (status) {
        params.set('status', status)
      }

      if (month) {
        params.set('month', month)
      }

      const query =
        params.toString()

      const response = await fetch(
        `/api/founder/finance${
          query ? `?${query}` : ''
        }`,
        {
          cache: 'no-store',
        },
      )

      const data =
        await response.json()

      if (!response.ok) {
        throw new Error(
          data.error ??
            'Gagal mengambil data keuangan.',
        )
      }

      setBills(data.bills ?? [])

      setSummary(
        data.summary ?? {
          totalBills: 0,
          paidBills: 0,
          pendingBills: 0,
          paidAmount: 0,
          unpaidAmount: 0,
        },
      )
    } catch (error) {
      console.error(error)

      showToast(
        'error',
        error instanceof Error
          ? error.message
          : 'Gagal mengambil data keuangan.',
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadFinance()
  }, [search, status, month])

  // Search siswa dengan debounce.
  useEffect(() => {
    if (!showModal) {
      return
    }

    const keyword =
      studentSearch.trim()

    if (keyword.length < 2) {
      setStudentResults([])
      setStudentSearchLoading(false)
      return
    }

    const controller =
      new AbortController()

    const timeout =
      window.setTimeout(
        async () => {
          try {
            setStudentSearchLoading(
              true,
            )

            const response =
              await fetch(
                `/api/founder/finance/students?search=${encodeURIComponent(
                  keyword,
                )}`,
                {
                  cache: 'no-store',
                  signal:
                    controller.signal,
                },
              )

            const data: StudentSearchResponse =
              await response.json()

            if (!response.ok) {
              throw new Error(
                data.error ??
                  'Gagal mencari siswa.',
              )
            }

            setStudentResults(
              data.students ?? [],
            )

            setShowStudentResults(true)
          } catch (error) {
            if (
              error instanceof
                DOMException &&
              error.name === 'AbortError'
            ) {
              return
            }

            console.error(error)

            setStudentResults([])

            showToast(
              'error',
              error instanceof Error
                ? error.message
                : 'Gagal mencari siswa.',
            )
          } finally {
            setStudentSearchLoading(
              false,
            )
          }
        },
        300,
      )

    return () => {
      window.clearTimeout(timeout)
      controller.abort()
    }
  }, [
    studentSearch,
    showModal,
  ])

  function resetForm() {
    setStudentId('')
    setSelectedStudent(null)
    setAmount('')
    setStudentSearch('')
    setStudentResults([])
    setShowStudentResults(false)
  }

  function openCreateModal() {
    resetForm()
    setShowModal(true)
  }

  function closeCreateModal() {
    if (saving) return

    setShowModal(false)
    resetForm()
  }

  function selectStudent(
    student: Student,
  ) {
    if (student.current_month_bill) {
      showToast(
        'info',
        `${student.student_name} sudah memiliki tagihan bulan berjalan.`,
      )

      return
    }

    setStudentId(student.id)
    setSelectedStudent(student)
    setStudentSearch(
      student.student_name,
    )
    setStudentResults([])
    setShowStudentResults(false)
  }

  function clearSelectedStudent() {
    setStudentId('')
    setSelectedStudent(null)
    setStudentSearch('')
    setStudentResults([])
    setShowStudentResults(false)
  }

  async function handleCreate() {
    if (!studentId) {
      showToast(
        'error',
        'Pilih siswa terlebih dahulu.',
      )

      return
    }

    if (
      selectedStudent?.current_month_bill
    ) {
      showToast(
        'error',
        'Siswa tersebut sudah memiliki tagihan bulan berjalan.',
      )

      return
    }

    const numericAmount =
      Number(amount)

    if (!Number.isFinite(numericAmount)) {
      showToast(
        'error',
        'Nominal tidak valid.',
      )

      return
    }

    if (!Number.isInteger(numericAmount)) {
      showToast(
        'error',
        'Nominal harus berupa angka bulat.',
      )

      return
    }

    if (
      numericAmount <
      MIN_BILL_AMOUNT
    ) {
      showToast(
        'error',
        `Nominal minimal ${formatRupiah(
          MIN_BILL_AMOUNT,
        )}.`,
      )

      return
    }

    if (
      numericAmount >
      MAX_BILL_AMOUNT
    ) {
      showToast(
        'error',
        `Nominal maksimal ${formatRupiah(
          MAX_BILL_AMOUNT,
        )}.`,
      )

      return
    }

    try {
      setSaving(true)

      const response =
        await fetch(
          '/api/founder/finance',
          {
            method: 'POST',
            headers: {
              'Content-Type':
                'application/json',
            },
            body: JSON.stringify({
              studentId,
              amount:
                numericAmount,
              monthPeriod:
                currentMonth,
            }),
          },
        )

      const data =
        await response.json()

      if (!response.ok) {
        throw new Error(
          data.error ??
            'Gagal membuat tagihan.',
        )
      }

      setShowModal(false)
      resetForm()

      showToast(
        'success',
        'Tagihan berhasil dibuat.',
      )

      await loadFinance()
    } catch (error) {
      console.error(error)

      showToast(
        'error',
        error instanceof Error
          ? error.message
          : 'Gagal membuat tagihan.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="mx-auto max-w-7xl">
        {/* HEADER */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              SPP & Tagihan
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              Kelola tagihan SPP dan
              pantau pembayaran siswa.
            </p>
          </div>

          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800"
          >
            <Plus className="h-4 w-4" />
            Buat Tagihan
          </button>
        </div>

        {/* SUMMARY */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <FileText className="h-5 w-5" />
            </div>

            <p className="text-sm text-gray-500">
              Total Tagihan
            </p>

            <p className="mt-1 text-2xl font-bold text-gray-900">
              {summary.totalBills}
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <span className="text-sm font-bold">Rp</span>
            </div>

            <p className="text-sm text-gray-500">
              Sudah Dibayar
            </p>

            <p className="mt-1 text-xl font-bold text-gray-900">
              {formatRupiah(
                summary.paidAmount,
              )}
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <Users className="h-5 w-5" />
            </div>

            <p className="text-sm text-gray-500">
              Menunggu Pembayaran
            </p>

            <p className="mt-1 text-2xl font-bold text-gray-900">
              {summary.pendingBills}
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600">
              <span className="text-sm font-bold">Rp</span>
            </div>

            <p className="text-sm text-gray-500">
              Belum Terbayar
            </p>

            <p className="mt-1 text-xl font-bold text-gray-900">
              {formatRupiah(
                summary.unpaidAmount,
              )}
            </p>
          </div>
        </div>

        {/* FILTER */}
        <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4 md:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />

            <input
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value,
                )
              }
              placeholder="Cari nama siswa atau order ID..."
              className="w-full rounded-xl border border-gray-200 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-gray-400"
            />
          </div>

          <select
            value={status}
            onChange={(event) =>
              setStatus(
                event.target.value,
              )
            }
            className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none"
          >
            <option value="">
              Semua Status
            </option>

            <option value="PENDING">
              Menunggu Pembayaran
            </option>

            <option value="PAID">
              Lunas
            </option>

            <option value="FAILED">
              Gagal
            </option>

            <option value="EXPIRED">
              Kedaluwarsa
            </option>

            <option value="CANCELLED">
              Dibatalkan
            </option>
          </select>

          <input
            type="month"
            value={month}
            onChange={(event) =>
              setMonth(
                event.target.value,
              )
            }
            className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none"
          />
        </div>

        {/* TABLE */}
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
          {loading ? (
            <div className="flex min-h-[300px] items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : bills.length === 0 ? (
            <div className="flex min-h-[300px] flex-col items-center justify-center px-6 text-center">
              <FileText className="mb-3 h-10 w-10 text-gray-300" />

              <p className="font-medium text-gray-900">
                Belum ada tagihan
              </p>

              <p className="mt-1 text-sm text-gray-500">
                Buat tagihan SPP untuk siswa
                aktif.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-sm">
                <thead className="border-b border-gray-200 bg-gray-50">
                  <tr>
                    <th className="px-5 py-3 text-left font-semibold text-gray-600">
                      Siswa
                    </th>

                    <th className="px-5 py-3 text-left font-semibold text-gray-600">
                      Periode
                    </th>

                    <th className="px-5 py-3 text-left font-semibold text-gray-600">
                      Nominal
                    </th>

                    <th className="px-5 py-3 text-left font-semibold text-gray-600">
                      Status
                    </th>

                    <th className="px-5 py-3 text-right font-semibold text-gray-600">
                      Aksi
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {bills.map((bill) => (
                    <tr
                      key={bill.id}
                      className="transition hover:bg-gray-50"
                    >
                      <td className="px-5 py-4">
                        <p className="font-medium text-gray-900">
                          {bill.student
                            ?.student_name ??
                            '-'}
                        </p>

                        <p className="mt-0.5 text-xs text-gray-500">
                          {bill.order_id}
                        </p>
                      </td>

                      <td className="px-5 py-4 text-gray-600">
                        {formatMonth(
                          bill.month_period,
                        )}
                      </td>

                      <td className="px-5 py-4 font-semibold text-gray-900">
                        {formatRupiah(
                          Number(
                            bill.amount,
                          ),
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getStatusClass(
                            bill.payment_status,
                          )}`}
                        >
                          {getStatusLabel(
                            bill.payment_status,
                          )}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-right">
                        <Link
                          href={`/dashboard/founder/finance/${bill.id}`}
                          className="inline-flex items-center gap-1 rounded-lg px-3 py-2 font-medium text-blue-600 transition hover:bg-blue-50"
                        >
                          Detail
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* CREATE BILL MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
            {/* MODAL HEADER */}
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
              <div>
                <h2 className="font-semibold text-gray-900">
                  Buat Tagihan SPP
                </h2>

                <p className="mt-1 text-xs text-gray-500">
                  Periode hanya untuk bulan
                  berjalan.
                </p>
              </div>

              <button
                type="button"
                onClick={
                  closeCreateModal
                }
                disabled={saving}
                className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-5 p-5">
              {/* STUDENT SEARCH */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Siswa
                </label>

                {selectedStudent ? (
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />

                          <p className="font-semibold text-gray-900">
                            {
                              selectedStudent.student_name
                            }
                          </p>
                        </div>

                        <div className="mt-2 space-y-1 text-xs text-gray-500">
                          {getClassLabel(
                            selectedStudent,
                          ) && (
                            <p>
                              Kelas:{' '}
                              {getClassLabel(
                                selectedStudent,
                              )}
                            </p>
                          )}

                          {selectedStudent.school_name && (
                            <p>
                              Sekolah:{' '}
                              {
                                selectedStudent.school_name
                              }
                            </p>
                          )}

                          {selectedStudent.grade_level && (
                            <p>
                              Tingkat:{' '}
                              {
                                selectedStudent.grade_level
                              }
                            </p>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={
                          clearSelectedStudent
                        }
                        disabled={saving}
                        className="shrink-0 rounded-lg p-1.5 text-gray-400 transition hover:bg-white hover:text-gray-700"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />

                    <input
                      value={
                        studentSearch
                      }
                      onChange={(
                        event,
                      ) => {
                        setStudentSearch(
                          event.target.value,
                        )

                        setShowStudentResults(
                          true,
                        )
                      }}
                      onFocus={() => {
                        if (
                          studentSearch.trim()
                            .length >= 2
                        ) {
                          setShowStudentResults(
                            true,
                          )
                        }
                      }}
                      placeholder="Cari nama siswa, kelas, atau sekolah..."
                      className="w-full rounded-xl border border-gray-200 py-3 pl-10 pr-10 text-sm outline-none transition focus:border-gray-400"
                    />

                    {studentSearchLoading && (
                      <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-gray-400" />
                    )}

                    {showStudentResults &&
                      studentSearch.trim()
                        .length >= 2 && (
                        <div className="absolute left-0 right-0 top-full z-20 mt-2 max-h-72 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-xl">
                          {studentSearchLoading ? (
                            <div className="flex items-center justify-center gap-2 p-5 text-sm text-gray-500">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Mencari siswa...
                            </div>
                          ) : studentResults.length ===
                            0 ? (
                            <div className="p-5 text-center">
                              <p className="text-sm font-medium text-gray-900">
                                Siswa tidak ditemukan
                              </p>

                              <p className="mt-1 text-xs text-gray-500">
                                Coba nama, kelas,
                                atau sekolah
                                lain.
                              </p>
                            </div>
                          ) : (
                            <div className="divide-y divide-gray-100">
                              {studentResults.map(
                                (
                                  student,
                                ) => {
                                  const hasBill =
                                    Boolean(
                                      student.current_month_bill,
                                    )

                                  return (
                                    <button
                                      key={
                                        student.id
                                      }
                                      type="button"
                                      disabled={
                                        hasBill
                                      }
                                      onClick={() =>
                                        selectStudent(
                                          student,
                                        )
                                      }
                                      className={`w-full px-4 py-3 text-left transition ${
                                        hasBill
                                          ? 'cursor-not-allowed bg-gray-50 opacity-60'
                                          : 'hover:bg-gray-50'
                                      }`}
                                    >
                                      <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                          <p className="font-medium text-gray-900">
                                            {
                                              student.student_name
                                            }
                                          </p>

                                          <div className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-xs text-gray-500">
                                            {student.grade_level && (
                                              <span>
                                                {
                                                  student.grade_level
                                                }
                                              </span>
                                            )}

                                            {getClassLabel(
                                              student,
                                            ) && (
                                              <>
                                                <span>
                                                  •
                                                </span>

                                                <span>
                                                  {getClassLabel(
                                                    student,
                                                  )}
                                                </span>
                                              </>
                                            )}

                                            {student.school_name && (
                                              <>
                                                <span>
                                                  •
                                                </span>

                                                <span>
                                                  {
                                                    student.school_name
                                                  }
                                                </span>
                                              </>
                                            )}
                                          </div>
                                        </div>

                                        {hasBill && (
                                          <span className="shrink-0 rounded-full bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-700">
                                            Sudah
                                            ditagihkan
                                          </span>
                                        )}
                                      </div>
                                    </button>
                                  )
                                },
                              )}
                            </div>
                          )}
                        </div>
                      )}
                  </div>
                )}

                {!selectedStudent && (
                  <p className="mt-1.5 text-xs text-gray-500">
                    Ketik minimal 2 karakter
                    untuk mencari siswa.
                  </p>
                )}
              </div>

              {/* MONTH */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Periode
                </label>

                <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-700">
                  {getCurrentMonthLabel()}
                </div>

                <p className="mt-1.5 text-xs text-gray-500">
                  Tagihan hanya dapat dibuat
                  untuk bulan berjalan.
                </p>
              </div>

              {/* AMOUNT */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Nominal
                </label>

                <input
                  type="number"
                  min={MIN_BILL_AMOUNT}
                  max={MAX_BILL_AMOUNT}
                  step={1000}
                  value={amount}
                  onChange={(event) =>
                    setAmount(
                      event.target.value,
                    )
                  }
                  placeholder="Contoh: 50000"
                  disabled={saving}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-gray-400 disabled:bg-gray-50"
                />

                <p className="mt-1.5 text-xs text-gray-500">
                  Minimal{' '}
                  {formatRupiah(
                    MIN_BILL_AMOUNT,
                  )}{' '}
                  dan maksimal{' '}
                  {formatRupiah(
                    MAX_BILL_AMOUNT,
                  )}{' '}
                  per tagihan.
                </p>
              </div>

              {/* ACTION */}
              <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
                <button
                  type="button"
                  onClick={
                    closeCreateModal
                  }
                  disabled={saving}
                  className="rounded-xl px-4 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-gray-100 disabled:opacity-50"
                >
                  Batal
                </button>

                <button
                  type="button"
                  disabled={
                    saving ||
                    !studentId ||
                    !amount
                  }
                  onClick={
                    handleCreate
                  }
                  className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}

                  Buat Tagihan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TOAST */}
      {toast && (
        <div className="fixed right-4 top-4 z-[100] w-[calc(100%-2rem)] max-w-sm">
          <div
            className={`rounded-2xl border bg-white p-4 shadow-xl ${
              toast.type === 'success'
                ? 'border-emerald-200'
                : toast.type === 'error'
                  ? 'border-red-200'
                  : 'border-blue-200'
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                  toast.type ===
                  'success'
                    ? 'bg-emerald-50 text-emerald-600'
                    : toast.type ===
                        'error'
                      ? 'bg-red-50 text-red-600'
                      : 'bg-blue-50 text-blue-600'
                }`}
              >
                {toast.type ===
                'success' ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : toast.type ===
                  'error' ? (
                  <X className="h-4 w-4" />
                ) : (
                  <FileText className="h-4 w-4" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-900">
                  {toast.type ===
                  'success'
                    ? 'Berhasil'
                    : toast.type ===
                        'error'
                      ? 'Terjadi Kesalahan'
                      : 'Informasi'}
                </p>

                <p className="mt-1 text-sm leading-5 text-gray-500">
                  {toast.message}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setToast(null)
                }
                className="rounded-lg p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}