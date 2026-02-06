import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface PullToRefreshIndicatorProps {
  pullDistance: number;
  isRefreshing: boolean;
  progress: number;
}

export function PullToRefreshIndicator({
  pullDistance,
  isRefreshing,
  progress,
}: PullToRefreshIndicatorProps) {
  if (pullDistance === 0 && !isRefreshing) return null;

  return (
    <div
      className="absolute left-0 right-0 flex justify-center items-center z-50 pointer-events-none"
      style={{ 
        top: 0,
        height: pullDistance,
        transition: isRefreshing ? "none" : "height 0.2s ease-out"
      }}
    >
      <div
        className={cn(
          "flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 backdrop-blur-sm border border-primary/20",
          isRefreshing && "animate-pulse"
        )}
        style={{
          opacity: Math.min(progress, 1),
          transform: `scale(${0.5 + progress * 0.5})`,
        }}
      >
        <RefreshCw
          className={cn(
            "w-5 h-5 text-primary transition-transform",
            isRefreshing && "animate-spin"
          )}
          style={{
            transform: isRefreshing ? undefined : `rotate(${progress * 360}deg)`,
          }}
        />
      </div>
    </div>
  );
}
