/** @type {import('next').NextConfig} */
const nextConfig = {
  // Matikan strict mode react agar tidak double fetch di dev
  reactStrictMode: false,
  
  // Izinkan gambar dari domain eksternal
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
    unoptimized: true,
  },

  // REWRITES: Ini kunci bypass CORS
  async rewrites() {
    return [
      {
        source: "/api_proxy/:path*",
        destination: "https://sapi.dramabox.be/api/:path*", 
      },
    ];
  },
};

export default nextConfig;
