import "./globals.css";
export const metadata={
  title:"Calculadora Multiplataforma | Sunrun · Lightreach · Cash",
  description:"Plataforma solar unificada con Sunrun, Lightreach Palmetto y Cash"
};
export default function RootLayout({children}:{children:React.ReactNode}){
  return <html lang="es"><body>{children}</body></html>;
}
