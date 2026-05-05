import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export type AppointmentCardInput = {
  tenantName: string;
  clientName: string;
  serviceName: string | null;
  staffName: string | null;
  whenText: string;
  whereText: string;
  qrPngBytes: Uint8Array;
};

export async function generateAppointmentCardPdf(input: AppointmentCardInput) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([612, 396]); // 8.5x5.5 in at 72dpi

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const padding = 32;
  const left = padding;
  const top = page.getHeight() - padding;

  page.drawText(input.tenantName, {
    x: left,
    y: top - 18,
    size: 16,
    font: fontBold,
    color: rgb(0.05, 0.05, 0.05),
  });

  page.drawText('Appointment Card', {
    x: left,
    y: top - 42,
    size: 11,
    font,
    color: rgb(0.35, 0.35, 0.35),
  });

  const bodyY = top - 90;
  const line = (label: string, value: string, y: number) => {
    page.drawText(label, { x: left, y, size: 10, font, color: rgb(0.35, 0.35, 0.35) });
    page.drawText(value, { x: left + 80, y, size: 11, font: fontBold, color: rgb(0.1, 0.1, 0.1) });
  };

  line('Who', input.clientName, bodyY);
  line('What', input.serviceName ?? '—', bodyY - 22);
  line('Staff', input.staffName ?? '—', bodyY - 44);
  line('When', input.whenText, bodyY - 66);
  line('Where', input.whereText, bodyY - 88);

  const qrImage = await pdfDoc.embedPng(input.qrPngBytes);
  const qrSize = 120;
  const qrX = page.getWidth() - padding - qrSize;
  const qrY = padding + 28;
  page.drawImage(qrImage, { x: qrX, y: qrY, width: qrSize, height: qrSize });
  page.drawText('Scan to check in', {
    x: qrX,
    y: qrY - 14,
    size: 9,
    font,
    color: rgb(0.35, 0.35, 0.35),
  });

  return await pdfDoc.save();
}

