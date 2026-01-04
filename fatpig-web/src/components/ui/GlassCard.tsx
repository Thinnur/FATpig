import React from "react";

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  hoverEffect?: boolean;
  onClick?: () => void;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className = "",
  hoverEffect = false,
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      className={`
        relative overflow-hidden
        backdrop-blur-2xl 
        bg-white/70 dark:bg-[#1C1C1E]/80 
        border border-white/40 dark:border-white/10
        shadow-sm dark:shadow-none
        rounded-[28px] 
        transition-all duration-300 ease-out
        ${
          hoverEffect
            ? "hover:scale-[1.02] active:scale-[0.98] cursor-pointer hover:bg-white/80 dark:hover:bg-[#2C2C2E]"
            : ""
        }
        ${className}
      `}
    >
      {/* Efek Kilauan Kaca (Glossy) */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/50 to-transparent opacity-50"></div>
      {children}
    </div>
  );
};
