import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'SmartTrack Pro — Attendance Engine',
  description: 'Academic Attendance Forecaster & Relational Tracker',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-950 text-slate-100 antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
