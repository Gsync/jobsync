import { StyleSheet, Text, View } from "@react-pdf/renderer";

export const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 11,
    paddingTop: 40,
    paddingBottom: 40,
    paddingHorizontal: 48,
    color: "#000000",
    lineHeight: 1.4,
  },
  heading: {
    fontSize: 20,
    fontFamily: "Helvetica-Bold",
    marginBottom: 8,
  },
  subheading: {
    fontSize: 12,
    marginBottom: 2,
  },
  contactLine: {
    fontSize: 10,
    color: "#444444",
    marginBottom: 2,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 3,
    marginTop: 12,
  },
  divider: {
    borderBottomWidth: 0.5,
    borderBottomColor: "#000000",
    marginBottom: 6,
  },
  bold: { fontFamily: "Helvetica-Bold" },
  italic: { fontFamily: "Helvetica-Oblique" },
  boldItalic: { fontFamily: "Helvetica-BoldOblique" },
  bodyText: { fontSize: 11, marginBottom: 2 },
  entryTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 11,
    marginBottom: 1,
  },
  entryMeta: {
    fontSize: 10,
    color: "#444444",
    marginBottom: 2,
  },
  listRow: {
    flexDirection: "row",
    marginBottom: 1,
  },
  bullet: { width: 14, fontSize: 11 },
  listText: { flex: 1, fontSize: 11 },
  h2text: {
    fontFamily: "Helvetica-Bold",
    fontSize: 13,
    marginBottom: 3,
    marginTop: 4,
  },
});

export function SectionHeading({ title }: { title: string }) {
  return (
    <View>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.divider} />
    </View>
  );
}
