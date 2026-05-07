import { describe, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { generateAppointmentCardPdf } from './appointment-card';

const TINY_PNG_BYTES = Uint8Array.from(
  Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMB/6X9ZQAAAABJRU5ErkJggg==',
    'base64'
  )
);

describe('generateAppointmentCardPdf', () => {
  it('generates a loadable single-page PDF', async () => {
    const bytes = await generateAppointmentCardPdf({
      tenantName: 'Acme',
      clientName: 'Pat Kim',
      serviceName: 'Consult',
      staffName: 'Dr. Smith',
      whenText: 'Monday 10:00 AM',
      whereText: 'Main St',
      qrPngBytes: TINY_PNG_BYTES,
    });

    expect(bytes.length).toBeGreaterThan(200);
    const loaded = await PDFDocument.load(bytes);
    expect(loaded.getPageCount()).toBe(1);
  });
});

