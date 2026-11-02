"use client";

import Hero from "./Hero";
import Switch from "./scenes/Switch";
import Showcase from "./work/Showcase";
import BSide from "./bside/BSide";
import RecordChange from "./scenes/RecordChange";
import Credits from "./credits/Credits";

/** The home page as a shot list: SC.01 → SC.06. Sound, light and chrome live in Shell. */
export default function Experience() {
  return (
    <main>
      <Hero />
      <Switch />
      <Showcase />
      <BSide />
      <RecordChange />
      <Credits />
    </main>
  );
}
