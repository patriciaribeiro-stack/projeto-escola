import type { SVGProps } from 'react'

const base = (props: SVGProps<SVGSVGElement>) => ({
  viewBox: '0 0 24 24',
  fill: 'none' as const,
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  ...props,
})

export const IconHome = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M3 11 12 4l9 7M5.5 10V20h13V10" /></svg>
)
export const IconPerson = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><circle cx="12" cy="8" r="3.6" /><path d="M4.5 20c0-4.4 3.4-7 7.5-7s7.5 2.6 7.5 7" /></svg>
)
export const IconBuilding = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <rect x="5" y="3" width="14" height="18" rx="1" />
    <path d="M8 7h.01M12 7h.01M16 7h.01M8 11.5h.01M12 11.5h.01M16 11.5h.01" strokeWidth={2.4} />
    <rect x="10" y="15.5" width="4" height="5.5" />
  </svg>
)
export const IconChat = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M4 5.5A2 2 0 0 1 6 3.5h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H9l-5 4.5V5.5z" /></svg>
)
export const IconCheck = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="8.2" /><path d="M8.3 12.3l2.6 2.6 5-5.4" /></svg>
)
export const IconPlus = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
)
export const IconUsers = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <circle cx="9" cy="8.3" r="3.1" /><path d="M3.5 20c0-3.7 2.6-5.9 5.5-5.9s5.5 2.2 5.5 5.9" />
    <circle cx="17" cy="9" r="2.3" strokeWidth={1.6} /><path d="M15.3 14.3c2.6-.5 5 1.2 5.2 4.4" strokeWidth={1.6} />
  </svg>
)
export const IconGrid = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <rect x="4" y="4" width="7" height="7" rx="1" /><rect x="13" y="4" width="7" height="7" rx="1" />
    <rect x="4" y="13" width="7" height="7" rx="1" /><rect x="13" y="13" width="7" height="7" rx="1" />
  </svg>
)
export const IconEdit = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M5 19.5h4L18.5 10 15 6.5 5.5 16v3.5z" /><line x1="13.2" y1="8.3" x2="16.7" y2="11.8" /></svg>
)
export const IconBell = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M6.3 9.5a5.7 5.7 0 0 1 11.4 0v4.3l1.8 2.7H4.5l1.8-2.7V9.5z" /><path d="M10 19a2 2 0 0 0 4 0" /></svg>
)
export const IconChart = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><rect x="5" y="12" width="3.4" height="7.5" /><rect x="10.3" y="7.5" width="3.4" height="12" /><rect x="15.6" y="4" width="3.4" height="15.5" /></svg>
)
export const IconCamera = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M4 8.5a1.5 1.5 0 0 1 1.5-1.5h1.6l1-1.6h7.8l1 1.6h1.6A1.5 1.5 0 0 1 20 8.5V18a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18V8.5z" />
    <circle cx="12" cy="13" r="3.3" />
  </svg>
)
export const IconBook = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M4 5.5c2-1 5-1 8 .3V19c-3-1.3-6-1.3-8-.3V5.5z" /><path d="M20 5.5c-2-1-5-1-8 .3V19c3-1.3 6-1.3 8-.3V5.5z" />
  </svg>
)
export const IconChevron = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M9 6l6 6-6 6" /></svg>
)
export const IconPin = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M12 21s-6.5-6.1-6.5-11A6.5 6.5 0 0 1 18.5 10c0 4.9-6.5 11-6.5 11z" /><circle cx="12" cy="10" r="2.1" strokeWidth={1.6} /></svg>
)
export const IconUtensils = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M7 3v7a1.5 1.5 0 0 0 3 0V3M8.5 10V21M16.5 3c-1.4 0-2.5 1.8-2.5 4s1.1 4 2.5 4 2.5-1.8 2.5-4-1.1-4-2.5-4zM16.5 11v10" />
  </svg>
)
export const IconBag = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M6 8h12l1 12a1.5 1.5 0 0 1-1.5 1.6h-11A1.5 1.5 0 0 1 5 20L6 8z" />
    <path d="M9 8V6.5a3 3 0 0 1 6 0V8" />
  </svg>
)
export const IconClose = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><line x1="6" y1="6" x2="18" y2="18" /><line x1="18" y1="6" x2="6" y2="18" /></svg>
)
export const IconAlert = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M12 3.5 2 20.5h20L12 3.5z" /><line x1="12" y1="10" x2="12" y2="14.5" /><path d="M12 17.2h.01" strokeWidth={2.4} /></svg>
)
export const IconClock = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="8.3" /><path d="M12 7.5V12l3 2" /></svg>
)
export const IconArrowLeft = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M15 5l-7 7 7 7" /></svg>
)
export const IconLogout = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M9 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h3M15 16l4-4-4-4M19 12H9" /></svg>
)
export const IconDownload = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M12 3.5v11M7.5 10.5 12 15l4.5-4.5M5 19h14" /></svg>
)
export const IconCalendar = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <rect x="3.5" y="5" width="17" height="15" rx="2" />
    <path d="M3.5 9.5h17M8 3v3.5M16 3v3.5" />
    <path d="M7.5 13.2h.01M12 13.2h.01M16.5 13.2h.01M7.5 16.5h.01M12 16.5h.01" strokeWidth={2.4} />
  </svg>
)
export const IconCross = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M12 4.5v15M4.5 12h15" strokeWidth={2.6} />
  </svg>
)
export const IconSettings = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 3.5v2.2M12 18.3v2.2M20.5 12h-2.2M5.7 12H3.5M17.7 6.3l-1.6 1.6M7.9 16.1l-1.6 1.6M17.7 17.7l-1.6-1.6M7.9 7.9 6.3 6.3" />
  </svg>
)
export const IconFolder = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M3.5 6.8a1.3 1.3 0 0 1 1.3-1.3h4l1.8 2h8.6a1.3 1.3 0 0 1 1.3 1.3v8.4a1.3 1.3 0 0 1-1.3 1.3H4.8a1.3 1.3 0 0 1-1.3-1.3V6.8z" /></svg>
)
export const IconMic = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <rect x="9" y="3.5" width="6" height="11" rx="3" />
    <path d="M5.5 11.5a6.5 6.5 0 0 0 13 0" />
    <line x1="12" y1="18" x2="12" y2="21" />
    <line x1="8.5" y1="21" x2="15.5" y2="21" />
  </svg>
)
export const IconHeart = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M20.42 4.58a5.4 5.4 0 0 0-7.65 0l-.77.78-.77-.78a5.4 5.4 0 0 0-7.65 7.65l.77.78L12 20.66l7.65-7.65.77-.78a5.4 5.4 0 0 0 0-7.65z" /></svg>
)
export const IconFileCheck = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /><path d="M9 15l2 2 4-4" /></svg>
)
export const IconHistory = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M3 3v5h5" /><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8" /><path d="M12 7v5l4 2" /></svg>
)
