/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Static export so the single reflective surface can be hosted on a static
  // host (Cloudflare Pages). The app talks to the GenLayer contract directly
  // from the browser, so no server runtime is required.
  output: "export",
  images: { unoptimized: true },
};

export default nextConfig;
