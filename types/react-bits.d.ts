/**
 * React Bits components ship as JavaScript. These declarations give
 * the TypeScript side of the codebase the prop shapes it needs without
 * modifying the library sources, which are used as supplied.
 */
declare module "@/components/react-bits/SplitText/SplitText" {
  import type { JSX } from "react";
  const SplitText: (props: {
    text: string;
    className?: string;
    delay?: number;
    duration?: number;
    ease?: string;
    splitType?: "chars" | "words" | "lines" | "words, chars";
    from?: Record<string, unknown>;
    to?: Record<string, unknown>;
    threshold?: number;
    rootMargin?: string;
    textAlign?: string;
    tag?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "p";
    onLetterAnimationComplete?: () => void;
  }) => JSX.Element;
  export default SplitText;
}

declare module "@/components/react-bits/BlurText/BlurText" {
  import type { JSX } from "react";
  const BlurText: (props: {
    text?: string;
    delay?: number;
    className?: string;
    animateBy?: "words" | "letters";
    direction?: "top" | "bottom";
    threshold?: number;
    rootMargin?: string;
    animationFrom?: Record<string, unknown>;
    animationTo?: Record<string, unknown>[];
    easing?: (t: number) => number;
    onAnimationComplete?: () => void;
    stepDuration?: number;
  }) => JSX.Element;
  export default BlurText;
}

declare module "@/components/react-bits/FoldText/FoldText" {
  import type { CSSProperties, JSX } from "react";
  const FoldText: (props: {
    text?: string;
    splitBy?: "char" | "word" | "line";
    hinge?: "top" | "bottom" | "left" | "right";
    duration?: number;
    stagger?: number;
    ease?: string;
    perspective?: number;
    creaseShading?: number;
    trigger?: "mount" | "hover" | "scroll" | "loop";
    fontSize?: string | number;
    fontWeight?: string | number;
    color?: string;
    className?: string;
    style?: CSSProperties;
  }) => JSX.Element;
  export default FoldText;
}

declare module "@/components/react-bits/DepthText/DepthText" {
  import type { CSSProperties, JSX } from "react";
  const DepthText: (props: {
    text?: string;
    layers?: number;
    depth?: number;
    faceColor?: string;
    depthColor?: string;
    tilt?: number;
    pointerTracking?: boolean;
    smoothing?: number;
    perspective?: number;
    autoOrbit?: boolean;
    orbitSpeed?: number;
    fontSize?: string;
    fontWeight?: number | string;
    shadow?: boolean;
    className?: string;
    style?: CSSProperties;
  }) => JSX.Element;
  export default DepthText;
}

declare module "@/components/react-bits/GradualBlur/GradualBlur" {
  import type { CSSProperties, JSX } from "react";
  const GradualBlur: (props: {
    position?: "top" | "bottom" | "left" | "right";
    strength?: number;
    height?: string;
    width?: string;
    divCount?: number;
    exponential?: boolean;
    curve?: "linear" | "bezier" | "ease-in" | "ease-out" | "ease-in-out";
    opacity?: number;
    animated?: boolean | "scroll";
    duration?: string;
    easing?: string;
    hoverIntensity?: number;
    target?: "parent" | "page";
    preset?: string;
    responsive?: boolean;
    zIndex?: number;
    onAnimationComplete?: () => void;
    className?: string;
    style?: CSSProperties;
  }) => JSX.Element;
  export default GradualBlur;
}

declare module "@/components/react-bits/SpotlightCard/SpotlightCard" {
  import type { JSX, ReactNode } from "react";
  const SpotlightCard: (props: {
    children?: ReactNode;
    className?: string;
    spotlightColor?: string;
  }) => JSX.Element;
  export default SpotlightCard;
}
