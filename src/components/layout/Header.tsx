
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BellIcon, SearchIcon } from "lucide-react";

export function Header() {
  return (
    <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-6">
      <div className="flex items-center gap-2 md:w-72">
        <div className="relative">
          <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
          <Input
            type="search"
            placeholder="Search..."
            className="w-full bg-slate-50 pl-8 focus-visible:ring-primary"
          />
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="relative">
          <BellIcon className="h-5 w-5" />
          <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-secondary" />
        </Button>
        
        <Button variant="default" className="font-medium">
          Upgrade to Pro
        </Button>
      </div>
    </header>
  );
}
