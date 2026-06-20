/** @type {import('next').NextConfig} */
const nextConfig = {
  reactCompiler: true,
  outputFileTracingExcludes: {
    '*': [
      '**/venv/**/*',
      '**/.venv/**/*',
      '**/node_modules/**/*',
      '**/local-ai/output/**/*',
      '**/generated/local-ai/output/**/*',
    ],
  },
};

export default nextConfig;
