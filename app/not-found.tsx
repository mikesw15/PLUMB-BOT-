import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-4xl font-bold">404 - Page Not Found</h1>
      <Link href="/" className="mt-4 text-blue-500 hover:underline">
        Go back home
      </Link>
    </div>
  );
}
