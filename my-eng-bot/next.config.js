/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    // Force pure-JS frame codec for `ws` (avoids broken bufferutil stub in serverless bundle).
    WS_NO_BUFFER_UTIL: '1',
    WS_NO_UTF_8_VALIDATE: '1',
  },
  // В dev первый запрос к крупному app router иногда долго компилируется; без этого
  // рантайм webpack может выбросить ChunkLoadError (timeout) на layout/page чанках.
  webpack: (config, { dev, isServer }) => {
    if (isServer) {
      const webpack = require('webpack')
      config.plugins.push(
        new webpack.DefinePlugin({
          'process.env.WS_NO_BUFFER_UTIL': JSON.stringify('1'),
          'process.env.WS_NO_UTF_8_VALIDATE': JSON.stringify('1'),
        })
      )
    }
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
