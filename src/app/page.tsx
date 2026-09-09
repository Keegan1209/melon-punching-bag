import { ExperienceLoader } from "@/components/ExperienceLoader";

/**
 * No loading screen by design: the shell paints the background colour
 * immediately and the scene mounts into it, so there is never a spinner.
 */
export default function Page() {
  return (
    <main id="stage">
      <div id="frame">
        <ExperienceLoader />
      </div>
    </main>
  );
}
