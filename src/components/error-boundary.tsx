"use client"

import { Component, type ReactNode } from "react"

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: { componentStack?: string }) {
    console.error("[ErrorBoundary]", error.message, info.componentStack ?? "")
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: "var(--nb-bg)" }}>
          <div className="nb-card p-8 max-w-md text-center">
            <div className="text-4xl mb-3">⚠</div>
            <h2 className="text-lg font-black" style={{ color: "var(--nb-text)" }}>Something went wrong</h2>
            <p className="mt-1 text-sm" style={{ color: "var(--nb-text-soft)" }}>
              {this.state.error?.message ?? "An unexpected error occurred"}
            </p>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="mt-4 px-4 py-2 text-sm font-black"
              style={{ background: "#f7d44a", border: "2.5px solid var(--nb-border)", color: "#1a1a1a", cursor: "pointer" }}
            >
              Try again
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
