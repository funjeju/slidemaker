/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { isServer, webpack }) => {
    if (!isServer) {
      // pptxgenjs pulls in Node-only modules (node:fs, node:https, …) for its
      // Node code path. In the browser it never executes them. Rewrite the
      // "node:" scheme to the bare module name, then stub those modules out so
      // the client bundle doesn't choke on the unhandled scheme.
      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(/^node:/, (resource) => {
          resource.request = resource.request.replace(/^node:/, "");
        })
      );
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        https: false,
        path: false,
        os: false,
      };
    }
    return config;
  },
};
export default nextConfig;
