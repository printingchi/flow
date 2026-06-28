export const metadata = {
  title: 'FLOW — Orbital Trading Engine',
  description: 'Quantum-powered orbital mechanics trading signal platform',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, background: '#070a13' }}>
        {children}
      </body>
    </html>
  );
}
