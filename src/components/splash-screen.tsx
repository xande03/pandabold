import { motion, AnimatePresence } from "framer-motion";

interface SplashScreenProps {
  show: boolean;
}

export function SplashScreen({ show }: SplashScreenProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="splash"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[hsl(222,47%,8%)]"
        >
          {/* Ambient glow */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-[hsl(24,94%,53%/0.08)] blur-[120px]" />
          </div>

          {/* Logo + Text */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="relative flex flex-col items-center gap-6"
          >
            {/* Icon */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.15, duration: 0.5 }}
              className="flex h-20 w-20 items-center justify-center rounded-2xl shadow-2xl"
              style={{
                background: "linear-gradient(135deg, hsl(24,94%,53%), hsl(0,84%,60%))",
                boxShadow: "0 0 60px hsl(24 94% 53% / 0.4)",
              }}
            >
              <span className="text-4xl">🐼</span>
            </motion.div>

            {/* Brand name */}
            <motion.div
              initial={{ y: 16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="flex flex-col items-center gap-1"
            >
              <span
                className="text-3xl font-black tracking-tight"
                style={{
                  background: "linear-gradient(135deg, hsl(24,94%,53%), hsl(0,84%,60%))",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                Panda Bold
              </span>
            </motion.div>

            {/* Loading bar */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="w-40 h-0.5 rounded-full overflow-hidden bg-white/10 mt-4"
            >
              <motion.div
                initial={{ x: "-100%" }}
                animate={{ x: "100%" }}
                transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
                className="h-full w-1/2 rounded-full"
                style={{
                  background: "linear-gradient(90deg, transparent, hsl(24,94%,53%), transparent)",
                }}
              />
            </motion.div>
          </motion.div>

          {/* Footer credit */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            className="absolute bottom-10 text-xs font-medium tracking-[0.25em] uppercase"
            style={{ color: "hsl(210,40%,50%)" }}
          >
            AMTECH STÚDIO
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
