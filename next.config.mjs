/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Static export is sufficient because the browser talks directly to the
  // configured GenLayer contract and no server runtime is required.
  output: "export",
  images: { unoptimized: true },
};

export default nextConfig;
