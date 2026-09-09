import React from "react";

interface BigButtonProps {
  label: string;
  subLabel?: string;
  icon?: React.ReactNode;
  variant?: "primary" | "crimson" | "amber" | "neutral";
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}

export const BigButton: React.FC<BigButtonProps> = ({
  label,
  subLabel,
  icon,
  variant = "primary",
  onClick,
  disabled = false,
  className = "",
}) => {
  let styleClasses = "bg-teal-700 text-white border-teal-900 active:bg-teal-800";

  if (variant === "crimson") {
    // SOS emergency button
    styleClasses = "bg-red-600 text-white border-red-800 active:bg-red-700 shadow-xl shadow-red-600/30";
  } else if (variant === "amber") {
    // Medication reminder button
    styleClasses = "bg-amber-600 text-white border-amber-800 active:bg-amber-700";
  } else if (variant === "neutral") {
    styleClasses = "bg-stone-100 text-stone-900 border-stone-300 active:bg-stone-200";
  }

  const handleClick = () => {
    // Haptic feedback if supported (mobile devices)
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
    onClick();
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={`big-tap-target w-full flex items-center justify-start sm:justify-center gap-2.5 sm:gap-4 px-3.5 py-3 sm:px-6 sm:py-4 border-2 sm:border-4 rounded-2xl sm:rounded-3xl transition-transform transform active:scale-95 cursor-pointer shadow-md overflow-hidden ${styleClasses} ${className}`}
    >
      {icon && <div className="shrink-0 [&>svg]:w-6 [&>svg]:h-6 sm:[&>svg]:w-8 sm:[&>svg]:h-8">{icon}</div>}
      <div className="flex flex-col text-left min-w-0 flex-1">
        <span className="font-black text-xs sm:text-base md:text-elder-lg leading-tight">{label}</span>
        {subLabel && (
          <span className="text-[10px] sm:text-xs md:text-sm font-normal opacity-90 truncate mt-0.5">{subLabel}</span>
        )}
      </div>
    </button>
  );
};
