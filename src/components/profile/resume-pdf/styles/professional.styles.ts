import { StyleSheet } from "@react-pdf/renderer";
import { HtmlStyleSet } from "../types";

const ACCENT = "#34506e";
const NEAR_BLACK = "#1a1a1a";
const GRAY = "#555555";

export const professionalStyles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 10,
    paddingTop: 36,
    paddingBottom: 40,
    paddingHorizontal: 44,
    color: NEAR_BLACK,
    lineHeight: 1.45,
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
    fontFamily: "Times-Bold",
    fontSize: 24,
    color: NEAR_BLACK,
    marginBottom: 16,
  },
  headline: {
    fontFamily: "Helvetica",
    fontSize: 10,
    color: ACCENT,
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  contactLine: {
    fontFamily: "Courier",
    fontSize: 9,
    color: GRAY,
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
    marginTop: 12,
  },
  sectionHeadingLabel: {
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
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
    fontSize: 10,
    marginBottom: 2,
  },
  bold: { fontFamily: "Helvetica-Bold" },
  italic: { fontFamily: "Helvetica-Oblique" },
  boldItalic: { fontFamily: "Helvetica-BoldOblique" },
  h2text: {
    fontFamily: "Helvetica-Bold",
    fontSize: 12,
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
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
    color: NEAR_BLACK,
    flex: 1,
  },
  entryDate: {
    fontFamily: "Helvetica",
    fontSize: 9,
    color: GRAY,
    marginLeft: 8,
  },
  entryMeta: {
    fontSize: 9,
    color: GRAY,
    marginBottom: 3,
  },
  // List
  listRow: {
    flexDirection: "row",
    marginBottom: 1,
  },
  bullet: {
    width: 12,
    fontSize: 10,
    color: ACCENT,
  },
  listText: {
    flex: 1,
    fontSize: 10,
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
});

export const professionalHtmlStyles: HtmlStyleSet = {
  bodyText: professionalStyles.bodyText,
  bold: professionalStyles.bold,
  italic: professionalStyles.italic,
  boldItalic: professionalStyles.boldItalic,
  h2text: professionalStyles.h2text,
  listRow: professionalStyles.listRow,
  bullet: professionalStyles.bullet,
  listText: professionalStyles.listText,
  bulletChar: "▪",
};
