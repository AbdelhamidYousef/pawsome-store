import type { SVGProps } from 'react';

// Line icons for the homepage hero and trust strip. Decorative (`aria-hidden`): the text next to
// each one says the same thing. Same 24-unit grid and stroke as components/icons.tsx.
type IconProps = SVGProps<SVGSVGElement>;

function Svg({ children, ...rest }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const TruckIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 6h11v10H3zM14 10h4l3 3v3h-7" />
    <circle cx="7" cy="17.5" r="1.8" />
    <circle cx="17.5" cy="17.5" r="1.8" />
  </Svg>
);

export const ReturnIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M9 14L4 9l5-5" />
    <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
  </Svg>
);

export const HeartHandIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 17s-6-3.6-6-8.2A3.3 3.3 0 0 1 12 7a3.3 3.3 0 0 1 6 1.8C18 13.4 12 17 12 17z" />
    <path d="M3 21h18" />
  </Svg>
);

export const LeafIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5 19c0-8 5-13 14-14 0 9-5 14-13 14z" />
    <path d="M5 19l7-7" />
  </Svg>
);

export const ShieldIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3l7 3v5c0 4.5-3 8.2-7 10-4-1.8-7-5.5-7-10V6z" />
    <path d="M9 12l2 2 4-4" />
  </Svg>
);

export const StarIcon = (p: IconProps) => (
  <Svg {...p} fill="currentColor" stroke="none">
    <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z" />
  </Svg>
);

export const ArrowLeftIcon = (p: IconProps) => (
  <Svg {...p} strokeWidth="2">
    <path d="M15 6l-6 6 6 6" />
  </Svg>
);

export const ArrowRightIcon = (p: IconProps) => (
  <Svg {...p} strokeWidth="2">
    <path d="M9 6l6 6-6 6" />
  </Svg>
);
