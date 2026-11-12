import * as React from 'react'
import { cva } from 'class-variance-authority'
import { cn } from '../../utils/cn.js'

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium tracking-tight transition-colors focus:outline-none focus:ring-1 focus:ring-ring',
  {
    variants: {
      variant: {
        default:     'border-transparent bg-slate-900 text-white font-semibold',
        secondary:   'border-slate-200/90 bg-slate-50 text-slate-700',
        destructive: 'border-rose-200/70 bg-rose-50 text-rose-700',
        outline:     'border-slate-200 text-slate-600 bg-white/70',
        success:     'border-emerald-200/70 bg-emerald-50 text-emerald-700 font-medium',
        warning:     'border-amber-200/70 bg-amber-50 text-amber-700 font-medium',
        indigo:      'border-indigo-200/70 bg-indigo-50 text-indigo-700 font-medium',
      },
    },
    defaultVariants: { variant: 'default' },
  }
)

function Badge({ className, variant, ...props }) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }

