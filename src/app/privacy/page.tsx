import type { Metadata } from "next";
import { LegalLayout } from "@/components/legal/LegalLayout";

export const metadata: Metadata = {
  title: "Privacy Policy — BLAST RIFF",
  description: "How Blast Riff collects, uses, and protects your data.",
};

const LAST_UPDATED = "August 10, 2026";

export default function PrivacyPage() {
  return (
    <LegalLayout title="Privacy Policy" lastUpdated={LAST_UPDATED}>
      <p>
        This policy explains what information Blast Riff collects when you use the app, why we collect it, and how
        it&apos;s handled. We&apos;ve tried to keep it in plain language. If anything is unclear, email us at{" "}
        <a href="mailto:support@blastriff.com">support@blastriff.com</a>.
      </p>

      <section>
        <h2>Information we collect</h2>
        <p>When you create a Blast Riff account and play the game, we collect:</p>
        <ul>
          <li>
            <strong>Account info:</strong> your email address and username. If you sign up with a password, it&apos;s
            hashed by our authentication provider (Supabase Auth) before it&apos;s stored — we never see or store your
            password in plain text.
          </li>
          <li>
            <strong>Google sign-in:</strong> if you choose to sign in with Google, Google shares basic profile
            information (like your email) with us as part of that standard sign-in process.
          </li>
          <li>
            <strong>Game data:</strong> your TRVE POINTS balance and gameplay statistics, including questions
            answered, streaks, and level.
          </li>
          <li>
            <strong>Approximate location:</strong> a general country-level location, used to place you on the
            per-country leaderboard. We don&apos;t collect precise GPS location.
          </li>
        </ul>
      </section>

      <section>
        <h2>Cookies</h2>
        <p>
          Blast Riff uses session cookies to keep you signed in while you use the app. We don&apos;t currently use
          third-party tracking cookies or advertising cookies. If that changes in the future, this policy will be
          updated first.
        </p>
      </section>

      <section>
        <h2>How we use your information</h2>
        <p>We use the information above to:</p>
        <ul>
          <li>Run your account and keep you signed in</li>
          <li>Track your progress, stats, and TRVE POINTS</li>
          <li>Show leaderboards, including the country leaderboard</li>
          <li>Operate features like challenges between players</li>
          <li>Respond to support requests</li>
        </ul>
      </section>

      <section>
        <h2>Payments</h2>
        <p>
          Blast Riff does not process any payments today. If we introduce paid features in the future, we&apos;ll
          update this policy to explain exactly what payment information is collected and how it&apos;s handled
          before that feature launches.
        </p>
      </section>

      <section>
        <h2>Sharing your information</h2>
        <p>
          We don&apos;t sell your personal data, and we don&apos;t share it with third parties for advertising
          purposes. Your data is stored with our infrastructure providers (see below) solely to operate the app.
        </p>
      </section>

      <section>
        <h2>Where your data is stored</h2>
        <p>
          Blast Riff&apos;s data is stored in a Supabase-hosted Postgres database located in the United States (East
          US, Ohio region).
        </p>
      </section>

      <section>
        <h2>Children&apos;s privacy</h2>
        <p>
          Blast Riff is not directed at children under the age of 13, and we don&apos;t knowingly collect personal
          information from children under 13. If you believe a child has provided us with personal information,
          please contact us at <a href="mailto:support@blastriff.com">support@blastriff.com</a> and we will remove
          it.
        </p>
      </section>

      <section>
        <h2>Your choices</h2>
        <p>
          You can update your account information from your profile, or contact us at{" "}
          <a href="mailto:support@blastriff.com">support@blastriff.com</a> to request deletion of your account and
          associated data.
        </p>
      </section>

      <section>
        <h2>Changes to this policy</h2>
        <p>
          We may update this policy as Blast Riff evolves. When we do, we&apos;ll update the &quot;Last updated&quot;
          date at the top of this page.
        </p>
      </section>

      <section>
        <h2>Contact</h2>
        <p>
          Questions about this policy? Reach out at{" "}
          <a href="mailto:support@blastriff.com">support@blastriff.com</a>.
        </p>
      </section>
    </LegalLayout>
  );
}
