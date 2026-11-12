import { Link } from 'react-router-dom'
import { Button } from '../components/ui/button.jsx'
import { FileQuestion } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="text-center space-y-6 max-w-md">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-muted">
          <FileQuestion className="h-10 w-10 text-muted-foreground" />
        </div>
        <div>
          <h1 className="text-5xl font-bold text-foreground">404</h1>
          <h2 className="text-xl font-semibold mt-2">Page not found</h2>
          <p className="text-muted-foreground mt-2">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild>
            <Link to="/dashboard">Go to Dashboard</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/login">Sign in</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}

