import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { qrPngDataUrl } from '@/lib/qr/generate';
import { buildCheckinUrls } from '@/lib/checkin/qr-token';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const qr = await prisma.qrToken.findUnique({
    where: { token },
    select: { expiresAt: true, usedAt: true },
  });

  if (!qr) return NextResponse.json({ error: 'Invalid token' }, { status: 404 });
  if (qr.usedAt) return NextResponse.json({ error: 'Expired' }, { status: 400 });
  if (qr.expiresAt.getTime() < Date.now())
    return NextResponse.json({ error: 'Expired' }, { status: 400 });

  const { checkinUrl } = buildCheckinUrls(token);
  const dataUrl = await qrPngDataUrl(checkinUrl);
  const b64 = dataUrl.split(',')[1] ?? '';
  const pngBytes = Buffer.from(b64, 'base64');

  return new NextResponse(pngBytes, {
    headers: {
      'content-type': 'image/png',
      'cache-control': 'no-store',
    },
  });
}
