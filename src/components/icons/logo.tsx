import type { SVGProps } from 'react';

export function PlantLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="100"
      height="100"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M12 22c-4 0-7-1-7-4 0-1.5 1-3 4-3h6c3 0 4 1.5 4 3 0 3-3 4-7 4z" />
      <path d="M12 15V8" />
      <path d="M12 8c0-3.5 2.5-6 6-6" />
      <path d="M15.5 8a3.5 3.5 0 0 1-3.5-3.5" />
      <path d="M6 8c0 3.5-2.5 6-6 6" />
      <path d="M8.5 8a3.5 3.5 0 0 0 3.5-3.5" />
    </svg>
  );
}
