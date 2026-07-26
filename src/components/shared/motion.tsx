'use client'

import * as React from 'react'
import {
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type Variants,
} from 'framer-motion'

import { cn } from '@/lib/utils'

/**
 * Motion helpers shared across the marketing and product surfaces.
 *
 * Every one of them collapses to a no-op under `prefers-reduced-motion`, so the
 * animation layer is additive rather than load-bearing.
 */

const EASE = [0.22, 1, 0.36, 1] as const

/** Fades and lifts a block into place the first time it enters the viewport. */
export function Reveal({
  children,
  delay = 0,
  y = 22,
  className,
  once = true,
  as = 'div',
}: {
  children: React.ReactNode
  delay?: number
  y?: number
  className?: string
  once?: boolean
  as?: 'div' | 'section' | 'li' | 'article' | 'header'
}) {
  const reduce = useReducedMotion()
  const Component = motion[as]

  return (
    <Component
      className={className}
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once, margin: '-12% 0px -8% 0px' }}
      transition={{ duration: 0.75, delay, ease: EASE }}
    >
      {children}
    </Component>
  )
}

/** Staggers direct children — pair with `RevealItem`. */
export function RevealGroup({
  children,
  className,
  stagger = 0.08,
  delay = 0,
}: {
  children: React.ReactNode
  className?: string
  stagger?: number
  delay?: number
}) {
  const reduce = useReducedMotion()

  const variants: Variants = {
    hidden: {},
    show: {
      transition: { staggerChildren: reduce ? 0 : stagger, delayChildren: delay },
    },
  }

  return (
    <motion.div
      className={className}
      variants={variants}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-10% 0px' }}
    >
      {children}
    </motion.div>
  )
}

export function RevealItem({
  children,
  className,
  y = 20,
}: {
  children: React.ReactNode
  className?: string
  y?: number
}) {
  const reduce = useReducedMotion()

  const variants: Variants = {
    hidden: reduce ? { opacity: 1 } : { opacity: 0, y },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.7, ease: EASE },
    },
  }

  return (
    <motion.div className={className} variants={variants}>
      {children}
    </motion.div>
  )
}

/**
 * Very restrained parallax — the image drifts a few percent against the scroll.
 * Anything stronger reads as a gimmick at this scale.
 */
export function Parallax({
  children,
  distance = 40,
  className,
}: {
  children: React.ReactNode
  distance?: number
  className?: string
}) {
  const reduce = useReducedMotion()
  const ref = React.useRef<HTMLDivElement>(null)

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  })

  const smooth = useSpring(scrollYProgress, {
    stiffness: 90,
    damping: 30,
    mass: 0.4,
  })
  const y = useTransform(smooth, [0, 1], [distance, -distance])

  return (
    <div ref={ref} className={cn('will-change-transform', className)}>
      <motion.div style={reduce ? undefined : { y }}>{children}</motion.div>
    </div>
  )
}

/** Word-by-word entrance for the hero headline. */
export function SplitHeading({
  text,
  className,
  delay = 0,
}: {
  text: string
  className?: string
  delay?: number
}) {
  const reduce = useReducedMotion()
  const words = text.split(' ')

  if (reduce) return <span className={className}>{text}</span>

  return (
    <span className={className}>
      {words.map((word, i) => (
        <span
          key={`${word}-${i}`}
          className="inline-block overflow-hidden align-bottom"
        >
          <motion.span
            className="inline-block"
            initial={{ y: '105%', opacity: 0 }}
            animate={{ y: '0%', opacity: 1 }}
            transition={{
              duration: 0.95,
              delay: delay + i * 0.06,
              ease: EASE,
            }}
          >
            {word}
            {i < words.length - 1 ? ' ' : ''}
          </motion.span>
        </span>
      ))}
    </span>
  )
}

export { motion, EASE }
