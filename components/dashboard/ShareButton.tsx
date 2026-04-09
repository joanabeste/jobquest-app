'use client';

import { useState } from 'react';
import { QrCode } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import ShareModal from '@/components/ShareModal';
import { getPublicUrl } from '@/lib/url';

interface ShareButtonProps {
  /** Path on this site, e.g. /jobquest/my-slug — origin is prepended at click time. */
  path: string;
  title: string;
  useCustomDomain?: boolean;
}

export default function ShareButton({ path, title, useCustomDomain }: ShareButtonProps) {
  const { company } = useAuth();
  const [open, setOpen] = useState(false);
  const url = getPublicUrl(path, company, useCustomDomain);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
        title="Teilen & QR-Code"
      >
        <QrCode size={14} />
      </button>
      {open && (
        <ShareModal
          url={url}
          title={title}
          logoUrl={company?.corporateDesign?.faviconUrl || company?.logo}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
