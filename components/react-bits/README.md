# React Bits

Library primitives, used as supplied. The only edits are the
`"use client"` directive Next.js requires and SSR guards.

| Component | Where it earns its place |
| --- | --- |
| `SplitText` | Chakra hero transliteration; every chakra section heading; the HealerJi `SplitText` wrapper used across the homepage. Configured per centre from `lib/motion/chakra-motion.ts`. |
| `BlurText` | Devanāgarī in the chakra hero; supporting statements site-wide via the HealerJi `BlurText` wrapper. |
| `FoldText` | The three-word editorial moment on each chakra page, unfolding from a different hinge per centre. |
| `DepthText` | The chakra name only — one extruded moment per page, in that centre's colour. |
| `GradualBlur` | Dissolving the foot of the concepts section and the homepage chakra section, so sections bleed rather than stop. |
| `SpotlightCard` | Interactive cards site-wide via the HealerJi wrapper, with a plum pool instead of the library's white. |

## Deliberately not used

**SpecularButton** and **WarpText** both require `ogl` and open a WebGL
context. A specular metal button and liquid-glass headline read as
product-launch or gaming, which is the opposite of what this platform
is for, and each additional WebGL context costs real performance on
the mid-range Android devices most of our visitors use. If a use case
appears that genuinely needs them, add them then.

**BorderGlow** overlaps almost entirely with the existing
`components/motion/glow-border.tsx`, which is already tuned to the
brand palette. Two components doing one job is how a design system
starts to drift.

## House rules

- HealerJi wrappers in `components/motion/` decide *how* these are
  used; call sites never configure the library directly.
- No component may introduce its own typeface — `styles/globals.css`
  forces `font-family: inherit` on `.split-parent`, `.fold-text` and
  `.depth-text`.
- Colours come from the chakra theme or the brand palette. Never a
  library default.
- Every wrapper returns still, complete content under
  `prefers-reduced-motion`.
