import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import { Button } from '../components/ui/button.jsx'
import { Badge } from '../components/ui/badge.jsx'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card.jsx'

describe('UI Primitives Unit Tests', () => {
  it('renders Button with variants and handles children', () => {
    render(<Button variant="indigo">Authorize Action</Button>)
    const button = screen.getByRole('button', { name: /authorize action/i })
    expect(button).toBeInTheDocument()
    expect(button.className).toContain('bg-[#635BFF]')
  })

  it('renders Badge with semantic variant classes', () => {
    const { container } = render(<Badge variant="success">Completed</Badge>)
    expect(container.textContent).toBe('Completed')
    expect(container.firstChild.className).toContain('bg-emerald-50')
  })

  it('renders Card with header, title, and content structure', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Spending Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <p>$10,000 Allocated</p>
        </CardContent>
      </Card>
    )
    expect(screen.getByText('Spending Summary')).toBeInTheDocument()
    expect(screen.getByText('$10,000 Allocated')).toBeInTheDocument()
  })
})

