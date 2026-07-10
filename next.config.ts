import type { NextConfig } from "next";

// DEPLOY_TARGET env var controls the build mode:
//   "server"  → Next.js server (node_modules/.bin/next start) for cloud / VPS
//   unset     → static export (`output: "export"`) for GitHub Pages / CDN
const isServerDeploy =
  process.env.DEPLOY_TARGET === "server" ||
  process.env.NODE_ENV === "development";
const isGithubPages =
  !isServerDeploy && process.env.GITHUB_ACTIONS === "true";
const repoName = "timix_share";

const nextConfig: NextConfig = {
  devIndicators: false,
  ...(isServerDeploy
    ? {
        async headers() {
          return [
            {
              source: "/(.*)",
              headers: [
                {
                  key: "X-Content-Type-Options",
                  value: "nosniff",
                },
                {
                  key: "X-Frame-Options",
                  value: "SAMEORIGIN",
                },
                {
                  key: "Referrer-Policy",
                  value: "strict-origin-when-cross-origin",
                },
                {
                  key: "Permissions-Policy",
                  value: "camera=(), microphone=(), geolocation=()",
                },
              ],
            },
          ];
        },
      }
    : {}),

  // Static-export settings — only active for GitHub Pages builds.
  // When DEPLOY_TARGET=server we omit `output` so Next.js runs its own server.
  ...(isServerDeploy
    ? {}
    : {
        output: "export" as const,
        trailingSlash: true,
        images: {
          unoptimized: true,
        },
      }),

  basePath: isGithubPages ? `/${repoName}` : "",
  assetPrefix: isGithubPages ? `/${repoName}/` : undefined,
};

export default nextConfig;
