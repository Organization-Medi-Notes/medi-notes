import { redirect } from 'next/navigation';

export default function Home() {
  // Redirigimos a /inicio para evitar conflictos con el archivo root y asegurar que se use el layout del dashboard
  redirect('/inicio');
}
