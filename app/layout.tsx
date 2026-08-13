import "./globals.css";

export const metadata = {
  title: "HQS Energy | Calculadora Multiplataforma",
  description: "Calculadora interna multiplataforma de HQS Energy",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
