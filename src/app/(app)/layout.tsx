import { Sidebar } from '@/components/sidebar/sidebar';
import { QueryProvider } from '@/lib/client/providers';
import { cookies } from 'next/headers';
import { DatabaseUrlInput } from '@/app/(app)/database-url-input';

export default async function AuthLayout({
  children,
  settingsModal,
}: Readonly<{
  children: React.ReactNode;
  settingsModal: React.ReactNode;
}>) {
  const cookieStore = await cookies();

  const layout = cookieStore.get('react-resizable-panels:layout');
  const collapsed = cookieStore.get('react-resizable-panels:collapsed');
  const defaultLayout = layout ? JSON.parse(layout.value) : undefined;
  const defaultCollapsed = collapsed ? JSON.parse(collapsed.value) : undefined;

  // Check if we have a database URL (either from env or cookie)
  const hasDatabaseUrl = process.env.DATABASE_URL || cookieStore.get('database_url');

  if (Boolean(process.env.IS_CLI) && !process.env.DATABASE_URL) {
    return (
      <div className="flex items-center justify-center size-full text-sm uppercase font-mono">
        <p>
          <span className="text-tertiary font-medium">DATABASE_URL</span> not found in environment variables.
        </p>
      </div>
    );
  }

  // If not in CLI mode and no database URL, show the input form
  if (!process.env.IS_CLI && !hasDatabaseUrl) {
    return <DatabaseUrlInput />;
  }

  return (
    <QueryProvider>
      <Sidebar defaultLayout={defaultLayout || [25, 75]} defaultCollapsed={defaultCollapsed}>
        {children}
        {settingsModal}
      </Sidebar>
    </QueryProvider>
  );
}
