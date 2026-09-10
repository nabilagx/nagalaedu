import { NextRequest, NextResponse } from 'next/server'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import fs from 'fs/promises'
import path from 'path'

import { requireFounder } from '@/lib/auth/requireFounder'
import { createAdminClient } from '@/lib/supabase/admin'

type RouteContext = {
  params: Promise<{
    id: string
  }>
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
      timeZone: 'Asia/Jakarta',
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
      timeZone: 'Asia/Jakarta',
    },
  ).format(new Date(value))
}

function getPaymentTypeLabel(
  value: string | null,
) {
  if (!value) return '-'

  const map: Record<string, string> = {
    bank_transfer: 'Bank Transfer',
    bca_va: 'BCA Virtual Account',
    bni_va: 'BNI Virtual Account',
    bri_va: 'BRI Virtual Account',
    permata_va:
      'Permata Virtual Account',
    credit_card: 'Kartu Kredit',
    gopay: 'GoPay',
    shopeepay: 'ShopeePay',
    qris: 'QRIS',
    cstore: 'Convenience Store',
    echannel: 'E-Channel',
  }

  return map[value] ?? value
}

export async function GET(
  _request: NextRequest,
  context: RouteContext,
) {
  const auth = await requireFounder()

  if (!auth.authorized) {
    return auth.response
  }

  try {
    const { id } =
      await context.params

    if (!id) {
      return NextResponse.json(
        {
          error:
            'ID transaksi tidak valid.',
        },
        { status: 400 },
      )
    }

    const admin = createAdminClient()

    /*
     * ============================================================
     * TRANSACTION
     * ============================================================
     */

    const {
      data: transaction,
      error: transactionError,
    } = await admin
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
      .eq('id', id)
      .maybeSingle()

    if (transactionError) {
      console.error(
        'RECEIPT TRANSACTION ERROR:',
        transactionError,
      )

      return NextResponse.json(
        {
          error:
            'Gagal mengambil transaksi.',
        },
        { status: 500 },
      )
    }

    if (!transaction) {
      return NextResponse.json(
        {
          error:
            'Transaksi tidak ditemukan.',
        },
        { status: 404 },
      )
    }

    /*
     * Struk hanya untuk pembayaran berhasil.
     */
    const successful =
      transaction.transaction_status ===
        'settlement' ||
      transaction.transaction_status ===
        'capture'

    if (!successful) {
      return NextResponse.json(
        {
          error:
            'Struk hanya tersedia untuk pembayaran yang berhasil.',
        },
        { status: 400 },
      )
    }

    /*
     * ============================================================
     * BILL
     * ============================================================
     */

    const {
      data: bill,
      error: billError,
    } = await admin
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
      .eq(
        'id',
        transaction.spp_bill_id,
      )
      .maybeSingle()

    if (billError) {
      console.error(
        'RECEIPT BILL ERROR:',
        billError,
      )

      return NextResponse.json(
        {
          error:
            'Gagal mengambil tagihan.',
        },
        { status: 500 },
      )
    }

    if (!bill) {
      return NextResponse.json(
        {
          error:
            'Tagihan tidak ditemukan.',
        },
        { status: 404 },
      )
    }

    /*
     * ============================================================
     * STUDENT
     * ============================================================
     */

    const {
      data: student,
      error: studentError,
    } = await admin
      .from('students')
      .select(`
        id,
        student_name,
        grade_level,
        school_name
      `)
      .eq('id', bill.student_id)
      .maybeSingle()

    if (studentError) {
      console.error(
        'RECEIPT STUDENT ERROR:',
        studentError,
      )

      return NextResponse.json(
        {
          error:
            'Gagal mengambil data siswa.',
        },
        { status: 500 },
      )
    }

    /*
     * ============================================================
     * CREATE PDF
     *
     * Ukuran:
     * 80 mm thermal receipt
     *
     * 1 mm ≈ 2.83465 pt
     * 80 mm ≈ 226.77 pt
     * ============================================================
     */

    const width = 226.77

    const height = 520

    const pdfDoc =
      await PDFDocument.create()

    const page =
      pdfDoc.addPage([
        width,
        height,
      ])

    const regularFont =
      await pdfDoc.embedFont(
        StandardFonts.Helvetica,
      )

    const boldFont =
      await pdfDoc.embedFont(
        StandardFonts.HelveticaBold,
      )

    /*
     * ============================================================
     * LOGO
     *
     * Letakkan logo di:
     *
     * public/nagala-logo.png
     *
     * Kalau tidak ditemukan,
     * fallback ke tulisan NAGALA EDUCATION.
     * ============================================================
     */

    let logoLoaded = false

    try {
      const logoPath =
        path.join(
          process.cwd(),
          'public',
          'nagala-logo.png',
        )

      const logoBytes =
        await fs.readFile(
          logoPath,
        )

      const logo =
        await pdfDoc.embedPng(
          logoBytes,
        )

      const logoScale = 0.28

      const logoWidth =
        logo.width * logoScale

      const logoHeight =
        logo.height * logoScale

      page.drawImage(logo, {
        x:
          (width -
            logoWidth) /
          2,
        y:
          height -
          logoHeight -
          25,
        width: logoWidth,
        height: logoHeight,
      })

      logoLoaded = true
    } catch {
      logoLoaded = false
    }

    let cursorY = logoLoaded
      ? height - 75
      : height - 35

    const centerText = (
      text: string,
      size: number,
      font = regularFont,
    ) => {
      const textWidth =
        font.widthOfTextAtSize(
          text,
          size,
        )

      page.drawText(text, {
        x:
          (width -
            textWidth) /
          2,
        y: cursorY,
        size,
        font,
        color: rgb(
          0.07,
          0.09,
          0.12,
        ),
      })

      cursorY -=
        size + 6
    }

    const drawLine = () => {
      page.drawLine({
        start: {
          x: 15,
          y: cursorY,
        },
        end: {
          x: width - 15,
          y: cursorY,
        },
        thickness: 0.6,
        color: rgb(
          0.75,
          0.75,
          0.75,
        ),
      })

      cursorY -= 12
    }

    const drawRow = (
      label: string,
      value: string,
      options?: {
        boldValue?: boolean
      },
    ) => {
      const labelSize = 8
      const valueSize = 8

      page.drawText(
        label,
        {
          x: 15,
          y: cursorY,
          size: labelSize,
          font: regularFont,
          color: rgb(
            0.35,
            0.35,
            0.35,
          ),
        },
      )

      const valueFont =
        options?.boldValue
          ? boldFont
          : regularFont

      const valueWidth =
        valueFont.widthOfTextAtSize(
          value,
          valueSize,
        )

      page.drawText(
        value,
        {
          x:
            width -
            15 -
            valueWidth,
          y: cursorY,
          size: valueSize,
          font: valueFont,
          color: rgb(
            0.07,
            0.09,
            0.12,
          ),
        },
      )

      cursorY -= 17
    }

    /*
     * ============================================================
     * HEADER
     * ============================================================
     */

    if (!logoLoaded) {
      centerText(
        'NAGALA EDUCATION',
        15,
        boldFont,
      )
    }

    centerText(
      'BUKTI PEMBAYARAN',
      10,
      boldFont,
    )

    centerText(
      'SPP',
      9,
      regularFont,
    )

    cursorY -= 3

    drawLine()

    /*
     * ============================================================
     * STATUS
     * ============================================================
     */

    centerText(
      'PEMBAYARAN BERHASIL',
      9,
      boldFont,
    )

    cursorY -= 3

    page.drawText(
      formatRupiah(
        Number(
          transaction.gross_amount ??
            bill.amount,
        ),
      ),
      {
        x:
          15,
        y: cursorY,
        size: 16,
        font: boldFont,
        color: rgb(
          0.05,
          0.45,
          0.25,
        ),
      },
    )

    cursorY -= 28

    drawLine()

    /*
     * ============================================================
     * STUDENT
     * ============================================================
     */

    page.drawText(
      'DATA SISWA',
      {
        x: 15,
        y: cursorY,
        size: 8,
        font: boldFont,
        color: rgb(
          0.15,
          0.15,
          0.15,
        ),
      },
    )

    cursorY -= 17

    drawRow(
      'Nama',
      student?.student_name ??
        '-',
      {
        boldValue: true,
      },
    )

    drawRow(
      'Kelas',
      student?.grade_level ??
        '-',
    )

    drawRow(
      'Sekolah',
      student?.school_name ??
        '-',
    )

    cursorY -= 3

    drawLine()

    /*
     * ============================================================
     * PAYMENT
     * ============================================================
     */

    page.drawText(
      'DETAIL PEMBAYARAN',
      {
        x: 15,
        y: cursorY,
        size: 8,
        font: boldFont,
        color: rgb(
          0.15,
          0.15,
          0.15,
        ),
      },
    )

    cursorY -= 17

    drawRow(
      'Periode',
      formatMonth(
        bill.month_period,
      ),
    )

    drawRow(
      'Nominal',
      formatRupiah(
        Number(
          bill.amount,
        ),
      ),
      {
        boldValue: true,
      },
    )

    drawRow(
      'Metode',
      getPaymentTypeLabel(
        transaction.payment_type,
      ),
    )

    drawRow(
      'Tanggal',
      formatDate(
        transaction.settlement_time ??
          transaction.transaction_time,
      ),
    )

    cursorY -= 3

    drawLine()

    /*
     * ============================================================
     * IDENTIFIERS
     * ============================================================
     */

    page.drawText(
      'REFERENSI TRANSAKSI',
      {
        x: 15,
        y: cursorY,
        size: 8,
        font: boldFont,
        color: rgb(
          0.15,
          0.15,
          0.15,
        ),
      },
    )

    cursorY -= 17

    /*
     * Karena Order ID / Transaction ID
     * bisa panjang, kita buat wrapping
     * sederhana.
     */

    const drawWrappedRow = (
      label: string,
      value: string,
    ) => {
      page.drawText(
        label,
        {
          x: 15,
          y: cursorY,
          size: 7,
          font: regularFont,
          color: rgb(
            0.35,
            0.35,
            0.35,
          ),
        },
      )

      cursorY -= 11

      const maxWidth =
        width - 30

      const words =
        value.split(' ')

      let currentLine = ''

      for (const word of words) {
        const test =
          currentLine.length > 0
            ? `${currentLine} ${word}`
            : word

        const testWidth =
          regularFont.widthOfTextAtSize(
            test,
            7,
          )

        if (
          testWidth >
            maxWidth &&
          currentLine
        ) {
          page.drawText(
            currentLine,
            {
              x: 15,
              y: cursorY,
              size: 7,
              font: regularFont,
              color: rgb(
                0.12,
                0.12,
                0.12,
              ),
            },
          )

          cursorY -= 10

          currentLine = word
        } else {
          currentLine = test
        }
      }

      if (currentLine) {
        page.drawText(
          currentLine,
          {
            x: 15,
            y: cursorY,
            size: 7,
            font: regularFont,
            color: rgb(
              0.12,
              0.12,
              0.12,
            ),
          },
        )

        cursorY -= 13
      }

      cursorY -= 2
    }

    drawWrappedRow(
      'Order ID',
      bill.order_id,
    )

    drawWrappedRow(
      'Transaction ID',
      transaction.transaction_id ??
        '-',
    )

    cursorY -= 3

    drawLine()

    /*
     * ============================================================
     * VERIFICATION
     * ============================================================
     */

    centerText(
      transaction.signature_verified
        ? '✓ PEMBAYARAN TERVERIFIKASI'
        : 'PEMBAYARAN TERVERIFIKASI',
      8,
      boldFont,
    )

    cursorY -= 3

    centerText(
      'Terima kasih telah melakukan',
      7,
      regularFont,
    )

    centerText(
      'pembayaran SPP melalui',
      7,
      regularFont,
    )

    centerText(
      'Nagala Education',
      7,
      boldFont,
    )

    /*
     * ============================================================
     * PDF BYTES
     * ============================================================
     */

    const pdfBytes =
      await pdfDoc.save()

    const filename =
      `struk-${transaction.transaction_id ?? transaction.id}.pdf`

    return new NextResponse(
  Buffer.from(pdfBytes),
  {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition':
        `attachment; filename="${filename}"`,
      'Cache-Control':
        'no-store, max-age=0',
    },
  },
)
  } catch (error) {
    console.error(
      'GENERATE RECEIPT ERROR:',
      error,
    )

    return NextResponse.json(
      {
        error:
          'Gagal membuat struk PDF.',
      },
      { status: 500 },
    )
  }
}