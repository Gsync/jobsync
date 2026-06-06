import React from "react";
import { Text, View } from "@react-pdf/renderer";
import { styles } from "./primitives";

// Use numeric constants — the `Node` global is not available in all rendering contexts
const TEXT_NODE = 3;
const ELEMENT_NODE = 1;

type InheritedStyle = {
  bold?: boolean;
  italic?: boolean;
};

function inlineStyle(inherited: InheritedStyle) {
  if (inherited.bold && inherited.italic) return styles.boldItalic;
  if (inherited.bold) return styles.bold;
  if (inherited.italic) return styles.italic;
  return undefined;
}

function walkNode(
  node: ChildNode,
  inherited: InheritedStyle,
  key: string,
): React.ReactElement | string | null {
  if (node.nodeType === TEXT_NODE) {
    const text = node.textContent ?? "";
    if (!text) return null;
    const s = inlineStyle(inherited);
    return s ? (
      <Text key={key} style={s}>
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
    .map((child, i) => walkNode(child, inherited, `${key}-${i}`))
    .filter(Boolean);

  switch (tag) {
    case "p": {
      return (
        <Text key={key} style={styles.bodyText}>
          {children}
        </Text>
      );
    }
    case "h2": {
      return (
        <Text key={key} style={styles.h2text}>
          {children}
        </Text>
      );
    }
    case "strong":
    case "b": {
      const next = { ...inherited, bold: true };
      const inner = Array.from(el.childNodes)
        .map((child, i) => walkNode(child, next, `${key}-${i}`))
        .filter(Boolean);
      const s = inlineStyle(next);
      return (
        <Text key={key} style={s}>
          {inner}
        </Text>
      );
    }
    case "em":
    case "i": {
      const next = { ...inherited, italic: true };
      const inner = Array.from(el.childNodes)
        .map((child, i) => walkNode(child, next, `${key}-${i}`))
        .filter(Boolean);
      const s = inlineStyle(next);
      return (
        <Text key={key} style={s}>
          {inner}
        </Text>
      );
    }
    case "ul":
    case "ol": {
      const items = Array.from(el.children)
        .filter((c) => c.tagName.toLowerCase() === "li")
        .map((li, i) => {
          const marker = tag === "ol" ? `${i + 1}.` : "•";
          const liChildren = Array.from(li.childNodes)
            .map((child, j) =>
              walkNode(child, inherited, `${key}-li${i}-${j}`),
            )
            .filter(Boolean);
          return (
            <View key={`${key}-li${i}`} style={styles.listRow}>
              <Text style={styles.bullet}>{marker}</Text>
              <Text style={styles.listText}>{liChildren}</Text>
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
        <Text key={key} style={inlineStyle(inherited)}>
          {children}
        </Text>
      );
  }
}

export function htmlToPdfNodes(html: string): React.ReactElement[] {
  if (!html || !html.trim()) return [];
  try {
    const doc = new DOMParser().parseFromString(html, "text/html");
    const nodes: React.ReactElement[] = [];
    Array.from(doc.body.childNodes).forEach((node, i) => {
      const result = walkNode(node, {}, `node-${i}`);
      if (!result) return;
      if (typeof result === "string") {
        // Wrap top-level bare text (plain-text content with no block wrapper)
        // so it is not silently dropped from the PDF.
        if (!result.trim()) return;
        nodes.push(
          <Text key={`node-${i}`} style={styles.bodyText}>
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
