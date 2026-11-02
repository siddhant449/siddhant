import Link from "next/link";
import { person } from "@/lib/content";

// Absolute paths so the links also work from a case-study page.
const links = [
  { href: "/#a-side", label: "Work" },
  { href: "/#b-side", label: "Engineering" },
  { href: "/#about", label: "About" },
];

export default function Nav() {
  return (
    <header className="nav">
      <Link href="/" className="nav__mark">
        Kotak<sup>®</sup>
      </Link>
      <nav aria-label="Sections" className="nav__links">
        {links.map((l) => (
          // Client-side navigation keeps the soundtrack playing between pages.
          <Link key={l.href} href={l.href}>
            {l.label}
          </Link>
        ))}
      </nav>
      <a href={person.resume} className="nav__cta" target="_blank" rel="noreferrer">
        Résumé
      </a>
    </header>
  );
}
