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
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[hsl(160,50%,4%)]"
        >
          {/* Ambient glow layers */}
          <div className="absolute inset-0 overflow-hidden">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1.2, ease: "easeOut" }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full"
              style={{ background: "radial-gradient(circle, hsl(153,100%,50%,0.12) 0%, transparent 70%)" }}
            />
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              transition={{ duration: 2, delay: 0.3 }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full"
              style={{ background: "radial-gradient(circle, hsl(162,100%,40%,0.06) 0%, transparent 60%)" }}
            />
          </div>

          {/* Main content */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="relative flex flex-col items-center gap-5"
          >
            {/* Panda icon with pulse ring */}
            <motion.div
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
              className="relative"
            >
              {/* Pulse ring */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: [0, 0.5, 0], scale: [0.8, 1.4, 1.6] }}
                transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                className="absolute inset-0 rounded-2xl"
                style={{ background: "linear-gradient(135deg, hsl(153,100%,50%), hsl(162,100%,40%))" }}
              />
              <div
                className="relative flex h-20 w-20 items-center justify-center rounded-2xl shadow-2xl"
                style={{
                    background: "linear-gradient(135deg, hsl(153,100%,50%), hsl(162,100%,40%))",
                  boxShadow: "0 0 60px hsl(153 100% 50% / 0.5), 0 0 120px hsl(162 100% 40% / 0.2)",
                }}
              >
                <span className="text-4xl">🐼</span>
              </div>
            </motion.div>

            {/* Brand name - "Panda Bold" with matching font weight */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.35, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col items-center gap-2"
            >
              <h1
                className="text-4xl font-black tracking-tight"
                style={{
                  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                  fontWeight: 900,
                   background: "linear-gradient(135deg, hsl(153,100%,50%) 0%, hsl(162,100%,40%) 50%, hsl(153,100%,50%) 100%)",
                  backgroundSize: "200% auto",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                Panda Bold
              </h1>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6, duration: 0.5 }}
                className="text-sm font-medium tracking-wider"
                style={{ color: "hsl(210,20%,55%)" }}
              >
                Ferramentas de IA multimodal
              </motion.p>
            </motion.div>

            {/* Loading bar */}
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 160 }}
              transition={{ delay: 0.5, duration: 0.4 }}
              className="h-1 rounded-full overflow-hidden mt-3"
              style={{ background: "hsl(217,33%,17%)" }}
            >
              <motion.div
                initial={{ x: "-100%" }}
                animate={{ x: "100%" }}
                transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut" }}
                className="h-full w-1/2 rounded-full"
                style={{
                  background: "linear-gradient(90deg, transparent, hsl(153,100%,50%), hsl(162,100%,40%), transparent)",
                }}
              />
            </motion.div>
          </motion.div>

          {/* Footer */}
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.5 }}
            className="absolute bottom-10 text-[10px] font-semibold tracking-[0.3em] uppercase"
            style={{ color: "hsl(210,30%,40%)" }}
          >
            AMTECH STÚDIO
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
