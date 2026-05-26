/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: [
      // PDF / document processing — keep server-side only
      'puppeteer',
      'puppeteer-core',
      'pdf-parse',
      'pdf-lib',
      'pdfjs-dist',
      'mammoth',
      '@xmldom/xmldom',
      // Spreadsheet / archive
      'xlsx',
      'jszip',
      // DB
      'pg',
    ],
    optimizePackageImports: [
      '@supabase/ssr',
      '@supabase/supabase-js',
      '@supabase/auth-js',
      'lucide-react',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-dialog',
      '@radix-ui/react-tabs',
      '@radix-ui/react-select',
    ],
  },
  images: {
    // Allow external image domains used in the app
    remotePatterns: [
      { protocol: 'https', hostname: 'api.qrserver.com' },
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: '**.supabase.in' },
    ],
  },
  // Compress responses
  compress: true,
}

module.exports = nextConfig
