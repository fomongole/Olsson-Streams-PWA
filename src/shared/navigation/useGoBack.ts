import { useNavigate } from 'react-router-dom'

/**
 * Android always has a back stack; a PWA opened straight from a shared link
 * does not, and `navigate(-1)` would silently do nothing. Fall back to Home.
 */
export function useGoBack(): () => void {
  const navigate = useNavigate()
  return () => {
    if (window.history.length > 1) void navigate(-1)
    else void navigate('/')
  }
}
