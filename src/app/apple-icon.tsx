import { ImageResponse } from 'next/og';

export const size = {
  width: 180,
  height: 180,
};

export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0B0B0E',
          borderRadius: 40,
        }}
      >
        <svg width="120" height="120" viewBox="0 0 24 24" fill="none">
          <path
            d="M8 2v3M16 2v3M3.5 9h17"
            stroke="#7C3AED"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <path
            d="M6.5 5h11A3.5 3.5 0 0 1 21 8.5v10A3.5 3.5 0 0 1 17.5 22h-11A3.5 3.5 0 0 1 3 18.5v-10A3.5 3.5 0 0 1 6.5 5Z"
            stroke="#7C3AED"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <path
            d="M7.5 12.5h2v2h-2v-2ZM11 12.5h2v2h-2v-2ZM14.5 12.5h2v2h-2v-2ZM7.5 16h2v2h-2v-2ZM11 16h2v2h-2v-2Z"
            fill="#7C3AED"
            opacity="0.95"
          />
        </svg>
      </div>
    ),
    size
  );
}

