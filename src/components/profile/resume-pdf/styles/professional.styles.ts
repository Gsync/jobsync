import { StyleSheet } from "@react-pdf/renderer";
import { HtmlStyleSet } from "@/components/pdf-export/types";
import type { ResumeExportSettings } from "@/models/resumeExport.model";
import { resumeStyleTokens } from "./tokens";

const ACCENT = "#34506e";
const NEAR_BLACK = "#1a1a1a";
const GRAY = "#555555";

export function buildProfessionalStyles(settings: ResumeExportSettings) {
  const t = resumeStyleTokens(settings);

  const styles = StyleSheet.create({
    page: {
      fontFamily: t.font.regular,
      fontSize: t.fontSize,
      paddingTop: t.marginVertical,
      paddingBottom: t.marginVertical,
      paddingHorizontal: t.marginHorizontal,
      color: NEAR_BLACK,
      lineHeight: t.lineHeight,
    },
    // Header
    headerRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: 8,
    },
    headerLeft: {
      flex: 1,
    },
    headerRight: {
      alignItems: "flex-end",
    },
    name: {
      fontFamily: t.font.bold,
      fontSize: t.pt(24),
      color: NEAR_BLACK,
      marginBottom: 16,
    },
    headline: {
      fontFamily: t.font.regular,
      fontSize: t.pt(12),
      color: ACCENT,
      textTransform: "uppercase",
      letterSpacing: 1.2,
    },
    contactLine: {
      fontFamily: t.font.regular,
      fontSize: t.pt(10),
      color: NEAR_BLACK,
      marginBottom: 1,
    },
    thickRule: {
      borderBottomWidth: 2,
      borderBottomColor: "#000000",
      marginBottom: 10,
    },
    // Section heading
    sectionHeadingRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 6,
      marginTop: t.sectionSpacing,
    },
    sectionHeadingLabel: {
      fontFamily: t.font.bold,
      fontSize: t.fontSize,
      color: ACCENT,
      textTransform: "uppercase",
      letterSpacing: 1.4,
      marginRight: 6,
    },
    sectionHeadingRule: {
      flex: 1,
      borderBottomWidth: 0.75,
      borderBottomColor: ACCENT,
    },
    // Body
    bodyText: {
      fontSize: t.fontSize,
      marginBottom: 2,
    },
    bold: { fontFamily: t.font.bold },
    italic: { fontFamily: t.font.italic },
    boldItalic: { fontFamily: t.font.boldItalic },
    h2text: {
      fontFamily: t.font.bold,
      fontSize: t.pt(13),
      marginBottom: 3,
      marginTop: 4,
    },
    // Entry rows
    entryHeaderRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
    },
    entryTitle: {
      fontFamily: t.font.bold,
      fontSize: t.fontSize,
      color: NEAR_BLACK,
      flex: 1,
    },
    // Use when entryTitle is NOT inside entryHeaderRow (no row sibling to flex against)
    entryTitleBlock: {
      fontFamily: t.font.bold,
      fontSize: t.fontSize,
      color: NEAR_BLACK,
    },
    entryDate: {
      fontFamily: t.font.regular,
      fontSize: t.pt(10),
      color: GRAY,
      marginLeft: 8,
    },
    entryMeta: {
      fontSize: t.pt(10),
      color: GRAY,
      marginBottom: 3,
    },
    // List
    listRow: {
      flexDirection: "row",
      marginBottom: 1,
    },
    bullet: {
      width: t.pt(12),
      fontSize: t.fontSize,
      color: ACCENT,
    },
    listText: {
      flex: 1,
      fontSize: t.fontSize,
    },
    // Two-column section
    twoColRow: {
      flexDirection: "row",
      gap: 20,
    },
    twoColLeft: {
      flex: 1,
    },
    twoColRight: {
      flex: 1,
    },
    // Lifted out of ProfessionalTemplate so the settings can reach them
    summaryBlock: { marginBottom: 4 },
    entryBlock: { marginBottom: t.entrySpacing },
    certBlock: { marginBottom: t.certSpacing },
    skillTwoColRow: {
      flexDirection: "row",
      gap: 20,
      marginBottom: 4,
    },
    skillCatLabel: {
      fontSize: t.pt(9),
      fontFamily: t.font.bold,
      textTransform: "uppercase",
      marginBottom: 1,
    },
    skillVals: {
      fontSize: t.pt(10),
    },
    link: { color: NEAR_BLACK, textDecoration: "none" },
  });

  const htmlStyles: HtmlStyleSet = {
    bodyText: styles.bodyText,
    bold: styles.bold,
    italic: styles.italic,
    boldItalic: styles.boldItalic,
    h2text: styles.h2text,
    listRow: styles.listRow,
    bullet: styles.bullet,
    listText: styles.listText,
    bulletChar: "•",
  };

  return { styles, htmlStyles };
}

export type ProfessionalStyles = ReturnType<
  typeof buildProfessionalStyles
>["styles"];
