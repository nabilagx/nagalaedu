'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft,
  CheckCircle2,
  CircleDollarSign,
  FileText,
  Loader2,
  Pencil,
  Trash2,
  X,
} from 'lucide-react'

type Transaction = {
  id: string
  transaction_id: string
  transaction_status: string
  payment_type: string | null
  gross_amount: number
  transaction_time: string | null
  settlement_time: string | null
  signature_verified: boolean
  created_at: string
}

type DetailResponse = {
  bill: {
    id: string
    student_id: string
    order_id: string
    month_period: string
    amount: number
    payment_status: string
    snap_token: string | null
    paid_at: string | null
    created_at: string
  }
  student: {
    id: string
    student_name: string
    grade_level: string | null
    school_name: string | null
    phone_number: string | null
    status: string
    parent_id: string | null
  } | null
  parent: {
    id: string
    full_name: string
    phone_number: string | null
  } | null
  transactions: Transaction[]
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

function formatDate(value: string | null) {
  if (!value) return '-'

  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function formatMonth(value: string) {
  return new Intl.DateTimeFormat('id-ID', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(value))
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
    default:
      return 'bg-gray-100 text-gray-600'
  }
}

export default function FounderFinanceDetailPage() {
  const params = useParams()
  const router = useRouter()

  const id = params.id as string

  const [data, setData] =
    useState<DetailResponse | null>(null)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [showEdit, setShowEdit] = useState(false)
  const [showDelete, setShowDelete] = useState(false)

  const [amount, setAmount] = useState('')

  async function loadDetail() {
    try {
      setLoading(true)

      const response = await fetch(
        `/api/founder/finance/${id}`,
        {
          cache: 'no-store',
        },
      )

      const result = await response.json()

      if (!response.ok) {
        throw new Error(
          result.error ??
            'Gagal mengambil detail tagihan.',
        )
      }

      setData(result)
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : 'Gagal mengambil detail tagihan.',
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (id) {
      loadDetail()
    }
  }, [id])

  function openEdit() {
    if (!data) return

    if (data.bill.payment_status === 'PAID') {
      alert(
        'Tagihan yang sudah lunas tidak dapat diubah.',
      )
      return
    }

    setAmount(String(data.bill.amount))
    setShowEdit(true)
  }

  async function handleEdit() {
    const numericAmount = Number(amount)

    if (!Number.isFinite(numericAmount)) {
      alert('Nominal tidak valid.')
      return
    }

    if (!Number.isInteger(numericAmount)) {
      alert('Nominal harus berupa angka bulat.')
      return
    }

    if (numericAmount < MIN_BILL_AMOUNT) {
      alert(
        `Nominal minimal ${formatRupiah(
          MIN_BILL_AMOUNT,
        )}.`,
      )
      return
    }

    if (numericAmount > MAX_BILL_AMOUNT) {
      alert(
        `Nominal maksimal ${formatRupiah(
          MAX_BILL_AMOUNT,
        )}.`,
      )
      return
    }

    try {
      setSaving(true)

      const response = await fetch(
        `/api/founder/finance/${id}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: numericAmount,
          }),
        },
      )

      const result = await response.json()

      if (!response.ok) {
        throw new Error(
          result.error ??
            'Gagal memperbarui tagihan.',
        )
      }

      setShowEdit(false)

      await loadDetail()

      alert('Tagihan berhasil diperbarui.')
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : 'Gagal memperbarui tagihan.',
      )
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    try {
      setSaving(true)

      const response = await fetch(
        `/api/founder/finance/${id}`,
        {
          method: 'DELETE',
        },
      )

      const result = await response.json()

      if (!response.ok) {
        throw new Error(
          result.error ??
            'Gagal menghapus tagihan.',
        )
      }

      alert('Tagihan berhasil dihapus.')

      router.push('/dashboard/founder/finance')
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : 'Gagal menghapus tagihan.',
      )
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50">
        <Loader2 className="h-7 w-7 animate-spin text-gray-400" />
      </main>
    )
  }

  if (!data) {
    return (
      <main className="min-h-screen bg-gray-50 p-6">
        <div className="mx-auto max-w-4xl">
          <Link
            href="/dashboard/founder/finance"
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali ke Keuangan
          </Link>

          <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-8 text-center">
            Data tagihan tidak ditemukan.
          </div>
        </div>
      </main>
    )
  }

if (!data?.bill) {
  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/dashboard/founder/finance"
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali ke Keuangan
        </Link>

        <div className="mt-6 rounded-2xl border border-red-200 bg-white p-8 text-center">
          <p className="font-semibold text-gray-900">
            Data tagihan tidak ditemukan
          </p>

          <p className="mt-2 text-sm text-gray-500">
            Detail tagihan tidak dapat dimuat.
          </p>
        </div>
      </div>
    </main>
  )
}

const isPaid =
  data.bill.payment_status === 'PAID'

  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/dashboard/founder/finance"
          className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-gray-600 transition hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali ke Keuangan
        </Link>

        <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm text-gray-500">
              Detail Tagihan
            </p>

            <h1 className="mt-1 text-2xl font-bold text-gray-900">
              {data.student?.student_name ?? 'Siswa'}
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              {data.bill.order_id}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {!isPaid && (
              <>
                <button
                  type="button"
                  onClick={openEdit}
                  className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                >
                  <Pencil className="h-4 w-4" />
                  Edit Nominal
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setShowDelete(true)
                  }
                  className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-4 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                  Hapus
                </button>
              </>
            )}
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 md:col-span-2">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <FileText className="h-5 w-5" />
              </div>

              <div>
                <h2 className="font-semibold text-gray-900">
                  Informasi Tagihan
                </h2>

                <p className="text-xs text-gray-500">
                  Data SPP siswa
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs text-gray-500">
                  Siswa
                </p>

                <p className="mt-1 font-medium text-gray-900">
                  {data.student?.student_name ?? '-'}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-500">
                  Periode
                </p>

                <p className="mt-1 font-medium text-gray-900">
                  {formatMonth(
                    data.bill.month_period,
                  )}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-500">
                  Nominal
                </p>

                <p className="mt-1 text-lg font-bold text-gray-900">
                  {formatRupiah(
                    Number(data.bill.amount),
                  )}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-500">
                  Status
                </p>

                <span
                  className={`mt-1 inline-flex rounded-full px-3 py-1 text-xs font-medium ${getStatusClass(
                    data.bill.payment_status,
                  )}`}
                >
                  {getStatusLabel(
                    data.bill.payment_status,
                  )}
                </span>
              </div>

              <div>
                <p className="text-xs text-gray-500">
                  Dibuat
                </p>

                <p className="mt-1 text-sm text-gray-700">
                  {formatDate(
                    data.bill.created_at,
                  )}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-500">
                  Dibayar
                </p>

                <p className="mt-1 text-sm text-gray-700">
                  {formatDate(
                    data.bill.paid_at,
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <CircleDollarSign className="h-5 w-5" />
              </div>

              <div>
                <h2 className="font-semibold text-gray-900">
                  Pembayaran
                </h2>

                <p className="text-xs text-gray-500">
                  Status transaksi
                </p>
              </div>
            </div>

            <div className="rounded-xl bg-gray-50 p-4">
              <p className="text-xs text-gray-500">
                Status saat ini
              </p>

              <p className="mt-1 font-semibold text-gray-900">
                {getStatusLabel(
                  data.bill.payment_status,
                )}
              </p>

              {isPaid && (
                <div className="mt-3 flex items-center gap-2 text-sm font-medium text-emerald-600">
                  <CheckCircle2 className="h-4 w-4" />
                  Dikonfirmasi Midtrans
                </div>
              )}
            </div>

            <p className="mt-4 text-xs leading-5 text-gray-500">
              Status pembayaran dikelola oleh sistem
              pembayaran Midtrans. Founder tidak dapat
              mengubah status menjadi PAID secara manual.
            </p>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-gray-200 bg-white p-5">
          <h2 className="font-semibold text-gray-900">
            Data Siswa & Orang Tua
          </h2>

          <div className="mt-4 grid gap-5 md:grid-cols-2">
            <div>
              <p className="text-xs text-gray-500">
                Nama Siswa
              </p>

              <p className="mt-1 font-medium text-gray-900">
                {data.student?.student_name ?? '-'}
              </p>

              <p className="mt-3 text-xs text-gray-500">
                Sekolah
              </p>

              <p className="mt-1 text-sm text-gray-700">
                {data.student?.school_name ?? '-'}
              </p>
            </div>

            <div>
              <p className="text-xs text-gray-500">
                Orang Tua
              </p>

              <p className="mt-1 font-medium text-gray-900">
                {data.parent?.full_name ?? '-'}
              </p>

              <p className="mt-3 text-xs text-gray-500">
                Nomor Telepon
              </p>

              <p className="mt-1 text-sm text-gray-700">
                {data.parent?.phone_number ?? '-'}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-5 overflow-hidden rounded-2xl border border-gray-200 bg-white">
          <div className="border-b border-gray-200 px-5 py-4">
            <h2 className="font-semibold text-gray-900">
              Riwayat Transaksi
            </h2>
          </div>

          {data.transactions.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-500">
              Belum ada transaksi.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-5 py-3 text-left font-semibold text-gray-600">
                      Transaction ID
                    </th>

                    <th className="px-5 py-3 text-left font-semibold text-gray-600">
                      Status
                    </th>

                    <th className="px-5 py-3 text-left font-semibold text-gray-600">
                      Nominal
                    </th>

                    <th className="px-5 py-3 text-left font-semibold text-gray-600">
                      Waktu
                    </th>

                    <th className="px-5 py-3 text-left font-semibold text-gray-600">
                      Signature
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {data.transactions.map(
                    (transaction) => (
                      <tr key={transaction.id}>
                        <td className="px-5 py-4 font-mono text-xs text-gray-700">
                          {transaction.transaction_id}
                        </td>

                        <td className="px-5 py-4">
                          {transaction.transaction_status}
                        </td>

                        <td className="px-5 py-4 font-medium">
                          {formatRupiah(
                            Number(
                              transaction.gross_amount,
                            ),
                          )}
                        </td>

                        <td className="px-5 py-4 text-gray-600">
                          {formatDate(
                            transaction.transaction_time,
                          )}
                        </td>

                        <td className="px-5 py-4">
                          {transaction.signature_verified ? (
                            <span className="text-emerald-600">
                              Terverifikasi
                            </span>
                          ) : (
                            <span className="text-red-600">
                              Tidak valid
                            </span>
                          )}
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white">
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
              <h2 className="font-semibold text-gray-900">
                Edit Nominal
              </h2>

              <button
                onClick={() =>
                  setShowEdit(false)
                }
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 p-5">
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
                    setAmount(event.target.value)
                  }
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-gray-400"
                />

                <p className="mt-1.5 text-xs text-gray-500">
                  Maksimal{' '}
                  {formatRupiah(
                    MAX_BILL_AMOUNT,
                  )}
                  .
                </p>
              </div>

              <button
                disabled={saving}
                onClick={handleEdit}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
              >
                {saving && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}

                Simpan Perubahan
              </button>
            </div>
          </div>
        </div>
      )}

      {showDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6">
            <h2 className="text-lg font-semibold text-gray-900">
              Hapus Tagihan?
            </h2>

            <p className="mt-2 text-sm leading-6 text-gray-500">
              Tagihan ini akan dihapus secara permanen.
              Pastikan belum memiliki transaksi.
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() =>
                  setShowDelete(false)
                }
                className="rounded-xl px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100"
              >
                Batal
              </button>

              <button
                disabled={saving}
                onClick={handleDelete}
                className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                Hapus Tagihan
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}