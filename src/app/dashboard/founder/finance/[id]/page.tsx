'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  CreditCard,
  Edit3,
  FileText,
  Loader2,
  Trash2,
  User,
  Users,
  XCircle,
  AlertCircle,
  CircleDollarSign,
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

const PAYMENT_STATUSES = new Set([
  'PAID',
  'PENDING',
  'FAILED',
  'EXPIRED',
  'CANCELLED',
])

type ToastType = 'success' | 'error' | 'info'

type Toast = {
  type: ToastType
  message: string
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value)
}

function formatDate(value: string | null) {
  if (!value) return '-'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return '-'
  }

  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function formatMonth(value: string) {
  if (!value) return '-'

  const date = new Date(`${value}-01`)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('id-ID', {
    month: 'long',
    year: 'numeric',
  }).format(date)
}

function getStatusStyle(status: string) {
  switch (status) {
    case 'PAID':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200'

    case 'PENDING':
      return 'bg-amber-50 text-amber-700 border-amber-200'

    case 'FAILED':
      return 'bg-red-50 text-red-700 border-red-200'

    case 'EXPIRED':
      return 'bg-gray-100 text-gray-700 border-gray-200'

    case 'CANCELLED':
      return 'bg-gray-100 text-gray-700 border-gray-200'

    default:
      return 'bg-gray-100 text-gray-700 border-gray-200'
  }
}

function getTransactionStatusStyle(status: string) {
  switch (status.toUpperCase()) {
    case 'SETTLEMENT':
    case 'CAPTURE':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200'

    case 'PENDING':
      return 'bg-amber-50 text-amber-700 border-amber-200'

    case 'DENY':
    case 'CANCEL':
    case 'CANCELLED':
    case 'EXPIRE':
      return 'bg-red-50 text-red-700 border-red-200'

    default:
      return 'bg-gray-100 text-gray-700 border-gray-200'
  }
}

