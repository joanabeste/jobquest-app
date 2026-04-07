'use client';

import MediaLibrary from '@/components/shared/MediaLibrary';
import { useRouter } from 'next/navigation';

export default function MediathekPage() {
  const router = useRouter();
  return (
    <MediaLibrary
      open
      mode="manage"
      onClose={() => router.back()}
    />
  );
}
