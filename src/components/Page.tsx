import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

export default function Page({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <motion.main
      className={`page ${className ?? ''}`}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.main>
  );
}
