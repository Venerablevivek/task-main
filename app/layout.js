import './globals.css';
import { Toaster } from 'sonner';

export const metadata = {
  title: 'TaskFlow — Simple Task Manager',
  description: 'Manage your tasks effortlessly with TaskFlow.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background text-foreground antialiased">
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
