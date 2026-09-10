'use client'

import {
  useEffect,
  useState,
} from 'react'

import Link from 'next/link'

import {
  ArrowRight,
  CheckCircle2,
  CircleDollarSign,
  FileText,
  Loader2,
  Search,
  X,
} from 'lucide-react'

type Student = {
  id: string
  student_name: string
  grade_level: string | null
  school_name: string | null
}

type Bill = {
  id: string
  order_id: string
  student_id: string
  month_period: string
  amount: number
  payment_status: string
  paid_at: string | null
}

type Transaction = {
  id: string
  transaction_id: string | null
  transaction_status: string | null
  payment_type: string | null
  payment_type_label: string
  gross_amount: number
  transaction_time: string | null
  settlement_time: string | null
  signature_verified: boolean | null
  created_at: string
  bill: Bill | null
  student: Student | null
}

type Summary = {
  totalTransactions: number
  successfulTransactions: number
  totalAmount: number
}

type ToastType =
  | 'success'
  | 'error'
  | 'info'

type Toast = {
  type: ToastType
  message: string
}

function formatRupiah(
  value: number,
) {
  return new Intl.NumberFormat(
    'id-ID',
    {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    },
  ).format(value)
}

function formatDate(
  value: string | null,
) {
  if (!value) return '-'

  return new Intl.DateTimeFormat(
    'id-ID',
    {
      dateStyle: 'medium',
      timeStyle: 'short',
    },
  ).format(new Date(value))
}

function formatMonth(
  value: string,
) {
  return new Intl.DateTimeFormat(
    'id-ID',
    {
      month: 'long',
      year: 'numeric',
    },
  ).format(new Date(value))
}

function getTransactionStatusLabel(
  status: string | null,
) {
  switch (status) {
    case 'settlement':
      return 'Berhasil'

    case 'capture':
      return 'Berhasil'

    case 'pending':
      return 'Menunggu'

    case 'expire':
      return 'Kedaluwarsa'

    case 'cancel':
      return 'Dibatalkan'

    case 'deny':
      return 'Ditolak'

    case 'failure':
      return 'Gagal'

    default:
      return status ?? '-'
  }
}

function getTransactionStatusClass(
  status: string | null,
) {
  switch (status) {
    case 'settlement':
    case 'capture':
      return 'bg-emerald-50 text-emerald-700'

    case 'pending':
      return 'bg-amber-50 text-amber-700'

    case 'expire':
    case 'cancel':
      return 'bg-gray-100 text-gray-600'

    case 'deny':
    case 'failure':
      return 'bg-red-50 text-red-700'

    default:
      return 'bg-gray-100 text-gray-600'
  }
}

