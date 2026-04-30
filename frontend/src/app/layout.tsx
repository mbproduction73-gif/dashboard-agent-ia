import type { Metadata } from 'next';
import { Toaster } from 'react-hot-toast';
import './globals.css';

export const metadata: Metadata = {
  title: 'AgendaPro - Gestion de rendez-vous',
  description: 'Automatisez vos rendez-vous grâce à l\'IA et WhatsApp',
  icons: { icon: '/favicon.ico' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: { background: '#1f2937', color: '#f9fafb', fontSize: '14px' },
            success: { iconTheme: { primary: '#10b981', secondary: '#f9fafb' } },
            error:   { iconTheme: { primary: '#ef4444', secondary: '#f9fafb' } },
          }}
        />
      </body>
    </html>
  );
}
