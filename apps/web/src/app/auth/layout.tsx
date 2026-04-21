import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Authentication' };

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary">FinVault</h1>
          <p className="text-muted-foreground mt-1">Digital Banking Platform</p>
        </div>
        {children}
      </div>
    </div>
  );
}
