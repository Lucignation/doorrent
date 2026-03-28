import type { NextApiRequest, NextApiResponse } from "next";

function getBaseOrigin(request: NextApiRequest) {
  const forwardedProto = request.headers["x-forwarded-proto"];
  const proto = Array.isArray(forwardedProto)
    ? forwardedProto[0]
    : forwardedProto?.split(",")[0]?.trim() || "https";
  const host = request.headers.host || "usedoorrent.com";

  return `${proto}://${host}`;
}

export default function handler(request: NextApiRequest, response: NextApiResponse) {
  const origin = getBaseOrigin(request);
  const logoUrl = `${origin}/doorrent-logo.png`;

  response.setHeader("Cache-Control", "no-store");

  response.status(200).json({
    addOns: {
      common: {
        name: "DoorRent Meet Companion",
        logoUrl,
      },
      meet: {
        supportsCollaboration: true,
        termsUri: `${origin}/terms`,
        web: {
          sidePanelUrl: `${origin}/meet-addon`,
          supportsScreenSharing: true,
          addOnOrigins: [origin],
          logoUrl,
          darkModeLogoUrl: logoUrl,
        },
      },
    },
  });
}
