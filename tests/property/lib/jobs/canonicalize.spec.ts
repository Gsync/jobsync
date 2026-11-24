import fc from "fast-check";
import {
  canonicalizeEntityValue as c,
  entityLabelValue,
} from "@/lib/jobs/canonicalize";

const ALPHABET = [
  ..."abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
  " ",
  "\t",
  ",",
  ..."+#.&-/()'!?",
];
const label = fc.string({ unit: fc.constantFrom(...ALPHABET), maxLength: 40 });
const OPTS = [{}, { stripLegalSuffix: true }];
const PUNCT = [..."+#&/()'!?@"];

const ACCENTED: Record<string, string> = {
  a: "á",
  e: "é",
  i: "í",
  o: "ö",
  u: "ü",
  n: "ñ",
  c: "ç",
};
const mapChars = (s: string, f: (ch: string) => string) =>
  [...s].map((ch) => (ch in ACCENTED ? f(ch) : ch)).join("");

describe("canonicalizeEntityValue properties", () => {
  it("is idempotent", () => {
    fc.assert(
      fc.property(label, fc.constantFrom(...OPTS), (x, o) => {
        expect(c(c(x, o), o)).toBe(c(x, o));
      }),
    );
  });

  it("ignores case", () => {
    fc.assert(
      fc.property(label, (x) => {
        expect(c(x.toUpperCase())).toBe(c(x));
        expect(c(x.toLowerCase())).toBe(c(x));
      }),
    );
  });

  it("ignores diacritics, precomposed or combining", () => {
    fc.assert(
      fc.property(label, (x) => {
        const precomposed = mapChars(x, (ch) => ACCENTED[ch]);
        const combining = mapChars(x, (ch) => ch + "\u0301");
        expect(c(precomposed)).toBe(c(x));
        expect(c(combining)).toBe(c(x));
      }),
    );
  });

  it("ignores whitespace and comma variants", () => {
    fc.assert(
      fc.property(
        label,
        fc.constantFrom("  ", "\t", ", ", " , "),
        fc.string({ unit: fc.constant(" "), maxLength: 3 }),
        (x, sep, pad) => {
          const spaced = pad + x.split(" ").join(sep) + pad;
          expect(c(spaced)).toBe(c(x));
        },
      ),
    );
  });

  it("strips a legal suffix to empty only when the label is empty", () => {
    fc.assert(
      fc.property(label, (x) => {
        expect(c(x, { stripLegalSuffix: true }) === "").toBe(c(x) === "");
      }),
    );
  });

  it("never collapses distinct punctuation", () => {
    expect(c("C++")).not.toBe(c("C#"));
    fc.assert(
      fc.property(
        label.filter((b) => c(b) !== ""),
        fc.constantFrom(...PUNCT),
        fc.constantFrom(...PUNCT),
        (b, p, q) => {
          fc.pre(p !== q);
          expect(c(b + p)).not.toBe(c(b + q));
        },
      ),
    );
  });

  it("a4227601: entityLabelValue decodes HTML-escaped labels", () => {
    const escaped = (s: string) =>
      s
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
    fc.assert(
      fc.property(
        fc.string({ unit: fc.constantFrom(...ALPHABET, "<", ">", '"') }),
        (x) => {
          expect(entityLabelValue(escaped(x))).toBe(entityLabelValue(x));
        },
      ),
    );
  });
});
