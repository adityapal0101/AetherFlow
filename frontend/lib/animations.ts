import type { Variants } from 'framer-motion';

export const floatUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, ease: 'easeOut' },
};

export const zeroG = {
  animate: { y: [0, -8, 0] },
  transition: { duration: 3, repeat: Infinity, ease: 'easeInOut' },
};

export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  transition: { duration: 0.3 },
};

export const slideIn = {
  initial: { opacity: 0, x: -12 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, height: 0 },
  transition: { duration: 0.25 },
};

export const stagger = (i: number) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { delay: i * 0.08, duration: 0.35 },
});

export const pulse = {
  animate: { scale: [1, 1.04, 1] },
  transition: { duration: 2, repeat: Infinity },
};

export const successPop: Variants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 300, damping: 20 } },
  exit: { opacity: 0, scale: 0.8, transition: { duration: 0.2 } },
};

export const toastSlide: Variants = {
  hidden: { opacity: 0, y: 16, scale: 0.95 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 260, damping: 22 } },
  exit: { opacity: 0, y: 8, scale: 0.95, transition: { duration: 0.2 } },
};
