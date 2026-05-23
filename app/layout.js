// app/layout.js
import './globals.css';

export const metadata = {
  title: 'CrowdCommand — Stadium Mission Control',
  description:
    'Real-time crowd management command platform for stadium organizers. ' +
    'Unifies crowd flow visualization, AI threat analysis, VIP management, and emergency alerting.',
  keywords: ['crowd management', 'stadium', 'mission control', 'AI', 'real-time'],
  openGraph: {
    title: 'CrowdCommand — Stadium Mission Control',
    description: 'Real-time crowd management command platform',
    type: 'website',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#080c14" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>{children}</body>
    </html>
  );
}
