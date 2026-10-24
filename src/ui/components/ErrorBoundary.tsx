import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Button } from './Button'
import { Icon } from '../icons/Icon'
import { isChunkLoadError, resetFailedImports } from '../lib/lazyRetry'
import { useStack } from '../shell/stack'
import styles from './ErrorBoundary.module.css'

interface Props {
  children: ReactNode
  /** When this value changes (e.g. the route), a crashed subtree gets a fresh try. */
  resetKey?: unknown
  /** `screen` keeps the tab bar usable and offers a retry; `app` is the last line of defence. */
  scope?: 'screen' | 'app'
}

interface State {
  error: Error | null
}

/**
 * Catches a render crash so the app never goes blank. Data lives in IndexedDB and is untouched by
 * a render error, so the message can honestly say it's safe.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Screen crashed', error, info.componentStack)
  }

  componentDidUpdate(prev: Props) {
    if (this.state.error && prev.resetKey !== this.props.resetKey) {
      resetFailedImports()
      this.setState({ error: null })
    }
  }

  reset = () => {
    // a screen whose code failed to download gets a brand-new import attempt
    resetFailedImports()
    this.setState({ error: null })
  }

  render() {
    if (!this.state.error) return this.props.children
    return <ErrorFallback scope={this.props.scope ?? 'screen'} onRetry={this.reset} error={this.state.error} />
  }
}

export function ErrorFallback({ scope, onRetry, error }: { scope: 'screen' | 'app'; onRetry?: () => void; error?: Error | null }) {
  // inside a pushed screen there's a way back, like any other screen (not only the tab bar)
  const stack = useStack()
  const chunk = isChunkLoadError(error)
  const reload = () => window.location.reload()
  const goToday = () => {
    window.location.hash = '#/today'
    window.location.reload()
  }
  return (
    <div className={styles.wrap} role="alert">
      {stack && scope === 'screen' && (
        <div className={styles.bar}>
          <button type="button" className={styles.back} onClick={stack.goBack}>
            <Icon name="back" size={22} />
            <span>{stack.underLabel ?? 'رجوع'}</span>
          </button>
        </div>
      )}
      <h1 className={styles.title} tabIndex={-1} data-screen-title="">
        {chunk ? 'ما قدرنا نفتح هالشاشة — بياناتك بأمان' : 'صار شي غلط — بياناتك بأمان'}
      </h1>
      <p className={styles.body}>
        {chunk
          ? 'يمكن الاتصال ضعيف الحين. جرّبي مرة ثانية، وإذا ما ضبط حدّثي التطبيق.'
          : scope === 'screen'
            ? 'هالشاشة تعثّرت. جرّبي مرة ثانية، وإذا رجعت المشكلة حدّثي التطبيق.'
            : 'التطبيق تعثّر. حدّثيه وترجعين لكل شي مثل ما تركتيه.'}
      </p>
      <div className={styles.actions}>
        {scope === 'screen' && onRetry ? (
          <>
            <Button onClick={onRetry}>جرّبي مرة ثانية</Button>
            <Button variant="secondary" onClick={reload}>
              حدّثي التطبيق
            </Button>
          </>
        ) : (
          <>
            <Button onClick={reload}>حدّثي التطبيق</Button>
            <Button variant="secondary" onClick={goToday}>
              رجّعيني لليوم
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
