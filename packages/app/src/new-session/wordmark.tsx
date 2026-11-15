import { Logo } from "@opencode/ui/logo"

/** The lodger curled up as the brick breaker ball. Positions are the ball's centre, relative to the new session panel. */
export type LodgerBall = {
  radius: () => number
  at: () => { x: number; y: number }
  place: (
    x: number,
    y: number,
    pose: { look: number; lookAngle: number; stretch: number; angle: number; squint: number; curl: number },
  ) => void
  blink: () => void
  /** Uncurls and hops back to its perch beside the pin board. */
  done: () => void
}

/**
 * Reserves the wordmark's space and renders the Code Nexus logo.
 */
export function NewSessionWordmark(props: {
  ref: (element: HTMLDivElement) => void
  pins?: boolean
  sound?: () => boolean
  onOpen?: () => void
  onClose?: () => void
  onFlat?: () => void
  onPlay?: (ball: LodgerBall) => void
}) {
  return (
    <div
      data-component="new-session-wordmark"
      aria-hidden="true"
      class="pointer-events-none mx-auto w-full max-w-[720px] text-v2-background-bg-inverse"
    >
      <div
        ref={(el) => {
          if (el) props.ref(el)
        }}
        data-slot="wordmark-box"
        class="relative mx-auto aspect-[234/42] w-4/5 flex items-center justify-center"
      >
        <Logo class="size-full opacity-[0.16]" />
      </div>
    </div>
  )
}
