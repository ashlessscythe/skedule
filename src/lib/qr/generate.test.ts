import { describe, expect, it, vi } from 'vitest';
import { qrPngDataUrl } from './generate';
import QRCode from 'qrcode';

vi.mock('qrcode', () => ({
  default: {
    toDataURL: vi.fn(async () => 'data:image/png;base64,AAAA'),
  },
}));

describe('qrPngDataUrl', () => {
  it('calls qrcode with expected options', async () => {
    const url = await qrPngDataUrl('hello');
    expect(url).toMatch(/^data:image\/png/);
    const toDataURL = (QRCode as unknown as { toDataURL: unknown }).toDataURL as ReturnType<
      typeof vi.fn
    >;
    expect(toDataURL).toHaveBeenCalledWith('hello', {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 384,
    });
  });
});

