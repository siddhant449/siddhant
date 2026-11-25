import { NowWidget } from "./now";
import { SethFooterView } from "./seth-footer";

/** The site footer (server): the client footer with the server-rendered Listening & Reading widget in its slot. */
export function SethFooter() {
  return <SethFooterView now={<NowWidget />} />;
}
