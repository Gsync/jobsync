import React from "react";
import { Text, View } from "@react-pdf/renderer";
import { HtmlStyleSet } from "./types";

// Use numeric constants — the `Node` global is not available in all rendering contexts
const TEXT_NODE = 3;
const ELEMENT_NODE = 1;

type InheritedStyle = {
  bold?: boolean;
  italic?: boolean;
};

function inlineStyle(inherited: InheritedStyle, s: HtmlStyleSet) {
  if (inherited.bold && inherited.italic) return s.boldItalic;
  if (inherited.bold) return s.bold;
  if (inherited.italic) return s.italic;
  return undefined;
}

function walkNode(
  node: ChildNode,
  inherited: InheritedStyle,
  key: string,
  s: HtmlStyleSet,
): React.ReactElement | string | null {
  if (node.nodeType === TEXT_NODE) {
    const text = node.textContent ?? "";
    if (!text) return null;
    const style = inlineStyle(inherited, s);
    return style ? (
      <Text key={key} style={style}>
        {text}
      </Text>
    ) : (
      text
    );
  }

  if (node.nodeType !== ELEMENT_NODE) return null;
  const el = node as Element;
  const tag = el.tagName.toLowerCase();

  const children = Array.from(el.childNodes)
    .map((child, i) => walkNode(child, inherited, `${key}-${i}`, s))
    .filter(Boolean);

  switch (tag) {
    case "p": {
      return (
        <Text key={key} style={s.bodyText}>
          {children}
        </Text>
      );
    }
    case "h2": {
      return (
        <Text key={key} style={s.h2text}>
          {children}
        </Text>
      );
    }
    case "strong":
    case "b": {
      const next = { ...inherited, bold: true };
      const inner = Array.from(el.childNodes)
        .map((child, i) => walkNode(child, next, `${key}-${i}`, s))
        .filter(Boolean);
      return (
        <Text key={key} style={inlineStyle(next, s)}>
          {inner}
        </Text>
      );
    }
    case "em":
    case "i": {
      const next = { ...inherited, italic: true };
      const inner = Array.from(el.childNodes)
        .map((child, i) => walkNode(child, next, `${key}-${i}`, s))
        .filter(Boolean);
      return (
        <Text key={key} style={inlineStyle(next, s)}>
          {inner}
        </Text>
      );
    }
    case "ul":
    case "ol": {
      const items = Array.from(el.children)
        .filter((c) => c.tagName.toLowerCase() === "li")
        .map((li, i) => {
          const marker = tag === "ol" ? `${i + 1}.` : s.bulletChar;
          const liChildren = Array.from(li.childNodes)
            .map((child, j) => walkNode(child, inherited, `${key}-li${i}-${j}`, s))
            .filter(Boolean);
          return (
            <View key={`${key}-li${i}`} style={s.listRow}>
              <Text style={s.bullet}>{marker}</Text>
              <Text style={s.listText}>{liChildren}</Text>
            </View>
          );
        });
      return (
        <View key={key} style={{ marginBottom: 2 }}>
          {items}
        </View>
      );
    }
    case "br": {
      return "\n" as unknown as React.ReactElement;
    }
    default:
      if (children.length === 0) return null;
      return (
        <Text key={key} style={inlineStyle(inherited, s)}>
          {children}
        </Text>
      );
  }
}

const DEFAULT_STYLE_SET: HtmlStyleSet = {
  bodyText: {},
  bold: { fontFamily: "Helvetica-Bold" },
  italic: { fontFamily: "Helvetica-Oblique" },
  boldItalic: { fontFamily: "Helvetica-BoldOblique" },
  h2text: {},
  listRow: { flexDirection: "row" },
  bullet: {},
  listText: {},
  bulletChar: "•",
};

export function htmlToPdfNodes(html: string, s: HtmlStyleSet = DEFAULT_STYLE_SET): React.ReactElement[] {
  if (!html || !html.trim()) return [];
  try {
    const doc = new DOMParser().parseFromString(html, "text/html");
    const nodes: React.ReactElement[] = [];
    Array.from(doc.body.childNodes).forEach((node, i) => {
      const result = walkNode(node, {}, `node-${i}`, s);
      if (!result) return;
      if (typeof result === "string") {
        // Wrap top-level bare text so it is not silently dropped from the PDF.
        if (!result.trim()) return;
        nodes.push(
          <Text key={`node-${i}`} style={s.bodyText}>
            {result}
          </Text>,
        );
        return;
      }
      nodes.push(result);
    });
    return nodes;
  } catch {
    return [];
  }
}
