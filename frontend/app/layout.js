import './globals.css';

export const metadata = {
  title: 'Ecomind — Intelligent Financial Sovereign',
  description: 'Five Agents. One Mission. Total Sovereignty.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
