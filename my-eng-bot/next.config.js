/** @type {import('next').NextConfig} */
const nextConfig = {
  // В dev первый запрос к крупному app router иногда долго компилируется; без этого
  // рантайм webpack может выбросить ChunkLoadError (timeout) на layout/page чанках.
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      config.output = {
        ...config.output,
        chunkLoadTimeout: 300000,
      }
    }
    return config
  },
}

module.exports = nextConfig
