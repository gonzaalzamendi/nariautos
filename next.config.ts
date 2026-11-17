import type { NextConfig } from "next";

const config: NextConfig = {
  experimental: { serverActions: { bodySizeLimit: "4mb" } },
  async headers() {
    return [{
      source: "/(.*)",
      headers: [
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        // El micrófono se delega solo al chat de Dify (entrada por voz del chatbot)
        { key: "Permissions-Policy", value: 'camera=(), microphone=(self "https://udify.app"), geolocation=()' },
      ],
    }];
  },
};
export default config;
