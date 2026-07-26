import Link from "next/link";
import { Globe2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="container flex min-h-[60vh] flex-col items-center justify-center text-center">
      <Globe2 className="mb-4 h-12 w-12 text-primary" />
      <h1 className="text-4xl font-bold">404</h1>
      <p className="mt-2 max-w-md text-muted-foreground">
        We couldn&apos;t find that page. The country, city or dataset may not
        exist yet.
      </p>
      <div className="mt-6 flex gap-2">
        <Button asChild>
          <Link href="/">Back home</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/fertility">Explore fertility</Link>
        </Button>
      </div>
    </div>
  );
}
