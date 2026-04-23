import type { Metadata } from 'next';
import { getPublicAppBaseUrl } from '@/lib/url';

type PageMetadataOptions = {
  title: string;
  description: string;
  path: string;
  keywords?: string[];
  image?: string;
  noIndex?: boolean;
};

const defaultOgImage = '/docrud-favicon.png';

export function buildPageMetadata({
  title,
  description,
  path,
  keywords = [],
  image = defaultOgImage,
  noIndex = false,
}: PageMetadataOptions): Metadata {
  const baseUrl = getPublicAppBaseUrl();
  const url = new URL(path, baseUrl).toString();
  const imageUrl = new URL(image, baseUrl).toString();

  return {
    title,
    description,
    keywords,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title,
      description,
      url,
      images: [
        {
          url: imageUrl,
          width: 512,
          height: 512,
          alt: title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl],
    },
    robots: noIndex
      ? {
          index: false,
          follow: false,
          googleBot: {
            index: false,
            follow: false,
          },
        }
      : undefined,
  };
}

