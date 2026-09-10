import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Pin the workspace root to this project. A stray package-lock.json in the
  // parent user folder makes Next.js infer the wrong root otherwise.
  outputFileTracingRoot: __dirname,
};

export default nextConfig;
