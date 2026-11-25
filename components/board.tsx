import Image from "next/image";
import type { LiveProject } from "@/lib/content";

/**
 * A presentation board: the project's colour, its desktop site and a phone in
 * front. The WebGL stage redraws it as a sheet that bends with the scroll; the
 * DOM version underneath is the fallback. Sizes: the board is up to ~94vw wide (case pages),
 * the desktop shot 64% of it and the phone 20%.
 */
export function Board({ project }: { project: LiveProject }) {
  return (
    <div
      data-gl="showcase"
      data-desktop={project.images.hero}
      data-mobile={project.images.mobile}
      data-bg={project.tone}
      data-radius="16"
      className="relative aspect-[2/1] overflow-hidden rounded-2xl"
    >
      <div className="gl-fallback absolute inset-0" style={{ background: project.tone }}>
        <div className="absolute left-[7.5%] top-[13%] aspect-[16/10] w-[64%] overflow-hidden rounded-md shadow-2xl">
          <Image src={project.images.hero} alt={project.images.alt} fill sizes="60vw" className="object-cover object-top" />
        </div>
        <div className="absolute left-[64%] top-[9%] aspect-[0.47] h-[86%] overflow-hidden rounded-[18px] border-[5px] border-[#0b0b0c] bg-[#0b0b0c] shadow-2xl">
          <Image src={project.images.mobile} alt={project.images.mobileAlt} fill sizes="20vw" className="object-cover object-top" />
        </div>
      </div>
    </div>
  );
}

