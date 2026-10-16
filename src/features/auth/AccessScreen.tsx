import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { Icon } from '@/components/ui/Icon'
import { useAppConfig } from '@/features/config/AppConfigProvider'
import { verifyAccessCodeRequest } from '@/shared/api/endpoints'
import {
  getOrCreateDeviceId,
  saveSession,
  type ClientSession,
} from '@/shared/api/session'
import { showToast } from '@/shared/ui/toast'
import { verifyErrorMessage } from './accessErrors'

const CODE_LENGTH = 6

/** WhatsAppHelper.ACCESS_CODE_MESSAGE, verbatim. */
const ACCESS_CODE_REQUEST =
  'Hello! I just installed OlssonStreams on my phone. Please send me my access code to unlock the app.'

const FALLBACK_SUCCESS = 'Welcome to Olsson Streams!'

function sanitizeCode(raw: string): string {
  return raw
    .replace(/[^A-Za-z0-9]/g, '')
    .slice(0, CODE_LENGTH)
    .toUpperCase()
}

/**
 * Mirrors AccessVerificationScreen: a six-cell code entry driven by one hidden
 * input, auto-submitting on the sixth character, shaking on failure.
 *
 * `notice` carries copy for a session cleared out from under the user (device
 * check revoke, CODE_REVOKED / DEVICE_MISMATCH), which the router knows about
 * before this screen mounts.
 */
