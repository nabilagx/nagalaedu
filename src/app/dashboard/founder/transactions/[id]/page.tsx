'use client'

import {
  useEffect,
  useState,
} from 'react'

import Link from 'next/link'
import { useParams } from 'next/navigation'

import {
  ArrowLeft,
  CheckCircle2,
  Download,
  FileText,
  Loader2,
  ShieldCheck,
  XCircle,
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
}

type DetailResponse = {
  transaction?: Transaction
  bill?: Bill
  student?: Student | null
  error?: string
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
      dateStyle: 'full',
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

function isSuccessful(
  status: string | null,
) {
  return (
    status === 'settlement' ||
    status === 'capture'
  )
}

function getStatusLabel(
  status: string | null,
) {
  if (isSuccessful(status)) {
    return 'Pembayaran Berhasil'
  }

  switch (status) {
    case 'pending':
      return 'Menunggu Pembayaran'

    case 'expire':
      return 'Pembayaran Kedaluwarsa'

    case 'cancel':
      return 'Pembayaran Dibatalkan'

    case 'deny':
      return 'Pembayaran Ditolak'

    case 'failure':
      return 'Pembayaran Gagal'

    default:
      return status ?? 'Status Tidak Diketahui'
  }
}

export default function TransactionDetailPage() {
  const params = useParams()

  const id = String(params.id)

  const [data, setData] =
    useState<DetailResponse | null>(
      null,
    )

  const [loading, setLoading] =
    useState(true)

  const [error, setError] =
    useState('')

  const [downloading, setDownloading] =
    useState(false)

  useEffect(() => {
    async function loadDetail() {
      try {
        setLoading(true)
        setError('')

        const response =
          await fetch(
            `/api/founder/transactions?id=${encodeURIComponent(
              id,
            )}`,
            {
              cache: 'no-store',
            },
          )

        const result =
          await response.json()

        if (!response.ok) {
          throw new Error(
            result.error ??
              'Gagal mengambil detail transaksi.',
          )
        }

        setData(result)
      } catch (error) {
        console.error(error)

        setError(
          error instanceof Error
            ? error.message
            : 'Gagal mengambil detail transaksi.',
        )
      } finally {
        setLoading(false)
      }
    }

    if (id) {
      loadDetail()
    }
  }, [id])

  async function handleDownloadReceipt() {
    if (!data?.transaction) {
      return
    }

    try {
      setDownloading(true)

      const response =
        await fetch(
          `/api/founder/transactions/${encodeURIComponent(
            id,
          )}/receipt`,
          {
            cache: 'no-store',
          },
        )

      if (!response.ok) {
        const result =
          await response.json().catch(
            () => null,
          )

        throw new Error(
          result?.error ??
            'Gagal membuat struk PDF.',
        )
      }

      const blob =
        await response.blob()

      const url =
        window.URL.createObjectURL(
          blob,
        )

      const link =
        document.createElement('a')

      link.href = url

      link.download = `struk-${data.transaction.transaction_id ?? data.transaction.id}.pdf`

      document.body.appendChild(link)

      link.click()

      link.remove()

      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error(error)

      setError(
        error instanceof Error
          ? error.message
          : 'Gagal mengunduh struk.',
      )
    } finally {
      setDownloading(false)
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50">
        <Loader2 className="h-7 w-7 animate-spin text-gray-400" />
      </main>
    )
  }

  if (
    error ||
    !data?.transaction ||
    !data.bill
  ) {
    return (
      <main className="min-h-screen bg-gray-50 p-4 md:p-6">
        <div className="mx-auto max-w-3xl">
          <Link
            href="/dashboard/founder/transactions"
            className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali ke Transaksi
          </Link>

          <div className="rounded-2xl border border-red-200 bg-white p-8 text-center">
            <XCircle className="mx-auto mb-3 h-10 w-10 text-red-500" />

            <h1 className="font-semibold text-gray-900">
              Transaksi tidak dapat
              ditampilkan
            </h1>

            <p className="mt-2 text-sm text-gray-500">
              {error ||
                'Data transaksi tidak ditemukan.'}
            </p>
          </div>
        </div>
      </main>
    )
  }

  const transaction =
    data.transaction

  const bill = data.bill

  const student = data.student

  const successful =
    isSuccessful(
      transaction.transaction_status,
    )

  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="mx-auto max-w-3xl">
        {/* BACK */}
        <Link
          href="/dashboard/founder/transactions"
          className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-gray-600 transition hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali ke Transaksi
        </Link>

        {/* MAIN CARD */}
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
          {/* STATUS */}
          <div className="border-b border-gray-100 px-6 py-8 text-center">
            <div
              className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${
                successful
                  ? 'bg-emerald-50 text-emerald-600'
                  : 'bg-gray-100 text-gray-500'
              }`}
            >
              {successful ? (
                <CheckCircle2 className="h-7 w-7" />
              ) : (
                <FileText className="h-7 w-7" />
              )}
            </div>

            <h1 className="mt-4 text-xl font-bold text-gray-900">
              {getStatusLabel(
                transaction.transaction_status,
              )}
            </h1>

            <p className="mt-2 text-3xl font-bold text-gray-900">
              {formatRupiah(
                transaction.gross_amount,
              )}
            </p>

            <p className="mt-2 text-sm text-gray-500">
              {formatDate(
                transaction.settlement_time ??
                  transaction.transaction_time,
              )}
            </p>
          </div>

          {/* STUDENT */}
          <div className="border-b border-gray-100 p-6">
            <h2 className="mb-4 text-sm font-semibold text-gray-900">
              Data Siswa
            </h2>

            <div className="rounded-xl bg-gray-50 p-4">
              <p className="font-semibold text-gray-900">
                {student?.student_name ??
                  '-'}
              </p>

              <div className="mt-2 space-y-1 text-sm text-gray-500">
                {student?.grade_level && (
                  <p>
                    Kelas:{' '}
                    {
                      student.grade_level
                    }
                  </p>
                )}

                {student?.school_name && (
                  <p>
                    Sekolah:{' '}
                    {
                      student.school_name
                    }
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* PAYMENT DETAILS */}
          <div className="p-6">
            <h2 className="mb-4 text-sm font-semibold text-gray-900">
              Detail Pembayaran
            </h2>

            <div className="divide-y divide-gray-100 rounded-xl border border-gray-200">
              <div className="flex items-center justify-between gap-4 px-4 py-3">
                <span className="text-sm text-gray-500">
                  Periode SPP
                </span>

                <span className="text-right text-sm font-medium text-gray-900">
                  {formatMonth(
                    bill.month_period,
                  )}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4 px-4 py-3">
                <span className="text-sm text-gray-500">
                  Nominal
                </span>

                <span className="text-right text-sm font-semibold text-gray-900">
                  {formatRupiah(
                    Number(
                      bill.amount,
                    ),
                  )}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4 px-4 py-3">
                <span className="text-sm text-gray-500">
                  Metode Pembayaran
                </span>

                <span className="text-right text-sm font-medium text-gray-900">
                  {
                    transaction.payment_type_label
                  }
                </span>
              </div>

              <div className="flex items-center justify-between gap-4 px-4 py-3">
                <span className="text-sm text-gray-500">
                  Order ID
                </span>

                <span className="max-w-[60%] break-all text-right text-xs font-medium text-gray-700">
                  {bill.order_id}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4 px-4 py-3">
                <span className="text-sm text-gray-500">
                  Transaction ID
                </span>

                <span className="max-w-[60%] break-all text-right text-xs font-medium text-gray-700">
                  {transaction.transaction_id ??
                    '-'}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4 px-4 py-3">
                <span className="text-sm text-gray-500">
                  Waktu Transaksi
                </span>

                <span className="text-right text-sm text-gray-700">
                  {formatDate(
                    transaction.transaction_time,
                  )}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4 px-4 py-3">
                <span className="text-sm text-gray-500">
                  Waktu Settlement
                </span>

                <span className="text-right text-sm text-gray-700">
                  {formatDate(
                    transaction.settlement_time,
                  )}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4 px-4 py-3">
                <span className="text-sm text-gray-500">
                  Signature
                </span>

                <span className="inline-flex items-center gap-1 text-sm font-medium text-emerald-600">
                  <ShieldCheck className="h-4 w-4" />

                  {transaction.signature_verified
                    ? 'Terverifikasi'
                    : 'Tidak Terverifikasi'}
                </span>
              </div>
            </div>
          </div>

          {/* ACTION */}
          <div className="border-t border-gray-100 bg-gray-50 p-6">
            {successful ? (
              <button
                type="button"
                onClick={
                  handleDownloadReceipt
                }
                disabled={downloading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {downloading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}

                {downloading
                  ? 'Membuat Struk...'
                  : 'Unduh Struk PDF'}
              </button>
            ) : (
              <div className="rounded-xl border border-gray-200 bg-white p-4 text-center">
                <p className="text-sm font-medium text-gray-700">
                  Struk belum tersedia
                </p>

                <p className="mt-1 text-xs text-gray-500">
                  Struk hanya dapat diunduh
                  setelah pembayaran berhasil
                  dan terverifikasi.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}