import ReviewClient from './ReviewClient';

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function ReviewPage({ params }: PageProps) {
  const { token } = await params;
  return <ReviewClient token={token} />;
}

export const metadata = {
  title: 'Review',
  robots: { index: false, follow: false },
};
