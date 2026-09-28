import { StyleSheet } from "@react-pdf/renderer";
import { HtmlStyleSet } from "@/components/pdf-export/types";
import type { ResumeExportSettings } from "@/models/resumeExport.model";
import { A4_HEIGHT, resumeStyleTokens } from "./tokens";

export function buildSimpleStyles(settings: ResumeExportSettings) {
  const t = resumeStyleTokens(settings);

  const styles = StyleSheet.create({
    page: {
      fontFamily: t.font.regular,
      fontSize: t.fontSize,
      paddingTop: t.marginVertical,
      paddingBottom: t.marginVertical,
      paddingHorizontal: t.marginHorizontal,
      color: "#000000",
      lineHeight: t.lineHeight,
    },
    heading: {
      fontSize: t.pt(20),
      fontFamily: t.font.bold,
      marginBottom: 8,
    },
    subheading: {
      fontSize: t.pt(12),
      marginBottom: 2,
    },
    contactLine: {
      fontSize: t.pt(10),
      color: "#444444",
      marginBottom: 2,
    },
    sectionTitle: {
      fontSize: t.fontSize,
      fontFamily: t.font.bold,
      textTransform: "uppercase",
      letterSpacing: 0.8,
      marginBottom: 3,
      marginTop: t.sectionSpacing,
    },
    divider: {
      borderBottomWidth: 0.5,
      borderBottomColor: "#000000",
      marginBottom: 6,
    },
    bold: { fontFamily: t.font.bold },
    italic: { fontFamily: t.font.italic },
    boldItalic: { fontFamily: t.font.boldItalic },
    bodyText: { fontSize: t.fontSize, marginBottom: 2 },
    entryTitle: {
      fontFamily: t.font.bold,
      fontSize: t.fontSize,
      marginBottom: 1,
    },
    entryMeta: {
      fontSize: t.pt(10),
      color: "#444444",
      marginBottom: 2,
    },
    listRow: {
      flexDirection: "row",
      marginBottom: 1,
    },
    bullet: { width: t.pt(14), fontSize: t.fontSize },
    listText: { flex: 1, fontSize: t.fontSize },
    h2text: {
      fontFamily: t.font.bold,
      fontSize: t.pt(13),
      marginBottom: 3,
      marginTop: 4,
    },
    skillRow: {
      flexDirection: "row",
      marginBottom: 3,
    },
    skillCat: {
      fontFamily: t.font.bold,
      fontSize: t.pt(10),
      width: t.pt(110),
      flexShrink: 0,
    },
    skillVals: {
      flex: 1,
      fontSize: t.fontSize,
    },
    // Lifted out of SimpleTemplate so the settings can reach them
    headerBlock: { marginBottom: 12 },
    contactRow: { flexDirection: "row", flexWrap: "wrap" },
    entryBlock: { marginBottom: t.entrySpacing },
    certBlock: { marginBottom: t.certSpacing },
    link: { color: "#000000", textDecoration: "none" },
    // Absolute offsets run from the page edge, not the padding; lineHeight 1
    // keeps the number centred in the bottom margin.
    pageNumber: {
      position: "absolute",
      top: A4_HEIGHT - (t.marginVertical + t.pt(9)) / 2,
      left: t.marginHorizontal,
      right: t.marginHorizontal,
      textAlign: "right",
      fontSize: t.pt(9),
      lineHeight: 1,
      color: "#444444",
    },
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

export type SimpleStyles = ReturnType<typeof buildSimpleStyles>["styles"];
