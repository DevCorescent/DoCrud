import type { Metadata } from 'next'
import Script from 'next/script'
import './globals.css'
import { SessionProvider } from './components/SessionProvider'
import { ThemeController } from './components/ThemeController'
import { getPublicAppBaseUrl } from '@/lib/url'
import { policyCompany } from '@/lib/policies'

const siteUrl = getPublicAppBaseUrl()
const metadataBase = new URL(siteUrl)
const googleAnalyticsId = 'G-DK5LP1JM9W'
const siteTitle = 'Docrud | Document Management, Forms, PDF Editor, AI Tools & Secure File Sharing'
const siteDescription =
  'Docrud helps teams manage documents, build forms, edit PDFs, review content with AI, share files securely, and run workflows from one workspace.'
const siteKeywords = [
  'document management software',
  'pdf editor',
  'form builder',
  'secure file sharing',
  'document workflow software',
  'ai document review',
  'resume ats checker',
  'virtual id cards',
  'e certificate generator',
  'document collaboration platform',
]

export const metadata: Metadata = {
  metadataBase,
  title: {
    default: siteTitle,
    template: '%s | Docrud',
  },
  description: siteDescription,
  applicationName: 'Docrud',
  keywords: siteKeywords,
  authors: [{ name: policyCompany.parentCompanyName, url: siteUrl }],
  creator: policyCompany.parentCompanyName,
  publisher: policyCompany.parentCompanyName,
  alternates: {
    canonical: '/',
  },
  category: 'technology',
  classification: 'Business software',
  referrer: 'origin-when-cross-origin',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: 'website',
    url: siteUrl,
    siteName: 'Docrud',
    title: siteTitle,
    description: siteDescription,
    images: [
      {
        url: '/docrud-logo.png',
        width: 2046,
        height: 769,
        alt: 'Docrud',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: siteTitle,
    description: siteDescription,
    images: ['/docrud-logo.png'],
  },
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: '/docrud-favicon.png',
    apple: '/docrud-favicon.png',
    shortcut: '/docrud-favicon.png',
  },
  manifest: '/manifest.webmanifest',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${siteUrl}/#organization`,
        name: 'Docrud',
        url: siteUrl,
        logo: `${siteUrl}/docrud-favicon.png`,
        image: `${siteUrl}/docrud-logo.png`,
        email: 'sales@docrud.app',
        parentOrganization: {
          '@type': 'Organization',
          name: policyCompany.parentCompanyName,
        },
      },
      {
        '@type': 'WebSite',
        '@id': `${siteUrl}/#website`,
        url: siteUrl,
        name: 'Docrud',
        description: siteDescription,
        publisher: {
          '@id': `${siteUrl}/#organization`,
        },
        potentialAction: {
          '@type': 'SearchAction',
          target: `${siteUrl}/file-directory?search={search_term_string}`,
          'query-input': 'required name=search_term_string',
        },
      },
      {
        '@type': 'SoftwareApplication',
        '@id': `${siteUrl}/#software`,
        name: 'Docrud',
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web',
        url: siteUrl,
        description: siteDescription,
        image: `${siteUrl}/docrud-logo.png`,
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'USD',
        },
        creator: {
          '@id': `${siteUrl}/#organization`,
        },
        featureList: [
          'Document management',
          'Form builder',
          'PDF editor',
          'AI document review',
          'Secure file sharing',
          'Workflow execution',
        ],
      },
    ],
  }

  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@200..800&display=swap" rel="stylesheet" />
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${googleAnalyticsId}`}
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${googleAnalyticsId}');
          `}
        </Script>
      </head>
      <body className="bg-slate-100 text-slate-950 antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        <SessionProvider>
          <ThemeController />
          {children}
        </SessionProvider>
      </body>
    </html>
  )
}
