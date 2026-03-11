import React from "react";
import { Text, TextProps, StyleSheet } from "react-native";

type AppTextProps = TextProps & {
  weight?: "regular" | "light" | "bold";
  className?: string;
};

const FONT = {
  regular: "Lato-Regular",
  light: "Lato-Light",
  bold: "Lato-Bold",
} as const;

function inferWeightFromClassName(className?: string): "regular" | "light" | "bold" {
  if (!className) return "regular";
  if (/\b(font-semibold|font-bold|font-extrabold|font-black|font-lato-bold)\b/.test(className)) return "bold";
  if (/\b(font-light|font-extralight|font-thin|font-lato-light)\b/.test(className)) return "light";
  if (/\b(font-medium)\b/.test(className)) return "bold";
  return "regular";
}

function inferWeightFromStyle(style: TextProps["style"]): "regular" | "light" | "bold" {
  const flattenedStyle = StyleSheet.flatten(style) || {};
  const fw = (flattenedStyle as any).fontWeight;

  if (fw === undefined || fw === null) return "regular";

  if (typeof fw === "number") {
    if (fw >= 500) return "bold";
    if (fw <= 300) return "light";
    return "regular";
  }

  if (typeof fw === "string") {
    const normalized = fw.trim().toLowerCase();
    if (["bold", "semibold", "800", "700", "600", "500"].includes(normalized)) return "bold";
    if (["light", "thin", "200", "300", "100"].includes(normalized)) return "light";
  }

  return "regular";
}

function stripFontWeightClasses(className?: string): string | undefined {
  if (!className) return className;
  const cleaned = className
    .split(/\s+/)
    .filter(Boolean)
    .filter(
      (token) =>
        ![
          "font-bold",
          "font-semibold",
          "font-light",
          "font-normal",
          "font-lato",
          "font-lato-bold",
          "font-lato-light",
        ].includes(token)
    )
    .join(" ");

  return cleaned || undefined;
}

export function AppText({ weight, style, className, ...props }: AppTextProps) {
  const classWeight = inferWeightFromClassName(className);
  const styleWeight = inferWeightFromStyle(style);
  const resolvedWeight = weight ?? (classWeight !== "regular" ? classWeight : styleWeight);
  const cleanedClassName = stripFontWeightClasses(className);
  const flattenedStyle = StyleSheet.flatten(style) || {};
  const { fontWeight: _fontWeight, fontFamily: _fontFamily, ...safeStyle } = flattenedStyle;

  return (
    <Text
      {...props}
      className={cleanedClassName}
      style={[styles.base, safeStyle, { fontFamily: FONT[resolvedWeight] }]}
    />
  ); 
}

const styles = StyleSheet.create({
  base: {
    includeFontPadding: false,
    textAlignVertical: "center",
  },
});