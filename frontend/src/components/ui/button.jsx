import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva } from 'class-variance-authority'
import { cn } from '../../utils/cn.js'

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-indigo/40 focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] select-none',
  {
    variants: {
      variant: {
        default:     'bg-slate-900 text-white hover:bg-slate-800 shadow-xs',
        indigo:      'bg-[#635BFF] text-white hover:bg-[#5348F2] shadow-xs shadow-indigo-500/20',
        destructive: 'bg-rose-600 text-white hover:bg-rose-700 shadow-xs shadow-rose-500/20',
        outline:     'border border-slate-200/90 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-xs',
        secondary:   'bg-slate-100 text-slate-800 hover:bg-slate-200/70',
        ghost:       'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 active:bg-slate-200/50',
        link:        'text-[#635BFF] underline-offset-4 hover:underline p-0 h-auto',
      },
      size: {
        default: 'h-9 px-3.5 py-2 text-xs font-semibold',
        sm:      'h-8 rounded-md px-2.5 text-xs font-medium',
        lg:      'h-10 rounded-lg px-5 text-sm font-semibold',
        icon:    'h-8 w-8 rounded-lg',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  }
)

const Button = React.forwardRef(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : 'button'
  return (
    <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
  )
})
Button.displayName = 'Button'

export { Button, buttonVariants }