export default function FounderTransactionsPage() {
  const [transactions, setTransactions] =
    useState<Transaction[]>([])

  const [summary, setSummary] =
    useState<Summary>({
      totalTransactions: 0,
      successfulTransactions: 0,
      totalAmount: 0,
    })

  const [loading, setLoading] =
    useState(true)

  const [search, setSearch] =
    useState('')

  const [status, setStatus] =
    useState('')

  const [month, setMonth] =
    useState('')

  const [page, setPage] =
    useState(1)

  const [totalPages, setTotalPages] =
    useState(1)

  const [toast, setToast] =
    useState<Toast | null>(null)

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

  async function loadTransactions() {
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

      params.set(
        'page',
        String(page),
      )

      params.set('limit', '20')

      const response = await fetch(
        `/api/founder/transactions?${params.toString()}`,
        {
          cache: 'no-store',
        },
      )

      const data =
        await response.json()

      if (!response.ok) {
        throw new Error(
          data.error ??
            'Gagal mengambil transaksi.',
        )
      }

      setTransactions(
        data.transactions ?? [],
      )

      setSummary(
        data.summary ?? {
          totalTransactions: 0,
          successfulTransactions: 0,
          totalAmount: 0,
        },
      )

      setTotalPages(
        Math.max(
          1,
          data.pagination
            ?.totalPages ?? 1,
        ),
      )
    } catch (error) {
      console.error(error)

      showToast(
        'error',
        error instanceof Error
          ? error.message
          : 'Gagal mengambil transaksi.',
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTransactions()
  }, [
    search,
    status,
    month,
    page,
  ])

  useEffect(() => {
    setPage(1)
  }, [search, status, month])

  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="mx-auto max-w-7xl">
        {/* HEADER */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Transaksi
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Riwayat pembayaran SPP yang
            telah diproses.
          </p>
        </div>

        {/* SUMMARY */}
        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <FileText className="h-5 w-5" />
            </div>

            <p className="text-sm text-gray-500">
              Total Transaksi
            </p>

            <p className="mt-1 text-2xl font-bold text-gray-900">
              {summary.totalTransactions}
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
            </div>

            <p className="text-sm text-gray-500">
              Pembayaran Berhasil
            </p>

            <p className="mt-1 text-2xl font-bold text-gray-900">
              {
                summary.successfulTransactions
              }
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-gray-50 text-gray-700">
              <span className="text-sm font-bold">
                Rp
              </span>
            </div>

            <p className="text-sm text-gray-500">
              Total Pembayaran
            </p>

            <p className="mt-1 text-xl font-bold text-gray-900">
              {formatRupiah(
                summary.totalAmount,
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
              placeholder="Cari siswa, Order ID, atau Transaction ID..."
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
            className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-gray-400"
          >
            <option value="">
              Semua Status
            </option>

            <option value="settlement">
              Berhasil
            </option>

            <option value="capture">
              Berhasil
            </option>

            <option value="pending">
              Menunggu
            </option>

            <option value="expire">
              Kedaluwarsa
            </option>

            <option value="cancel">
              Dibatalkan
            </option>

            <option value="deny">
              Ditolak
            </option>

            <option value="failure">
              Gagal
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
            className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-gray-400"
          />
        </div>

        {/* TABLE */}
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
          {loading ? (
            <div className="flex min-h-[350px] items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : transactions.length ===
            0 ? (
            <div className="flex min-h-[350px] flex-col items-center justify-center px-6 text-center">
              <span className="text-sm font-bold">
                Rp
              </span>

              <p className="font-medium text-gray-900">
                Belum ada transaksi
              </p>

              <p className="mt-1 text-sm text-gray-500">
                Riwayat pembayaran akan
                muncul di sini.
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[950px] text-sm">
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
                        Metode
                      </th>

                      <th className="px-5 py-3 text-left font-semibold text-gray-600">
                        Status
                      </th>

                      <th className="px-5 py-3 text-left font-semibold text-gray-600">
                        Tanggal
                      </th>

                      <th className="px-5 py-3 text-right font-semibold text-gray-600">
                        Aksi
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100">
                    {transactions.map(
                      (transaction) => (
                        <tr
                          key={
                            transaction.id
                          }
                          className="transition hover:bg-gray-50"
                        >
                          <td className="px-5 py-4">
                            <p className="font-medium text-gray-900">
                              {
                                transaction
                                  .student
                                  ?.student_name
                              }
                            </p>

                            <p className="mt-0.5 text-xs text-gray-500">
                              {
                                transaction
                                  .transaction_id
                              }
                            </p>
                          </td>

                          <td className="px-5 py-4 text-gray-600">
                            {transaction.bill
                              ? formatMonth(
                                  transaction
                                    .bill
                                    .month_period,
                                )
                              : '-'}
                          </td>

                          <td className="px-5 py-4 font-semibold text-gray-900">
                            {formatRupiah(
                              transaction.gross_amount,
                            )}
                          </td>

                          <td className="px-5 py-4 text-gray-600">
                            {
                              transaction.payment_type_label
                            }
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getTransactionStatusClass(
                                transaction.transaction_status,
                              )}`}
                            >
                              {getTransactionStatusLabel(
                                transaction.transaction_status,
                              )}
                            </span>
                          </td>

                          <td className="px-5 py-4 text-gray-600">
                            {formatDate(
                              transaction.settlement_time ??
                                transaction.transaction_time,
                            )}
                          </td>

                          <td className="px-5 py-4 text-right">
                            <Link
                              href={`/dashboard/founder/transactions/${transaction.id}`}
                              className="inline-flex items-center gap-1 rounded-lg px-3 py-2 font-medium text-blue-600 transition hover:bg-blue-50"
                            >
                              Detail
                              <ArrowRight className="h-4 w-4" />
                            </Link>
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </div>

              {/* PAGINATION */}
              <div className="flex items-center justify-between border-t border-gray-100 px-5 py-4">
                <p className="text-xs text-gray-500">
                  Halaman {page} dari{' '}
                  {totalPages}
                </p>

                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={
                      page <= 1 ||
                      loading
                    }
                    onClick={() =>
                      setPage(
                        (current) =>
                          Math.max(
                            1,
                            current - 1,
                          ),
                      )
                    }
                    className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Sebelumnya
                  </button>

                  <button
                    type="button"
                    disabled={
                      page >=
                        totalPages ||
                      loading
                    }
                    onClick={() =>
                      setPage(
                        (current) =>
                          Math.min(
                            totalPages,
                            current + 1,
                          ),
                      )
                    }
                    className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Berikutnya
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* TOAST */}
      {toast && (
        <div className="fixed right-4 top-4 z-[100] w-[calc(100%-2rem)] max-w-sm">
          <div
            className={`rounded-2xl border bg-white p-4 shadow-xl ${
              toast.type ===
              'success'
                ? 'border-emerald-200'
                : toast.type ===
                    'error'
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

                <p className="mt-1 text-sm text-gray-500">
                  {toast.message}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setToast(null)
                }
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100"
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