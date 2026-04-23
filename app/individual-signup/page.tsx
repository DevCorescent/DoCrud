import IndividualSignupForm from '@/components/IndividualSignupForm';
import { buildPageMetadata } from '@/lib/seo';

export const metadata = buildPageMetadata({
  title: 'Individual Signup | Create Your Docrud Profile',
  description: 'Create your Docrud individual profile to access resume tools, AI features, secure sharing, and personal workflows.',
  path: '/individual-signup',
  keywords: ['individual signup', 'personal profile', 'docrud account'],
  noIndex: true,
});

export default function IndividualSignupPage({
  searchParams,
}: {
  searchParams?: { plan?: string; config?: string };
}) {
  return (
    <div className="min-h-screen px-4 py-8">
      <div className="mx-auto max-w-6xl">
        <IndividualSignupForm initialPlanId={searchParams?.plan} initialConfig={searchParams?.config} />
      </div>
    </div>
  );
}
