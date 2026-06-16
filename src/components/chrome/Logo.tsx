import logoUrl from "@/assets/logo.svg";
import { cn } from "@/lib/utils";

interface LogoProps {
  size?: number;
  className?: string;
}

/** XJSON 品牌 logo（蓝/紫/青渐变文档 + {X} 大括号） */
export function Logo({ size = 20, className }: LogoProps) {
  return (
    <img
      src={logoUrl}
      width={size}
      height={size}
      alt="XJSON"
      draggable={false}
      className={cn("select-none", className)}
    />
  );
}