function ToastView({
  toast,
}: {
  toast: Toast
}) {
  const isSuccess = toast.type === 'success'
  const isError = toast.type === 'error'

  return (
    <div
      className="fixed right-4 top-4 z-[100] w-[calc(100%-2rem)] max-w-sm"
      aria-live="polite"
    >
      <div
        className={`rounded-2xl border bg-white p-4 shadow-xl ${
          isSuccess
            ? 'border-emerald-200'
            : isError
              ? 'border-red-200'
              : 'border-blue-200'
        }`}
      >
        <div className="flex items-start gap-3">
          <div className="mt-0.5 shrink-0">
            {isSuccess ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            ) : isError ? (
              <XCircle className="h-5 w-5 text-red-600" />
            ) : (
              <AlertCircle className="h-5 w-5 text-blue-600" />
            )}
          </div>

          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900">
              {isSuccess
                ? 'Berhasil'
                : isError
                  ? 'Gagal'
                  : 'Informasi'}
            </p>

            <p className="mt-1 text-sm leading-5 text-gray-600">
              {toast.message}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function FinanceDetailPage() {
  const params = useParams()
  const router = useRouter()

  const id =
    typeof params.id === 'string'
      ? params.id
      : Array.isArray(params.id)
        ? params.id[0]
        : ''

  const [data, setData] = useState<DetailResponse | null>(null)
  const [loading, setLoading] = useState(true)

  const [showEdit, setShowEdit] = useState(false)
  const [showDelete, setShowDelete] = useState(false)

  const [amount, setAmount] = useState('')

  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const [toast, setToast] = useState<Toast | null>(null)

  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  )

  function showToast(type: ToastType, message: string) {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current)
    }

    setToast({
      type,
      message,
    })

    toastTimeoutRef.current = setTimeout(() => {
      setToast(null)
      toastTimeoutRef.current = null
    }, 3500)
  }

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current)
      }
    }
  }, [])

  async function loadDetail(showErrorToast = true) {
    if (!id) {
      setLoading(false)

      if (showErrorToast) {
        showToast('error', 'ID tagihan tidak valid.')
      }

      return false
    }

    try {
      const response = await fetch(
        `/api/founder/finance/${encodeURIComponent(id)}`,
        {
          method: 'GET',
          cache: 'no-store',
          headers: {
            Accept: 'application/json',
          },
        }
      )

      const result = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(
          result?.error ||
            result?.message ||
            'Gagal memuat detail tagihan.'
        )
      }

      setData(result as DetailResponse)

      return true
    } catch (error) {
      console.error('Finance detail load error:', error)

      if (showErrorToast) {
        showToast(
          'error',
          error instanceof Error
            ? error.message
            : 'Gagal memuat detail tagihan.'
        )
      }

      return false
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadDetail()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  function openEdit() {
    if (!data) return

    if (data.bill.payment_status === 'PAID') {
      showToast(
        'error',
        'Tagihan yang sudah dibayar tidak dapat diedit.'
      )
      return
    }

    if (!PAYMENT_STATUSES.has(data.bill.payment_status)) {
      showToast(
        'error',
        'Status pembayaran tagihan tidak valid.'
      )
      return
    }

    setAmount(String(data.bill.amount))
    setShowEdit(true)
  }

  function openDelete() {
    if (!data) return

    if (data.bill.payment_status === 'PAID') {
      showToast(
        'error',
        'Tagihan yang sudah dibayar tidak dapat dihapus.'
      )
      return
    }

    setShowDelete(true)
  }

  async function handleEdit() {
    if (!id || !data) {
      showToast('error', 'Data tagihan tidak valid.')
      return
    }

    if (data.bill.payment_status === 'PAID') {
      showToast(
        'error',
        'Tagihan yang sudah dibayar tidak dapat diedit.'
      )
      return
    }

    if (!PAYMENT_STATUSES.has(data.bill.payment_status)) {
      showToast(
        'error',
        'Status pembayaran tagihan tidak valid.'
      )
      return
    }

    const numericAmount = Number(amount)

    if (!Number.isFinite(numericAmount)) {
      showToast('error', 'Nominal tagihan harus berupa angka.')
      return
    }

    if (!Number.isInteger(numericAmount)) {
      showToast(
        'error',
        'Nominal tagihan harus berupa bilangan bulat.'
      )
      return
    }

    if (
      numericAmount < MIN_BILL_AMOUNT ||
      numericAmount > MAX_BILL_AMOUNT
    ) {
      showToast(
        'error',
        `Nominal harus antara ${formatCurrency(
          MIN_BILL_AMOUNT
        )} dan ${formatCurrency(MAX_BILL_AMOUNT)}.`
      )
      return
    }

    setSaving(true)

    try {
      const response = await fetch(
        `/api/founder/finance/${encodeURIComponent(id)}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          cache: 'no-store',
          body: JSON.stringify({
            amount: numericAmount,
          }),
        }
      )

      const result = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(
          result?.error ||
            result?.message ||
            'Gagal memperbarui tagihan.'
        )
      }

      /*
       * PATCH berhasil.
       *
       * Reload dibuat silent supaya kalau GET setelah PATCH
       * bermasalah, error reload tidak menimpa toast success
       * dari operasi PATCH yang sebenarnya sudah berhasil.
       */
      await loadDetail(false)

      setShowEdit(false)
      setAmount('')

      showToast(
        'success',
        'Tagihan berhasil diperbarui.'
      )
    } catch (error) {
      console.error('Finance edit error:', error)

      showToast(
        'error',
        error instanceof Error
          ? error.message
          : 'Gagal memperbarui tagihan.'
      )
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!id || !data) {
      showToast('error', 'Data tagihan tidak valid.')
      return
    }

    if (data.bill.payment_status === 'PAID') {
      showToast(
        'error',
        'Tagihan yang sudah dibayar tidak dapat dihapus.'
      )
      return
    }

    setDeleting(true)

    try {
      const response = await fetch(
        `/api/founder/finance/${encodeURIComponent(id)}`,
        {
          method: 'DELETE',
          headers: {
            Accept: 'application/json',
          },
          cache: 'no-store',
        }
      )

      const result = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(
          result?.error ||
            result?.message ||
            'Gagal menghapus tagihan.'
        )
      }

      setShowDelete(false)

      showToast(
        'success',
        'Tagihan berhasil dihapus.'
      )

      window.setTimeout(() => {
        router.push('/dashboard/founder/finance')
      }, 800)
    } catch (error) {
      console.error('Finance delete error:', error)

      showToast(
        'error',
        error instanceof Error
          ? error.message
          : 'Gagal menghapus tagihan.'
      )
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex items-center gap-3 text-gray-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">
            Memuat detail tagihan...
          </span>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <>
        {toast && <ToastView toast={toast} />}

        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
          <Link
            href="/dashboard/founder/finance"
            className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-gray-600 transition hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali ke Finance
          </Link>

          <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
            <div className="flex items-start gap-3">
              <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />

              <div>
                <h2 className="font-semibold text-red-900">
                  Detail tagihan tidak ditemukan
                </h2>

                <p className="mt-1 text-sm text-red-700">
                  Tagihan mungkin sudah dihapus atau tidak dapat
                  diakses.
                </p>
              </div>
            </div>
          </div>
        </div>
      </>
    )
  }

  const { bill, student, parent, transactions } = data

  const isPaid = bill.payment_status === 'PAID'

  return (
    <>
      {toast && <ToastView toast={toast} />}

      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        {/* HEADER */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link
              href="/dashboard/founder/finance"
              className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-gray-600 transition hover:text-gray-900"
            >
              <ArrowLeft className="h-4 w-4" />
              Kembali ke Finance
            </Link>

            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50">
                <FileText className="h-5 w-5 text-red-600" />
              </div>

              <div>
                <h1 className="text-2xl font-bold tracking-tight text-gray-900">
                  Detail Tagihan
                </h1>

                <p className="text-sm text-gray-500">
                  Informasi lengkap tagihan siswa
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={openEdit}
              disabled={isPaid}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Edit3 className="h-4 w-4" />
              Edit
            </button>

            <button
              type="button"
              onClick={openDelete}
              disabled={isPaid}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" />
              Hapus
            </button>
          </div>
        </div>

        {/* BILL SUMMARY */}
        <div className="mb-6 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-5 py-4 sm:px-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Tagihan SPP
                </p>

                <h2 className="mt-1 text-xl font-bold text-gray-900">
                  {student?.student_name || 'Siswa tidak ditemukan'}
                </h2>
              </div>

              <span
                className={`inline-flex w-fit items-center rounded-full border px-3 py-1.5 text-xs font-semibold ${getStatusStyle(
                  bill.payment_status
                )}`}
              >
                {bill.payment_status}
              </span>
            </div>
          </div>

          <div className="grid gap-6 p-5 sm:grid-cols-2 lg:grid-cols-4 sm:p-6">
            <div>
              <div className="mb-2 flex items-center gap-2 text-gray-500">
                <CircleDollarSign className="h-4 w-4" />
                <span className="text-xs font-medium uppercase tracking-wide">
                  Nominal
                </span>
              </div>

              <p className="text-xl font-bold text-gray-900">
                {formatCurrency(bill.amount)}
              </p>
            </div>

            <div>
              <div className="mb-2 flex items-center gap-2 text-gray-500">
                <Clock3 className="h-4 w-4" />
                <span className="text-xs font-medium uppercase tracking-wide">
                  Periode
                </span>
              </div>

              <p className="font-semibold text-gray-900">
                {formatMonth(bill.month_period)}
              </p>
            </div>

            <div>
              <div className="mb-2 flex items-center gap-2 text-gray-500">
                <CreditCard className="h-4 w-4" />
                <span className="text-xs font-medium uppercase tracking-wide">
                  Order ID
                </span>
              </div>

              <p className="break-all font-mono text-sm text-gray-700">
                {bill.order_id || '-'}
              </p>
            </div>

            <div>
              <div className="mb-2 flex items-center gap-2 text-gray-500">
                <Clock3 className="h-4 w-4" />
                <span className="text-xs font-medium uppercase tracking-wide">
                  Dibuat
                </span>
              </div>

              <p className="text-sm font-medium text-gray-900">
                {formatDate(bill.created_at)}
              </p>
            </div>
          </div>
        </div>

        {/* STUDENT + PARENT */}
        <div className="mb-6 grid gap-6 lg:grid-cols-2">
          {/* STUDENT */}
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="flex items-center gap-3 border-b border-gray-100 px-5 py-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
                <User className="h-5 w-5 text-blue-600" />
              </div>

              <div>
                <h2 className="font-semibold text-gray-900">
                  Data Siswa
                </h2>

                <p className="text-xs text-gray-500">
                  Informasi siswa terkait tagihan
                </p>
              </div>
            </div>

            <div className="space-y-4 p-5">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Nama
                </p>

                <p className="mt-1 font-semibold text-gray-900">
                  {student?.student_name || '-'}
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    Kelas
                  </p>

                  <p className="mt-1 text-sm text-gray-700">
                    {student?.grade_level || '-'}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    Status
                  </p>

                  <p className="mt-1 text-sm font-medium text-gray-700">
                    {student?.status || '-'}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Sekolah
                </p>

                <p className="mt-1 text-sm text-gray-700">
                  {student?.school_name || '-'}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Nomor Telepon
                </p>

                <p className="mt-1 text-sm text-gray-700">
                  {student?.phone_number || '-'}
                </p>
              </div>
            </div>
          </div>

          {/* PARENT */}
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="flex items-center gap-3 border-b border-gray-100 px-5 py-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50">
                <Users className="h-5 w-5 text-purple-600" />
              </div>

              <div>
                <h2 className="font-semibold text-gray-900">
                  Data Orang Tua
                </h2>

                <p className="text-xs text-gray-500">
                  Informasi orang tua/wali siswa
                </p>
              </div>
            </div>

            <div className="space-y-4 p-5">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Nama
                </p>

                <p className="mt-1 font-semibold text-gray-900">
                  {parent?.full_name || '-'}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Nomor Telepon
                </p>

                <p className="mt-1 text-sm text-gray-700">
                  {parent?.phone_number || '-'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* PAYMENT INFO */}
        <div className="mb-6 rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center gap-3 border-b border-gray-100 px-5 py-4 sm:px-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">
              <CreditCard className="h-5 w-5 text-emerald-600" />
            </div>

            <div>
              <h2 className="font-semibold text-gray-900">
                Informasi Pembayaran
              </h2>

              <p className="text-xs text-gray-500">
                Status dan informasi pembayaran tagihan
              </p>
            </div>
          </div>

          <div className="grid gap-6 p-5 sm:grid-cols-2 lg:grid-cols-3 sm:p-6">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Status Pembayaran
              </p>

              <span
                className={`mt-2 inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-semibold ${getStatusStyle(
                  bill.payment_status
                )}`}
              >
                {bill.payment_status}
              </span>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Dibayar Pada
              </p>

              <p className="mt-1 text-sm font-medium text-gray-900">
                {formatDate(bill.paid_at)}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Snap Token
              </p>

              <p className="mt-1 break-all font-mono text-xs text-gray-600">
                {bill.snap_token
                  ? 'Tersedia'
                  : 'Tidak tersedia'}
              </p>
            </div>
          </div>
        </div>

        {/* TRANSACTIONS */}
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 sm:px-6">
            <div>
              <h2 className="font-semibold text-gray-900">
                Riwayat Transaksi
              </h2>

              <p className="text-xs text-gray-500">
                Transaksi Midtrans terkait tagihan ini
              </p>
            </div>

            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600">
              {transactions.length} transaksi
            </span>
          </div>

          {transactions.length === 0 ? (
            <div className="flex min-h-32 items-center justify-center px-5 py-8 text-center">
              <div>
                <CreditCard className="mx-auto h-8 w-8 text-gray-300" />

                <p className="mt-2 text-sm font-medium text-gray-600">
                  Belum ada transaksi
                </p>

                <p className="mt-1 text-xs text-gray-400">
                  Belum ada transaksi pembayaran untuk tagihan ini.
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Transaction ID
                    </th>

                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Status
                    </th>

                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Payment Type
                    </th>

                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Gross Amount
                    </th>

                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Transaction Time
                    </th>

                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Signature
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {transactions.map((transaction) => (
                    <tr
                      key={transaction.id}
                      className="transition hover:bg-gray-50"
                    >
                      <td className="px-5 py-4">
                        <p className="max-w-[220px] truncate font-mono text-xs text-gray-700">
                          {transaction.transaction_id}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${getTransactionStatusStyle(
                            transaction.transaction_status
                          )}`}
                        >
                          {transaction.transaction_status}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-sm text-gray-700">
                        {transaction.payment_type || '-'}
                      </td>

                      <td className="px-5 py-4 text-sm font-semibold text-gray-900">
                        {formatCurrency(
                          transaction.gross_amount
                        )}
                      </td>

                      <td className="px-5 py-4 text-sm text-gray-600">
                        {formatDate(
                          transaction.transaction_time
                        )}
                      </td>

                      <td className="px-5 py-4">
                        {transaction.signature_verified ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
                            <CheckCircle2 className="h-4 w-4" />
                            Verified
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-600">
                            <XCircle className="h-4 w-4" />
                            Unverified
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* EDIT MODAL */}
      {showEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="border-b border-gray-100 px-5 py-4">
              <h2 className="text-lg font-bold text-gray-900">
                Edit Tagihan
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Ubah nominal tagihan siswa.
              </p>
            </div>

            <div className="space-y-4 px-5 py-5">
              <div>
                <label
                  htmlFor="amount"
                  className="mb-2 block text-sm font-semibold text-gray-700"
                >
                  Nominal Tagihan
                </label>

                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-500">
                    Rp
                  </span>

                  <input
                    id="amount"
                    type="number"
                    min={MIN_BILL_AMOUNT}
                    max={MAX_BILL_AMOUNT}
                    step={1}
                    value={amount}
                    onChange={(event) =>
                      setAmount(event.target.value)
                    }
                    disabled={saving}
                    className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-red-500 focus:ring-2 focus:ring-red-100 disabled:bg-gray-50"
                    placeholder="Contoh: 100000"
                  />
                </div>

                <p className="mt-2 text-xs text-gray-500">
                  Minimal {formatCurrency(MIN_BILL_AMOUNT)} dan
                  maksimal {formatCurrency(MAX_BILL_AMOUNT)}.
                </p>
              </div>
            </div>

            <div className="flex gap-3 border-t border-gray-100 px-5 py-4">
              <button
                type="button"
                onClick={() => {
                  if (!saving) {
                    setShowEdit(false)
                    setAmount('')
                  }
                }}
                disabled={saving}
                className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Batal
              </button>

              <button
                type="button"
                onClick={handleEdit}
                disabled={saving}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  'Simpan Perubahan'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE MODAL */}
      {showDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="px-5 py-5">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
                <Trash2 className="h-5 w-5 text-red-600" />
              </div>

              <div className="mt-4 text-center">
                <h2 className="text-lg font-bold text-gray-900">
                  Hapus Tagihan?
                </h2>

                <p className="mt-2 text-sm leading-6 text-gray-500">
                  Tagihan{' '}
                  <span className="font-semibold text-gray-700">
                    {student?.student_name || '-'}
                  </span>{' '}
                  untuk periode{' '}
                  <span className="font-semibold text-gray-700">
                    {formatMonth(bill.month_period)}
                  </span>{' '}
                  akan dihapus. Tindakan ini tidak dapat
                  dibatalkan.
                </p>
              </div>
            </div>

            <div className="flex gap-3 border-t border-gray-100 px-5 py-4">
              <button
                type="button"
                onClick={() => setShowDelete(false)}
                disabled={deleting}
                className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Batal
              </button>

              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deleting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Menghapus...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    Hapus
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
