import PublishedItemPage from '@/components/PublishedItemPage';

export default function Page({ params }: { params: { id: string } }) {
  return <PublishedItemPage id={params.id} />;
}
