import type { Metadata } from "next";
import { LegalLayout } from "@/components/legal/LegalLayout";

export const metadata: Metadata = {
  title: "Terms of Service — BLAST RIFF",
  description: "The terms that govern your use of Blast Riff.",
};

const LAST_UPDATED = "August 10, 2026";

export default function TermsPage() {
  return (
    <LegalLayout title="Terms of Service" lastUpdated={LAST_UPDATED}>
      <p>
        These terms govern your use of Blast Riff. By creating an account or using the app, you agree to them. If
        you don&apos;t agree, please don&apos;t use Blast Riff.
      </p>

      <section>
        <h2>What Blast Riff is</h2>
        <p>
          Blast Riff is a heavy metal trivia game. You answer questions about riffs, lore, and lyrics, earn TRVE
          POINTS, build streaks, level up, and compete on leaderboards and in challenges against other players.
        </p>
      </section>

      <section>
        <h2>Your account</h2>
        <ul>
          <li>You need an account to play, created via email/password or Google sign-in.</li>
          <li>You&apos;re responsible for keeping your password secure and for activity that happens on your account.</li>
          <li>You agree to provide a username and email that are accurate and belong to you.</li>
          <li>
            Blast Riff is not directed at children under 13. By creating an account, you confirm you are at least 13
            years old.
          </li>
        </ul>
      </section>

      <section>
        <h2>Acceptable use</h2>
        <p>While using Blast Riff, you agree not to:</p>
        <ul>
          <li>Cheat, exploit bugs, or use automated tools (bots, scripts) to answer questions or earn points</li>
          <li>Create multiple accounts to manipulate leaderboards or challenges</li>
          <li>Harass, abuse, or impersonate other players</li>
          <li>Scrape, copy, or redistribute Blast Riff&apos;s questions or content without permission</li>
          <li>Attempt to disrupt or gain unauthorized access to the app or its systems</li>
        </ul>
        <p>We may suspend or terminate accounts that violate these rules.</p>
      </section>

      <section>
        <h2>TRVE POINTS and in-game items</h2>
        <p>
          TRVE POINTS, levels, and other in-game stats have no monetary value, cannot be exchanged for cash, and
          exist only within Blast Riff. Blast Riff does not currently process payments or sell anything. If that
          changes, we&apos;ll update these terms and let you know before any paid features launch.
        </p>
      </section>

      <section>
        <h2>Content</h2>
        <p>
          The trivia questions, game design, branding, and other content in Blast Riff belong to Blast Riff or its
          licensors. Your username and any content you submit remain associated with your account, and you&apos;re
          responsible for it.
        </p>
      </section>

      <section>
        <h2>Termination</h2>
        <p>
          You can stop using Blast Riff at any time. We may suspend or terminate your access if you violate these
          terms or if we need to for security, legal, or operational reasons.
        </p>
      </section>

      <section>
        <h2>Disclaimer</h2>
        <p>
          Blast Riff is provided &quot;as is.&quot; We work to keep it running smoothly, but we don&apos;t guarantee
          it will always be available, error-free, or uninterrupted.
        </p>
      </section>

      <section>
        <h2>Changes to these terms</h2>
        <p>
          We may update these terms as Blast Riff evolves. When we do, we&apos;ll update the &quot;Last updated&quot;
          date at the top of this page. Continuing to use Blast Riff after a change means you accept the updated
          terms.
        </p>
      </section>

      <section>
        <h2>Contact</h2>
        <p>
          Questions about these terms? Reach out at <a href="mailto:support@blastriff.com">support@blastriff.com</a>.
        </p>
      </section>
    </LegalLayout>
  );
}
