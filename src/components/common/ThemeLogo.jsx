import logo from "../../assets/logo.png";
import darkLogo from "../../assets/logo_darkmode.png";
import { useTheme } from "../../hooks/useTheme.js";

export default function ThemeLogo({ alt = "logo", style, ...props }) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  // Match the visible artwork bounds despite the assets' different transparent padding.
  const scaleX = 1939 / 1805;
  const scaleY = 493 / 438;
  const offsetX = ((1085.5 - (1086 + (1092 - 1086) * scaleX)) / 2172) * 100;
  const offsetY = ((364 - (362 + (383.5 - 362) * scaleY)) / 724) * 100;

  return (
    <img
      {...props}
      key={resolvedTheme}
      src={isDark ? darkLogo : logo}
      alt={alt}
      style={{
        ...style,
        transform: isDark ? undefined : `translate(${offsetX}%, ${offsetY}%) scale(${scaleX}, ${scaleY})`,
        transformOrigin: "center",
      }}
    />
  );
}
