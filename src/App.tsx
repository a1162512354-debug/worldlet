import { Component, type ReactNode } from 'react'
import { SpacePortal } from './components/Shell/SpacePortal'
import { useSillytavern } from './hooks/useSillytavern'

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: Error | null }> {
  state = { hasError: false, error: null as Error | null }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="loading-screen">
          <h2>应用崩溃</h2>
          <pre>{this.state.error?.message}</pre>
          <button onClick={() => this.setState({ hasError: false, error: null })}>重试</button>
        </div>
      )
    }
    return this.props.children
  }
}

export function App() {
  const st = useSillytavern()

  if (!st.initialized) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        <p>正在加载酒馆终端...</p>
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <SpacePortal />
    </ErrorBoundary>
  )
}
