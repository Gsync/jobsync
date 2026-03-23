import { NextRequest, NextResponse } from "next/server";
import { getLocaleFromCookie } from "@/i18n/server";

const ESCO_SEARCH_URL = "https://ec.europa.eu/esco/api/search";

export interface EscoSearchResult {
  uri: string;
  title: string;
  code: string;
  broaderIscoGroup?: string[];
}

export interface EscoSearchResponse {
  results: EscoSearchResult[];
  total: number;
}

export async function GET(
  request: NextRequest,
): Promise<NextResponse<EscoSearchResponse | { error: string }>> {
  const { searchParams } = request.nextUrl;
  const text = searchParams.get("text");
  const userLocale = await getLocaleFromCookie();
  const language = searchParams.get("language") ?? userLocale;
  const limit = Math.min(
    parseInt(searchParams.get("limit") ?? "10"),
    20,
  );

  if (!text || text.length < 2) {
    return NextResponse.json(
      { error: "text must be at least 2 characters" },
      { status: 400 },
    );
  }

  const url = new URL(ESCO_SEARCH_URL);
  url.searchParams.set("text", text);
  url.searchParams.set("type", "occupation");
  url.searchParams.set("language", language);
  url.searchParams.set("full", "false");
  url.searchParams.set("limit", String(limit));

  try {
    const res = await fetch(url.toString(), {
      next: { revalidate: 300 },
    });

    if (!res.ok) {
      return NextResponse.json({ results: [], total: 0 });
    }

    const data = await res.json();
    const embedded = data._embedded?.results ?? [];

    const results: EscoSearchResult[] = embedded.map(
      (r: {
        uri?: string;
        title?: string;
        code?: string;
        broaderIscoGroup?: string[];
      }) => ({
        uri: r.uri ?? "",
        title: r.title ?? "",
        code: r.code ?? "",
        broaderIscoGroup: r.broaderIscoGroup,
      }),
    );

    return NextResponse.json({
      results,
      total: data.total ?? results.length,
    });
  } catch {
    return NextResponse.json({ results: [], total: 0 });
  }
}
