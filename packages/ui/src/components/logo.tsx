import { type ComponentProps } from "solid-js"

// Code Nexus wordmark glyph set.
//
// Nine letters — o l l i E c o d e — on the same 234×42 viewBox opencode uses,
// so every component sized for the wordmark (new-session, lodger, pin-board,
// brick-breaker) still lays out correctly without geometry changes elsewhere.
//
// Letter grid, variable widths with 6px gaps:
//   o   at x=3..27    cx=15    width 24   "user" side (--icon-base)
//   l   at x=33..45   cx=39    width 12
//   l   at x=51..63   cx=57    width 12
//   i   at x=69..81   cx=75    width 12
//   E   at x=87..111  cx=99    width 24
//   c   at x=117..141 cx=129   width 24   "code" side  (--icon-strong-base)
//   o   at x=147..171 cx=159   width 24
//   d   at x=177..201 cx=189   width 24
//   e   at x=207..231 cx=219   width 24
//
// All strokes are on the 6px pixel grid, matching opencode's "chunky block"
// aesthetic. The weak paths render under the stems with --icon-weak-base so
// counters cast a shadow the same way the OPENCODE wordmark did.
//
// The lodger lives in the top counter of the final `e`, centred on (219, 15).

export const Mark = (props: { class?: string }) => {
  return (
    <svg
      data-component="logo-mark"
      classList={{ [props.class ?? ""]: !!props.class }}
      viewBox="0 0 16 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path data-slot="logo-logo-mark-shadow" d="M12 16H4V8H12V16Z" fill="var(--icon-weak-base)" />
      <path data-slot="logo-logo-mark-o" d="M12 4H4V16H12V4ZM16 20H0V0H16V20Z" fill="var(--icon-strong-base)" />
    </svg>
  )
}

export const Splash = (props: Pick<ComponentProps<"svg">, "ref" | "class">) => {
  return (
    <svg
      ref={props.ref}
      data-component="logo-splash"
      classList={{ [props.class ?? ""]: !!props.class }}
      viewBox="0 0 80 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M60 80H20V40H60V80Z" fill="var(--icon-base)" />
      <path d="M60 20H20V80H60V20ZM80 100H0V0H80V100Z" fill="var(--icon-strong-base)" />
    </svg>
  )
}

export const Logo = (props: { class?: string }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 234 42"
      fill="none"
      classList={{ [props.class ?? ""]: !!props.class }}
    >
      <text
        x="117"
        y="25"
        text-anchor="middle"
        dominant-baseline="central"
        font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
        font-weight="800"
        font-size="28"
        letter-spacing="-0.03em"
      >
        <tspan fill="var(--icon-base)">Code </tspan>
        <tspan fill="var(--icon-strong-base)">Nexus</tspan>
      </text>
    </svg>
  )
}
