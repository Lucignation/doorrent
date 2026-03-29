export const STRUCTURED_SIGNATURE_PREFIX = "doorrent-signature:";

export type StructuredSignaturePoint = [number, number];
export type StructuredSignatureStroke = StructuredSignaturePoint[];

export type StructuredSignaturePayload = {
  version: 1;
  width: number;
  height: number;
  strokes: StructuredSignatureStroke[];
  strokeWidth?: number;
  strokeColor?: string;
};

function clampNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function buildStructuredSignatureData(
  payload: StructuredSignaturePayload,
) {
  return `${STRUCTURED_SIGNATURE_PREFIX}${JSON.stringify(payload)}`;
}

export function parseStructuredSignatureData(
  value: string | null | undefined,
): StructuredSignaturePayload | null {
  if (!value?.startsWith(STRUCTURED_SIGNATURE_PREFIX)) {
    return null;
  }

  try {
    const raw = JSON.parse(value.slice(STRUCTURED_SIGNATURE_PREFIX.length));
    if (!raw || typeof raw !== "object") {
      return null;
    }

    const strokes = Array.isArray((raw as { strokes?: unknown }).strokes)
      ? (raw as { strokes: unknown[] }).strokes
          .map((stroke) => {
            if (!Array.isArray(stroke)) {
              return null;
            }

            const points = stroke
              .map((point) => {
                if (!Array.isArray(point) || point.length < 2) {
                  return null;
                }

                const x = point[0];
                const y = point[1];
                if (
                  typeof x !== "number" ||
                  !Number.isFinite(x) ||
                  typeof y !== "number" ||
                  !Number.isFinite(y)
                ) {
                  return null;
                }

                return [x, y] as StructuredSignaturePoint;
              })
              .filter(Boolean) as StructuredSignaturePoint[];

            return points.length ? points : null;
          })
          .filter(Boolean) as StructuredSignatureStroke[]
      : [];

    if (!strokes.length) {
      return null;
    }

    return {
      version: 1,
      width: clampNumber((raw as { width?: unknown }).width, 320),
      height: clampNumber((raw as { height?: unknown }).height, 160),
      strokes,
      strokeWidth: clampNumber(
        (raw as { strokeWidth?: unknown }).strokeWidth,
        2.6,
      ),
      strokeColor:
        typeof (raw as { strokeColor?: unknown }).strokeColor === "string"
          ? (raw as { strokeColor: string }).strokeColor
          : "#111827",
    };
  } catch {
    return null;
  }
}

function buildStructuredSignatureSvg(payload: StructuredSignaturePayload) {
  const width = Math.max(1, payload.width);
  const height = Math.max(1, payload.height);
  const strokeWidth = Math.max(1.5, payload.strokeWidth ?? 2.6);
  const strokeColor = payload.strokeColor ?? "#111827";

  const body = payload.strokes
    .map((stroke) => {
      if (stroke.length === 1) {
        const [x, y] = stroke[0];
        return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(
          1,
        )}" r="${Math.max(1.4, strokeWidth / 2).toFixed(1)}" fill="${strokeColor}" />`;
      }

      const points = stroke
        .map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`)
        .join(" ");
      return `<polyline points="${points}" fill="none" stroke="${strokeColor}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" />`;
    })
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="white"/><g>${body}</g></svg>`;
}

export function resolveSignatureDisplayUrl(
  value: string | null | undefined,
): string | null {
  const structured = parseStructuredSignatureData(value);
  if (structured) {
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
      buildStructuredSignatureSvg(structured),
    )}`;
  }

  return value ?? null;
}

export function canRenderSignaturePreview(value: string | null | undefined) {
  const resolved = resolveSignatureDisplayUrl(value);
  if (!resolved) {
    return false;
  }

  const normalized = resolved.trim().toLowerCase();
  return (
    normalized.startsWith("data:image/") ||
    normalized.startsWith("https://") ||
    normalized.startsWith("http://") ||
    normalized.startsWith("blob:")
  );
}
