import { WifiOff, Wifi } from "lucide-react";
import { useOnline } from "@/hooks/useOnline";
import { useEffect, useState } from "react";

export function OfflineIndicator() {
  const isOnline = useOnline();
  const [showIndicator, setShowIndicator] = useState(false);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (!isOnline) {
      setShowIndicator(true);
    } else {
      // Show brief success message when coming back online
      setShowIndicator(true);
      timeout = setTimeout(() => setShowIndicator(false), 3000);
    }
    return () => clearTimeout(timeout);
  }, [isOnline]);

  if (!showIndicator) return null;

  return (
    <div
      className={`fixed top-14 sm:top-16 left-0 right-0 z-40 flex items-center gap-2 px-4 py-3 transition-all duration-300 ${
        isOnline
          ? "bg-emerald-500/20 border-b border-emerald-500/30"
          : "bg-orange-500/20 border-b border-orange-500/30"
      }`}
    >
      {isOnline ? (
        <>
          <Wifi className="w-4 h-4 text-emerald-400" />
          <span className="text-sm text-emerald-300">Back online</span>
        </>
      ) : (
        <>
          <WifiOff className="w-4 h-4 text-orange-400" />
          <span className="text-sm text-orange-300">You&apos;re offline</span>
          <span className="text-xs text-orange-300/70 ml-auto">Viewing cached data</span>
        </>
      )}
    </div>
  );
}
