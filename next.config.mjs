/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // Allow Google Maps images and Firebase domains
  images: {
    domains: ['maps.googleapis.com', 'maps.gstatic.com'],
  },
};

export default nextConfig;
