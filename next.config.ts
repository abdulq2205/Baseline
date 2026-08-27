import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Next 16 writes AGENTS.md and CLAUDE.md into the repo root on every dev run.
  // This project does not want them tracked.
  agentRules: false,
};

export default nextConfig;
