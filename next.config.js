/** @type {import('next').NextConfig} */
function galleryImageRemotePatterns() {
  /** @type {import('next').NextConfig['images']['remotePatterns']} */
  const patterns = [
    { protocol: 'https', hostname: '**.amazonaws.com', pathname: '/**' },
    { protocol: 'http', hostname: 'localhost', pathname: '/**' },
    { protocol: 'http', hostname: '127.0.0.1', pathname: '/**' },
  ];

  for (const key of ['AWS_CDN_URL', 'S3_PUBLIC_BASE_URL']) {
    const raw = process.env[key];
    if (!raw?.trim()) continue;
    try {
      const u = new URL(raw.trim());
      const protocol = u.protocol.replace(':', '');
      if (protocol === 'http' || protocol === 'https') {
        patterns.push({
          protocol,
          hostname: u.hostname,
          pathname: '/**',
        });
      }
    } catch {
      /* ignore invalid URL */
    }
  }

  return patterns;
}

const nextConfig = {
  reactStrictMode: true,
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: galleryImageRemotePatterns(),
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
};

module.exports = nextConfig;
