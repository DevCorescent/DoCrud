import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import PublicHomepage from '@/components/PublicHomepage';
import { buildPageMetadata } from '@/lib/seo';
import { getThemeSettings } from '@/lib/server/settings';
import { getAuthSession } from '@/lib/server/auth';

export const metadata = buildPageMetadata({
  title: 'Docrud | Document Management, Forms, PDF Editor, AI Tools & Secure File Sharing',
  description:
    'Docrud helps teams create documents, build forms, edit PDFs, review files with AI, share securely, and manage daily workflows from one workspace.',
  path: '/',
  keywords: ['docrud', 'document management software', 'pdf editor', 'secure file sharing', 'form builder', 'ai document review'],
});

export default async function Home() {
  const session = await getAuthSession();
  const cookieStore = await cookies();
  const isGuest = cookieStore.get('guestMode')?.value === '1';

  // Only redirect if neither authenticated nor in guest mode
  if (!session && !isGuest) {
    redirect('/onboarding');
  }

  const themeSettings = await getThemeSettings();

  return (
    <PublicHomepage
      softwareName={themeSettings.softwareName}
      accentLabel={themeSettings.accentLabel}
      guestMode={!session && isGuest}
    />
  );
}
