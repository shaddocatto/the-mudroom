// Simple, consistent line icons in the mudroom's own vernacular — a door,
// a coat hook, a lamp — rather than generic app-icon-kit glyphs.

const base = {
  width: 24,
  height: 24,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

export function DoorIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M6 21V4a1 1 0 0 1 1-1h7l4 3v15" />
      <path d="M6 21h12" />
      <circle cx="13.5" cy="12.5" r="0.75" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function ChatIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v9A1.5 1.5 0 0 1 18.5 16H10l-4.5 4v-4H5.5A1.5 1.5 0 0 1 4 14.5z" />
    </svg>
  );
}

export function HookIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M12 3v3" />
      <circle cx="12" cy="8" r="1.6" />
      <path d="M8 9c0 3 2 5 4 5s4-2 4-5" />
      <path d="M9 14l-1.5 7" />
      <path d="M15 14l1.5 7" />
    </svg>
  );
}

export function SendIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M4 12l16-7-6 16-2.5-7.5L4 12z" />
    </svg>
  );
}

export function CloseIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export function LampIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M9 3h6l2 7H7l2-7z" />
      <path d="M12 10v4" />
      <path d="M8 21h8" />
      <path d="M9 21c0-2 1-3 3-3s3 1 3 3" />
    </svg>
  );
}

export function CheckIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M5 13l4 4L19 7" />
    </svg>
  );
}

export function LeafIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M5 19c8 0 13-5 13-13 0 0-9-1-12 5-2 4 1 8 1 8z" />
      <path d="M5 19c1-4 3-7 6-9" />
    </svg>
  );
}
