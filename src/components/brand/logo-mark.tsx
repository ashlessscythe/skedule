import type { SVGProps } from 'react';

export function LogoMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      {...props}
      className={['text-primary', props.className].filter(Boolean).join(' ')}
    >
      <path
        d="M8 2v3M16 2v3M3.5 9h17"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M6.5 5h11A3.5 3.5 0 0 1 21 8.5v10A3.5 3.5 0 0 1 17.5 22h-11A3.5 3.5 0 0 1 3 18.5v-10A3.5 3.5 0 0 1 6.5 5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M7.5 12.5h2v2h-2v-2ZM11 12.5h2v2h-2v-2ZM14.5 12.5h2v2h-2v-2ZM7.5 16h2v2h-2v-2ZM11 16h2v2h-2v-2Z"
        fill="currentColor"
        opacity="0.9"
      />
    </svg>
  );
}

