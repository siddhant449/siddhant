import { About } from "@/components/about";
import { Contact } from "@/components/contact";
import { Hero } from "@/components/hero";
import { Manifesto } from "@/components/manifesto";
import { Nav } from "@/components/nav";
import { PrivateWork } from "@/components/private-work";
import { Services } from "@/components/services";
import { Stack } from "@/components/stack";
import { Work } from "@/components/work";

export default function Home() {
  return (
    <>
      <a
        href="#main"
        className="fixed left-4 top-4 z-[110] -translate-y-24 rounded-full bg-chalk px-5 py-3 text-[14px] font-semibold text-ink focus:translate-y-0"
      >
        Skip to content
      </a>
      <Nav />
      <main id="main">
        <Hero />
        <Manifesto />
        <Work />
        <PrivateWork />
        <Stack />
        <Services />
        <About />
      </main>
      <Contact />
    </>
  );
}
