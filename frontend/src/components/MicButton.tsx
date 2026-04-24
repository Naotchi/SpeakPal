"use client";

type MicState = "idle" | "recording" | "processing";
type Variant = "primary" | "translate";
type Size = "md" | "sm";

interface MicButtonProps {
  state: MicState;
  onClick: () => void;
  disabled?: boolean;
  variant?: Variant;
  size?: Size;
}

const idleBgByVariant: Record<Variant, string> = {
  primary: "bg-blue-600 hover:bg-blue-700",
  translate: "bg-emerald-600 hover:bg-emerald-700",
};

const sizeClassBySize: Record<Size, string> = {
  md: "w-16 h-16",
  sm: "w-11 h-11",
};

const iconClassBySize: Record<Size, string> = {
  md: "w-7 h-7",
  sm: "w-5 h-5",
};

export function MicButton({
  state,
  onClick,
  disabled = false,
  variant = "primary",
  size = "md",
}: MicButtonProps) {
  const isBusy = state === "processing";
  const isDisabled = isBusy || disabled;

  const bgClass =
    state === "recording"
      ? "bg-red-500 hover:bg-red-600 animate-pulse"
      : state === "processing"
        ? "bg-gray-400 cursor-not-allowed"
        : disabled
          ? "bg-gray-300 cursor-not-allowed"
          : idleBgByVariant[variant];

  const sizeClass = sizeClassBySize[size];
  const iconClass = iconClassBySize[size];

  return (
    <button
      onClick={onClick}
      disabled={isDisabled}
      className={`${sizeClass} rounded-full flex items-center justify-center transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-blue-300 ${bgClass}`}
      aria-label={
        state === "recording"
          ? "停止"
          : state === "processing"
            ? "処理中"
            : variant === "translate"
              ? "日本語で話す"
              : "英語で話す"
      }
    >
      {state === "processing" ? (
        <svg className={`${iconClass} text-white animate-spin`} fill="none" viewBox="0 0 24 24">
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      ) : state === "recording" ? (
        <svg className={`${iconClass} text-white`} fill="currentColor" viewBox="0 0 24 24">
          <rect x="6" y="6" width="12" height="12" rx="2" />
        </svg>
      ) : (
        <svg className={`${iconClass} text-white`} fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
          <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
        </svg>
      )}
    </button>
  );
}
