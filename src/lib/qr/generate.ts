import QRCode from 'qrcode';

export async function qrPngDataUrl(text: string) {
  return await QRCode.toDataURL(text, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 384,
  });
}

