"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import {
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  FileText,
  Loader2,
  ReceiptText,
  ShieldCheck,
  UserRound,
} from "lucide-react"

type Payment = {
  id: string
  spp_bill_id: string
  transaction_id: string
  transaction_status: string
  payment_type: string | null
  gross_amount: number
  transaction_time: string | null
  settlement_time: string | null
  signature_verified: boolean | null
  created_at: string
  bill: {
    id: string
    student_id: string
    order_id: string
    month_period: string
    amount: number
    payment_status: string
    paid_at: string | null
    student: {
      id: string
      student_name: string
      grade_level: string | null
      school_name: string | null
    } | null
  } | null
}

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value)
}

function formatDate(value: string | null) {
  if (!value) return "-"

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}

function formatMonth(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    month: "long",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`))
}

function formatPaymentType(value: string | null) {
  if (!value) return "-"

  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function isSuccessful(status: string) {
  const normalized = status.toUpperCase()

  return (
    normalized === "SETTLEMENT" ||
    normalized === "CAPTURE" ||
    normalized === "PAID"
  )
}

export default function ParentPaymentDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params.id

  const [payment, setPayment] = useState<Payment | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    async function loadPayment() {
      try {
        setLoading(true)

        const response = await fetch(`/api/parent/payments/${id}`, {
          cache: "no-store",
        })

        const result = await response.json()

        if (!response.ok) {
          throw new Error(
            result.error || "Gagal memuat detail pembayaran.",
          )
        }

        setPayment(result.payment)
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Terjadi kesalahan saat memuat pembayaran.",
        )
      } finally {
        setLoading(false)
      }
    }

    if (id) {
      loadPayment()
    }
  }, [id])

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-8">
        <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <Loader2 className="mx-auto h-7 w-7 animate-spin text-[#E53935]" />

          <p className="mt-3 text-sm text-slate-500">
            Memuat detail pembayaran...
          </p>
        </div>
      </main>
    )
  }

  if (error || !payment) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-8">
        <div className="mx-auto max-w-3xl">
          <Link
            href="/dashboard/parent/payments"
            className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-[#E53935]"
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali ke Riwayat Pembayaran
          </Link>

          <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
            {error || "Pembayaran tidak ditemukan."}
          </div>
        </div>
      </main>
    )
  }

  const successful = isSuccessful(payment.transaction_status)

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/dashboard/parent/payments"
          className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-[#E53935]"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali ke Riwayat Pembayaran
        </Link>

        <div className="mb-6">
          <p className="text-sm font-semibold text-[#E53935]">
            DETAIL PEMBAYARAN
          </p>

          <h1 className="mt-1 text-2xl font-bold text-[#111827]">
            Detail Transaksi
          </h1>

          <p className="mt-1 break-all text-sm text-slate-500">
            {payment.transaction_id}
          </p>
        </div>

        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="bg-[#111827] p-6 text-white">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-slate-300">
                  Total Pembayaran
                </p>

                <p className="mt-2 text-3xl font-bold">
                  {formatRupiah(Number(payment.gross_amount))}
                </p>

                <p className="mt-2 text-sm text-slate-300">
                  SPP{" "}
                  {payment.bill
                    ? formatMonth(payment.bill.month_period)
                    : "-"}
                </p>
              </div>

              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
                {successful ? (
                  <CheckCircle2 className="h-6 w-6 text-emerald-300" />
                ) : (
                  <CreditCard className="h-6 w-6 text-white" />
                )}
              </div>
            </div>
          </div>

          <div className="p-6">
            {payment.bill?.student && (
              <div className="mb-6 rounded-2xl bg-slate-50 p-4">
                <div className="flex items-center gap-3">
                  <UserRound className="h-5 w-5 text-slate-500" />

                  <div>
                    <p className="text-xs text-slate-500">
                      Pembayaran Untuk
                    </p>

                    <p className="font-semibold text-[#111827]">
                      {payment.bill.student.student_name}
                    </p>

                    {payment.bill.student.grade_level && (
                      <p className="mt-0.5 text-xs text-slate-500">
                        {payment.bill.student.grade_level}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="divide-y divide-slate-100 rounded-2xl border border-slate-100">
              <div className="flex items-center justify-between gap-4 p-4">
                <div className="flex items-center gap-3">
                  <ReceiptText className="h-4 w-4 text-slate-400" />
                  <span className="text-sm text-slate-500">
                    Status Transaksi
                  </span>
                </div>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    successful
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-amber-50 text-amber-700"
                  }`}
                >
                  {payment.transaction_status}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4 p-4">
                <div className="flex items-center gap-3">
                  <CreditCard className="h-4 w-4 text-slate-400" />

                  <span className="text-sm text-slate-500">
                    Metode Pembayaran
                  </span>
                </div>

                <span className="text-sm font-medium text-[#111827]">
                  {formatPaymentType(payment.payment_type)}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4 p-4">
                <div className="flex items-center gap-3">
                  <FileText className="h-4 w-4 text-slate-400" />

                  <span className="text-sm text-slate-500">
                    Nomor Tagihan
                  </span>
                </div>

                <span className="max-w-[55%] break-all text-right text-sm font-medium text-[#111827]">
                  {payment.bill?.order_id ?? "-"}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4 p-4">
                <span className="text-sm text-slate-500">
                  Waktu Transaksi
                </span>

                <span className="text-right text-sm font-medium text-[#111827]">
                  {formatDate(payment.transaction_time)}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4 p-4">
                <span className="text-sm text-slate-500">
                  Waktu Settlement
                </span>

                <span className="text-right text-sm font-medium text-[#111827]">
                  {formatDate(payment.settlement_time)}
                </span>
              </div>
            </div>

            {payment.signature_verified !== null && (
              <div
                className={`mt-5 flex items-center gap-3 rounded-2xl border p-4 ${
                  payment.signature_verified
                    ? "border-emerald-200 bg-emerald-50"
                    : "border-red-200 bg-red-50"
                }`}
              >
                <ShieldCheck
                  className={`h-5 w-5 ${
                    payment.signature_verified
                      ? "text-emerald-600"
                      : "text-red-600"
                  }`}
                />

                <div>
                  <p
                    className={`text-sm font-semibold ${
                      payment.signature_verified
                        ? "text-emerald-800"
                        : "text-red-800"
                    }`}
                  >
                    {payment.signature_verified
                      ? "Transaksi terverifikasi"
                      : "Verifikasi transaksi gagal"}
                  </p>

                  <p
                    className={`mt-1 text-xs ${
                      payment.signature_verified
                        ? "text-emerald-700"
                        : "text-red-700"
                    }`}
                  >
                    Status verifikasi signature dari sistem pembayaran.
                  </p>
                </div>
              </div>
            )}

            {successful && (
              <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />

                  <div>
                    <p className="text-sm font-semibold text-emerald-800">
                      Pembayaran berhasil
                    </p>

                    <p className="mt-1 text-xs text-emerald-700">
                      Transaksi ini tercatat sebagai pembayaran SPP.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}