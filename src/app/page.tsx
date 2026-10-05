import { getHomeFeedData } from '@/actions/feed';
import { HomeFeedView } from '@/components/home/HomeFeedView';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const feedData = await getHomeFeedData('all');

  return <HomeFeedView initialData={feedData} />;
}
