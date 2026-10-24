import { motion, type HTMLMotionProps } from 'framer-motion'
import type { ReactNode } from 'react'
import { springs } from '../motion'
import styles from './Button.module.css'

export interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  variant?: 'primary' | 'secondary' | 'plain'
  size?: 'regular' | 'large'
  block?: boolean
  icon?: ReactNode
  children?: ReactNode
}

export function Button({ variant = 'primary', size = 'regular', block, icon, children, className, type = 'button', ...rest }: ButtonProps) {
  return (
    <motion.button
      type={type}
      className={[styles.btn, styles[variant], styles[size], block ? styles.block : '', className ?? ''].join(' ')}
      whileTap={rest.disabled ? undefined : { scale: 0.97 }}
      transition={springs.snappy}
      {...rest}
    >
      {icon}
      {children != null && <span>{children}</span>}
    </motion.button>
  )
}
