import { redirect } from 'next/navigation';

export default function HomePage() {
  // Redirigir a login por defecto
  redirect('/login');
}
