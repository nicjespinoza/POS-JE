import type { Metadata } from "next";
import "./globals.css";
import { CartProvider } from "../contexts/CartContext";
import { AuthProvider } from "../contexts/AuthContext";
import { DataProvider } from "../providers/DataProvider";
import { Toaster } from 'sonner';

export const metadata: Metadata = {
  title: "Titanium Store",
  description: "Premium Footwear E-commerce",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;

}>) {
  return (
    <html lang="es">
      <body className="antialiased bg-black text-white">
        <AuthProvider>
          <DataProvider>
            <CartProvider>
              {children}
              <Toaster position="top-center" richColors />
            </CartProvider>
          </DataProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
