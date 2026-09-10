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
  let styleClasses = "bg-gradient-to-br from-teal-500 to-teal-700 text-white border-teal-800 shadow-teal-700/30 active:from-teal-600 active:to-teal-800";

  if (variant === "crimson") {
    // SOS emergency button - high alert styling
    styleClasses = "bg-gradient-to-br from-red-500 to-red-700 text-white border-red-800 shadow-red-600/40 active:from-red-600 active:to-red-800 animate-glow-pulse";
  } else if (variant === "amber") {
    // Medication reminder button
    styleClasses = "bg-gradient-to-br from-amber-400 to-amber-600 text-white border-amber-700 shadow-amber-500/30 active:from-amber-500 active:to-amber-700";
  } else if (variant === "neutral") {
    // Regular buttons with a soft gradient
    styleClasses = "bg-gradient-to-br from-stone-50 to-stone-200 text-stone-800 border-stone-300 shadow-stone-300/30 active:from-stone-100 active:to-stone-300";
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
      className={`big-tap-target w-full h-full min-h-[96px] flex flex-col items-center justify-center gap-1.5 sm:gap-2 p-3 sm:p-5 border-b-[6px] border-r-[2px] border-l-[2px] border-t-[2px] rounded-2xl sm:rounded-[2rem] transition-all duration-150 transform active:scale-[0.98] active:border-b-[2px] active:translate-y-[4px] cursor-pointer shadow-lg overflow-hidden relative ${styleClasses} ${className}`}
    >
      {/* Glassy reflection top */}
      <div className="absolute top-0 left-0 right-0 h-1/3 bg-gradient-to-b from-white/20 to-transparent pointer-events-none rounded-t-2xl sm:rounded-t-[2rem]" />
      
      {icon && (
        <div className="shrink-0 [&>svg]:w-8 [&>svg]:h-8 sm:[&>svg]:w-10 sm:[&>svg]:h-10 drop-shadow-md z-10">
          {icon}
        </div>
      )}
      
      <div className="flex flex-col text-center min-w-0 w-full z-10">
        <span className="font-black text-elder-base sm:text-elder-lg leading-tight tracking-tight drop-shadow-sm">{label}</span>
        {subLabel && (
          <span className="text-elder-sm font-bold opacity-90 truncate mt-1">{subLabel}</span>
        )}
      </div>
    </button>
  );
};
