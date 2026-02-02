import { useState } from "react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { WifiOff, Wifi, CheckCircle2, XCircle, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const offlineFeatures = [
  { name: "Live Stats Capture", available: true, description: "Track stats during games" },
  { name: "View Saved Games", available: true, description: "Access previously loaded data" },
  { name: "Settings", available: true, description: "Change app preferences" },
  { name: "Sync New Games", available: false, description: "Requires connection" },
  { name: "Coach Chat", available: false, description: "AI features need internet" },
  { name: "Video Uploads", available: false, description: "Requires connection" },
];

export const OfflineIndicator = () => {
  const { isOnline, wasOffline } = useOnlineStatus();
  const [isDismissed, setIsDismissed] = useState(false);

  // Reset dismissed state when coming back online then going offline again
  const showOfflineBanner = !isOnline && !isDismissed;

  return (
    <AnimatePresence>
      {showOfflineBanner && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="fixed top-0 left-0 right-0 z-[100] bg-amber-500 dark:bg-amber-600 text-amber-950 shadow-lg"
        >
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <WifiOff className="h-5 w-5" />
                <span className="font-medium">You're offline</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm opacity-80">Some features limited</span>
                <button
                  onClick={() => setIsDismissed(true)}
                  className="p-1 rounded-full hover:bg-amber-600/50 dark:hover:bg-amber-700/50 transition-colors"
                  aria-label="Dismiss offline notification"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            
            <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-2">
              {offlineFeatures.map((feature) => (
                <div
                  key={feature.name}
                  className={`flex items-center gap-2 text-sm rounded-lg px-2 py-1.5 ${
                    feature.available
                      ? "bg-amber-400/50 dark:bg-amber-500/30"
                      : "bg-amber-600/30 dark:bg-amber-700/30 opacity-60"
                  }`}
                >
                  {feature.available ? (
                    <CheckCircle2 className="h-4 w-4 text-green-700 dark:text-green-400 shrink-0" />
                  ) : (
                    <XCircle className="h-4 w-4 text-amber-800 dark:text-amber-300 shrink-0" />
                  )}
                  <span className="truncate">{feature.name}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Compact corner indicator when banner is dismissed */}
      {!isOnline && isDismissed && (
        <motion.button
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{ type: "spring", damping: 20, stiffness: 300 }}
          onClick={() => setIsDismissed(false)}
          className="fixed top-4 right-4 z-[100] flex items-center gap-2 bg-amber-500 dark:bg-amber-600 text-amber-950 px-3 py-2 rounded-full shadow-lg hover:scale-110 transition-transform animate-[pulse_2s_cubic-bezier(0.4,0,0.6,1)_infinite]"
          aria-label="You're offline - tap to expand"
        >
          <WifiOff className="h-4 w-4" />
          <span className="text-sm font-medium">Offline</span>
        </motion.button>
      )}

      {isOnline && wasOffline && (
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          className="fixed top-0 left-0 right-0 z-[100] bg-green-500 dark:bg-green-600 text-white shadow-lg"
        >
          <div className="container mx-auto px-4 py-2">
            <div className="flex items-center justify-center gap-2">
              <Wifi className="h-4 w-4" />
              <span className="font-medium">Back online!</span>
              <span className="text-sm opacity-80">Syncing your data...</span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};