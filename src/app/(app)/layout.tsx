import { Sidebar } from '@/components/sidebar/sidebar';
import { QueryProvider } from '@/lib/client/providers';
import { cookies } from 'next/headers';

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

  if (Boolean(process.env.IS_CLI) && !process.env.DATABASE_URL)
    return (
      <div className="flex items-center justify-center size-full text-sm uppercase font-mono">
        <p>
          <span className="text-tertiary font-medium">DATABASE_URL</span> not found in environment variables.
        </p>
      </div>
    );

  return (
    <QueryProvider>
      <Sidebar defaultLayout={defaultLayout || [25, 75]} defaultCollapsed={defaultCollapsed}>
        {children}
        {settingsModal}
      </Sidebar>
    </QueryProvider>
  );
}
