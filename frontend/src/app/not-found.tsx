import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Compass, ArrowRight } from "lucide-react";

export default function NotFound() {
  return (
    <div className="container mx-auto flex h-[70vh] flex-col items-center justify-center px-4 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-surface-overlay border border-border text-text-muted">
        <Compass className="h-10 w-10" />
      </div>

      <h1 className="text-4xl font-extrabold tracking-tight text-text-primary">
        Destination Unknown
      </h1>

      <p className="mt-4 max-w-md text-text-secondary">
        The page you are looking for has either sailed past the timelock or never existed in this
        chain.
      </p>

      <div className="mt-10">
        <Link href="/">
          <Button size="lg" className="rounded-xl px-8">
            Return to Bridge
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
