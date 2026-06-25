// app/layout.js
export const metadata = {
  title: 'Thinking OS v2',
  description: 'Decision intelligence with web research',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: '#060a12' }}>{children}</body>
    </html>
  );
}