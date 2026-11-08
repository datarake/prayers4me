import Svg, { Circle, Path, Rect } from "react-native-svg";

export type IconName =
  | "globe"
  | "chevronDown"
  | "check"
  | "lock"
  | "candle"
  | "circle";

/**
 * Small drawn icon set. Emoji look different on every device and cannot take the app's
 * colours, so everything is a simple stroked shape on a 24 grid that follows `color`.
 */
export function Icon({
  name,
  size = 20,
  color = "#102A28",
  strokeWidth = 1.8,
}: {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
}) {
  const stroke = {
    stroke: color,
    strokeWidth,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    fill: "none",
  };

  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {name === "globe" ? (
        <>
          <Circle cx="12" cy="12" r="9" {...stroke} />
          <Path d="M3 12h18" {...stroke} />
          <Path
            d="M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z"
            {...stroke}
          />
        </>
      ) : null}
      {name === "chevronDown" ? <Path d="M6 9l6 6 6-6" {...stroke} /> : null}
      {name === "check" ? <Path d="M5 12.5l4.5 4.5L19 7.5" {...stroke} /> : null}
      {name === "lock" ? (
        <>
          <Rect x="5" y="11" width="14" height="9" rx="2.5" {...stroke} />
          <Path d="M8 11V8a4 4 0 0 1 8 0v3" {...stroke} />
        </>
      ) : null}
      {name === "candle" ? (
        <>
          <Path
            d="M12 2.5c1.7 2.1 2.7 3.3 2.7 4.8a2.7 2.7 0 0 1-5.4 0c0-1.5 1-2.7 2.7-4.8z"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
            fill={color}
          />
          <Rect x="9" y="11.5" width="6" height="8.5" rx="1.4" {...stroke} />
          <Path d="M7 20.5h10" {...stroke} />
        </>
      ) : null}
      {name === "circle" ? <Circle cx="12" cy="12" r="8.5" {...stroke} /> : null}
    </Svg>
  );
}
