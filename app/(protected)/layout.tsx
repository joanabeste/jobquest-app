import Topbar from '@/components/layout/Topbar';
import CiThemeProvider from '@/components/theme/CiThemeProvider';

// Authentication is enforced by `middleware.ts`. Unauthenticated requests
// never reach this layout, so we no longer need a client-side guard / spinner.
// Keeping this as a server component also lets us shave the bundle and avoid
// the brief flash of protected UI before the client-side check finished.
export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <CiThemeProvider>
      <div className="min-h-screen bg-slate-50">
        <Topbar />
        <main className="pt-14">{children}</main>
      </div>
    </CiThemeProvider>
  );
}
