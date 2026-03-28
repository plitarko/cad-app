import { useEffect, useState } from 'react'

interface LoadingScreenProps {
  onLoaded: () => void
  onError: (error: string) => void
}

export function LoadingScreen({ onLoaded, onError }: LoadingScreenProps) {
  const [status, setStatus] = useState('Initializing OpenCascade kernel...')
  const [dots, setDots] = useState('')

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((d) => (d.length >= 3 ? '' : d + '.'))
    }, 400)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    let cancelled = false
    import('../engine/occ-api').then(({ occApi }) => {
      setStatus('Loading WASM module (this may take a moment)...')
      occApi.init().then(
        (msg) => {
          if (!cancelled) {
            setStatus(msg)
            onLoaded()
          }
        },
        (err) => {
          if (!cancelled) {
            onError(err.message || String(err))
          }
        },
      )
    })
    return () => { cancelled = true }
  }, [onLoaded, onError])

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      background: '#0f172a',
      color: '#e2e8f0',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      <div style={{ fontSize: 32, fontWeight: 700, marginBottom: 24 }}>CAD App</div>
      <div style={{
        width: 300,
        height: 4,
        background: '#1e293b',
        borderRadius: 2,
        overflow: 'hidden',
        marginBottom: 16,
      }}>
        <div style={{
          width: '100%',
          height: '100%',
          background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
          animation: 'loading-bar 1.5s ease-in-out infinite',
          transformOrigin: 'left',
        }} />
      </div>
      <div style={{ fontSize: 14, color: '#94a3b8' }}>
        {status}{dots}
      </div>
      <style>{`
        @keyframes loading-bar {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(0%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  )
}
