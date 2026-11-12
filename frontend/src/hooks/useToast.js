import { useState, useCallback } from 'react'

let listeners = []
let toastStore = []
let counter = 0

function dispatch(action) {
  switch (action.type) {
    case 'ADD':
      toastStore = [...toastStore, action.toast]
      break
    case 'REMOVE':
      toastStore = toastStore.filter(t => t.id !== action.id)
      break
  }
  listeners.forEach(l => l(toastStore))
}

export function toast({ title, description, variant = 'default', duration = 4000 }) {
  const id = `toast-${++counter}`
  dispatch({ type: 'ADD', toast: { id, title, description, variant } })
  setTimeout(() => dispatch({ type: 'REMOVE', id }), duration)
  return id
}

export function useToast() {
  const [toasts, setToasts] = useState(toastStore)

  const listener = useCallback((updated) => setToasts([...updated]), [])

  // Register/unregister listener
  useState(() => {
    listeners.push(listener)
    return () => { listeners = listeners.filter(l => l !== listener) }
  })

  return { toasts, toast }
}

