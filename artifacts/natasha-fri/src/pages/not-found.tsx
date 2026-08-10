import { Search } from "lucide-react";
import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="flex w-full flex-col items-center justify-center min-h-[100dvh] bg-[#050506] text-white">
      <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-6">
        <Search className="h-8 w-8 text-muted-foreground" />
      </div>
      <h1 className="text-4xl font-bold mb-4 font-serif text-white">404</h1>
      <p className="text-muted-foreground mb-8 text-center max-w-md">
        Страница не найдена или была перемещена в закрытый архив.
      </p>
      <Link href="/" className="bg-primary text-primary-foreground px-6 py-2 text-sm font-medium tracking-wide">
        НА ГЛАВНУЮ
      </Link>
    </div>
  );
}
