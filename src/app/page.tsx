import { Notes } from "~/app/_components/notes";
import { api, HydrateClient } from "~/trpc/server";
import { ModeToggle } from "~/components/ui/modeToggle";

export default async function Home() {
  return (
    <HydrateClient>
      <main className="flex min-h-screen flex-col items-center justify-center">
        <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16">
          <h1 className="text-5xl font-extrabold tracking-tight sm:text-[5rem]">
            Notetaker <span className="bg-gradient-to-r from-purple-500 to-blue-500 bg-clip-text text-transparent">Pro</span>
          </h1>
          <ModeToggle />
          <Notes />
        </div>
      </main>
    </HydrateClient>
  );
}