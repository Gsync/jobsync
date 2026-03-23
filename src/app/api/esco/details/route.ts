import { NextRequest, NextResponse } from "next/server";

const ESCO_RESOURCE_URL = "https://ec.europa.eu/esco/api/resource/occupation";

export interface EscoOccupationDetails {
  uri: string;
  title: string;
  code: string;
  description: string;
  broaderIscoGroup?: {
    uri: string;
    title: string;
    code: string;
  };
  escoUrl: string;
  euresSearchUrl: string;
}

export async function GET(
  request: NextRequest,
): Promise<NextResponse<EscoOccupationDetails | { error: string }>> {
  const { searchParams } = request.nextUrl;
  const uri = searchParams.get("uri");
  const language = searchParams.get("language") ?? "en";

  if (!uri) {
    return NextResponse.json({ error: "uri is required" }, { status: 400 });
  }

  const url = new URL(ESCO_RESOURCE_URL);
  url.searchParams.set("uri", uri);
  url.searchParams.set("language", language);

  try {
    const res = await fetch(url.toString(), {
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "Failed to fetch occupation details" },
        { status: 502 },
      );
    }

    const data = await res.json();
    const title = data.title ?? "";
    const description =
      data.description?.[language]?.literal ??
      data.description?.en?.literal ??
      "";
    const code = data.code ?? "";

    const broaderGroup = data._links?.broaderIscoGroup?.[0];
    const broaderIscoGroup = broaderGroup
      ? {
          uri: broaderGroup.uri ?? "",
          title: broaderGroup.title ?? "",
          code: broaderGroup.code ?? "",
        }
      : undefined;

    // Build portal URLs
    const escoUrl = `https://esco.ec.europa.eu/en/classification/occupation?uri=${encodeURIComponent(uri)}`;
    const euresSearchUrl = `https://europa.eu/eures/portal/jv-se/home?keyword=${encodeURIComponent(title)}`;

    return NextResponse.json({
      uri,
      title,
      code,
      description,
      broaderIscoGroup,
      escoUrl,
      euresSearchUrl,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch occupation details" },
      { status: 502 },
    );
  }
}