export function AccessScreen({ notice }: { notice?: string | null }) {
  const { supportWhatsApp } = useAppConfig()
  const inputRef = useRef<HTMLInputElement>(null)
  const inFlight = useRef(false)

  const [code, setCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(notice ?? null)
  const [errorTrigger, setErrorTrigger] = useState(0)

  useEffect(() => {
    if (!notice) return
    setErrorMessage(notice)
    setErrorTrigger((trigger) => trigger + 1)
  }, [notice])

  function failWith(message: string) {
    setCode('')
    setErrorMessage(message)
    setErrorTrigger((trigger) => trigger + 1)
  }

  async function verify(candidate: string) {
    if (inFlight.current) return
    inFlight.current = true
    setIsLoading(true)
    setErrorMessage(null)
    try {
      const { data, message } = await verifyAccessCodeRequest(
        candidate,
        getOrCreateDeviceId(),
      )
      if (!data?.token) {
        failWith(message ?? 'Unable to verify access code.')
        return
      }
      const session: ClientSession = {
        token: data.token,
        expiresAtEpochSeconds: Math.floor(Date.now() / 1000) + (data.expires_in ?? 0),
        code: data.code ?? candidate,
        assignedTo: data.assigned_to ?? '',
        canDownload: data.can_download ?? false,
        downloadStatus: data.download_status ?? null,
        downloadExpiresAt: data.download_expires_at ?? null,
      }
      saveSession(session)
      showToast(message ?? FALLBACK_SUCCESS)
    } catch (error) {
      failWith(verifyErrorMessage(error))
    } finally {
      inFlight.current = false
      setIsLoading(false)
    }
  }

  function handleCodeChange(raw: string) {
    const next = sanitizeCode(raw)
    setCode(next)
    setErrorMessage(null)
    if (next.length === CODE_LENGTH) {
      // Android clears focus once the code is complete so the whole screen
      // (and the button) clears the keyboard.
      inputRef.current?.blur()
      void verify(next)
    }
  }

  function handleSubmit() {
    if (code.length < CODE_LENGTH) {
      setErrorMessage('Please enter all 6 characters of your code')
      setErrorTrigger((trigger) => trigger + 1)
      return
    }
    inputRef.current?.blur()
    void verify(code)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== 'Enter') return
    event.preventDefault()
    handleSubmit()
  }

  const hasError = errorMessage !== null
  const whatsappUrl = `https://wa.me/${supportWhatsApp.replace(/\D/g, '')}?text=${encodeURIComponent(
    ACCESS_CODE_REQUEST,
  )}`

  return (
    // Centre with `m-auto` on the child rather than justify/items-center on
    // the scroll container: auto margins collapse to 0 when content overflows
    // (keyboard open, landscape), so the wordmark stays reachable. Centering
    // the container itself would clip the top of a scrollable region.
    <div className="flex min-h-dvh w-full flex-col overflow-y-auto bg-bg px-7 py-6">
      <div className="m-auto w-full max-w-[520px]">
        <img
          src="/brand_wordmark.png"
          alt="Olsson Streams"
          className="mx-auto block h-[88px] w-full max-w-[256px] object-contain"
        />

        <h1 className="mt-4 text-center text-xl font-bold text-text">Welcome</h1>
        <p className="mt-1.5 text-center text-[13px] leading-[18px] text-text-muted">
          Unlock your private streaming library
        </p>
        <p className="mt-2 text-center text-xs text-text-subtle">
          Enter the access code shared with you to continue.
        </p>

        <p className="mt-8 text-center text-[11px] font-bold tracking-[1.4px] text-text-muted">
          ACCESS CODE
        </p>

        <div className="relative mx-auto mt-2.5 w-full max-w-[330px]">
          {/* Keyed on errorTrigger so each failure restarts the animation;
              border colour keys off errorMessage so a mount-time notice still
              reads as an error without shaking twice. */}
          <div
            key={errorTrigger}
            className={errorTrigger > 0 ? 'access-shake' : undefined}
            aria-hidden
          >
            <div className="grid grid-cols-6 gap-2">
              {Array.from({ length: CODE_LENGTH }, (_, index) => {
                const char = code[index]
                const isFilled = char !== undefined
                const isFocused = index === code.length
                const borderClass = hasError
                  ? 'border-[#e57373]'
                  : isFocused
                    ? 'border-accent'
                    : isFilled
                      ? 'border-accent/50'
                      : 'border-outline'
                const shadowClass = isFocused
                  ? 'shadow-[0_0_8px_rgba(42,171,238,0.55)]'
                  : ''
                return (
                  <div
                    key={index}
                    className={`flex aspect-square items-center justify-center rounded-[10px] border ${borderClass} ${isFilled ? 'bg-surface-variant' : 'bg-transparent'} ${shadowClass}`}
                  >
                    <span
                      key={char ?? ''}
                      className={`font-mono text-[19px] font-bold ${
                        isFilled ? 'text-text' : 'text-text-subtle'
                      }${isFilled ? ' access-char-pop' : ''}`}
                    >
                      {char ?? ''}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          <input
            ref={inputRef}
            value={code}
            onChange={(event) => handleCodeChange(event.target.value)}
            onKeyDown={handleKeyDown}
            type="text"
            name="accessCode"
            aria-label="Access code"
            aria-invalid={hasError}
            aria-describedby={hasError ? 'access-code-error' : undefined}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            autoCapitalize="characters"
            inputMode="text"
            className="absolute inset-0 h-full w-full cursor-text bg-transparent text-transparent caret-transparent outline-none selection:bg-transparent"
          />
        </div>

        {hasError && (
          <p
            id="access-code-error"
            role="alert"
            className="mt-3 text-center text-xs text-[#ef5350]"
          >
            {errorMessage}
          </p>
        )}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={isLoading || code.length !== CODE_LENGTH}
          aria-busy={isLoading}
          className="mt-[22px] flex h-[46px] w-full items-center justify-center rounded-[10px] bg-accent text-sm font-semibold text-white transition-transform active:scale-[0.97] disabled:cursor-not-allowed disabled:bg-surface-variant/50 disabled:text-text-subtle disabled:active:scale-100"
        >
          {isLoading ? (
            <>
              <span
                aria-hidden
                className="h-[18px] w-[18px] rounded-full border-2 border-white/40 border-t-white animate-spin"
              />
              <span className="sr-only">Verifying access code</span>
            </>
          ) : (
            'Unlock App'
          )}
        </button>

        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-[10px] py-2 text-[13px] font-medium text-accent active:opacity-80"
        >
          <Icon name="chat" className="text-[15px]" />
          Request code on WhatsApp
        </a>

        <div className="mt-2 flex items-center justify-center gap-1 text-[11px] text-text-subtle">
          <Icon name="lock" className="text-[11px]" />
          Single-device authorization
        </div>
      </div>
    </div>
  )
}
