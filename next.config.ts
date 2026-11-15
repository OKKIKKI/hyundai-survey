import type { NextConfig } from "next";
import { resolve } from "node:path";

const nextConfig: NextConfig = {
  webpack(config, { webpack }) {
    config.plugins.push(
      new webpack.NormalModuleReplacementPlugin(
        /^cloudflare:workers$/,
        resolve("lib/vercel-survey-env.ts"),
      ),
    );
    return config;
  },
};

export default nextConfig;
