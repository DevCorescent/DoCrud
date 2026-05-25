/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: [
      'puppeteer',
      'puppeteer-core',
      'pdf-parse',
      'mammoth',
      'pdfjs-dist',
      'pg',
      '@xmldom/xmldom',
    ],
    optimizePackageImports: [
      '@supabase/ssr',
      '@supabase/supabase-js',
      '@supabase/auth-js',
      'lucide-react',
    ],
  },
}

module.exports = nextConfig
