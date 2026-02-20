import { NextRequest, NextResponse } from "next/server";
import {
  EURES_AUTOCOMPLETE_URL,
  type EuresAutocompleteResponse,
} from "@/lib/scraper/eures/autocomplete";

const LANGUAGE_PATTERN = /^[a-z]{2}$/;
const MIN_KEYWORD_LENGTH = 2;
const MAX_KEYWORD_LENGTH = 100;
const MAX_RESULTS = 50;
const DEFAULT_RESULTS = 10;
const DEFAULT_LANGUAGE = "en";

export async function GET(
  request: NextRequest
): Promise<NextResponse<EuresAutocompleteResponse | { error: string }>> {
  const { searchParams } = request.nextUrl;

  const keyword = searchParams.get("keyword");
  if (
    !keyword ||
    keyword.length < MIN_KEYWORD_LENGTH ||
    keyword.length > MAX_KEYWORD_LENGTH
  ) {
    return NextResponse.json(
      {
        error: `keyword must be between ${MIN_KEYWORD_LENGTH} and ${MAX_KEYWORD_LENGTH} characters`,
      },
      { status: 400 }
    );
  }

  const language = searchParams.get("language") ?? DEFAULT_LANGUAGE;
  if (!LANGUAGE_PATTERN.test(language)) {
    return NextResponse.json(
      { error: "language must be a 2-letter lowercase ISO code" },
      { status: 400 }
    );
  }

  const rawNbResults = searchParams.get("nbResults");
  let nbResults = DEFAULT_RESULTS;
  if (rawNbResults !== null) {
    const parsed = Number(rawNbResults);
    if (!Number.isInteger(parsed) || parsed < 1) {
      return NextResponse.json(
        { error: "nbResults must be a positive integer" },
        { status: 400 }
      );
    }
    nbResults = Math.min(parsed, MAX_RESULTS);
  }

  const upstream = new URL(EURES_AUTOCOMPLETE_URL);
  upstream.searchParams.set("keyword", keyword);
  upstream.searchParams.set("language", language);
  upstream.searchParams.set("nbResults", String(nbResults));

  try {
    const response = await fetch(upstream.toString(), {
      next: { revalidate: 60 },
    });

    if (!response.ok) {
      return NextResponse.json({ results: [] });
    }

    const data: EuresAutocompleteResponse = await response.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ results: [] });
  }
}
