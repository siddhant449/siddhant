import { About } from "@/components/about";
import { Contact } from "@/components/contact";
import { DesignWork } from "@/components/design-work";
import { Engineering } from "@/components/engineering";
import { Hero } from "@/components/hero";
import { Lens } from "@/components/lens";
import { Nav } from "@/components/nav";
import { Toolbox } from "@/components/toolbox";

export default function Home() {
  return (
    <>
      <a
        href="#main"
        className="btn btn-solid fixed left-4 top-4 z-[110] -translate-y-24 focus:translate-y-0"
      >
        Skip to content
      </a>
      <Nav />
      <main id="main">
        <Hero />
        <DesignWork />
        <Lens />
        <Engineering />
        <Toolbox />
        <About />
      </main>
      <Contact />
    </>
  );
}
