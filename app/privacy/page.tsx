import type { Metadata } from "next";
import InfoPage from "@/app/components/InfoPage";

export const metadata: Metadata = { title: "Privacy" };

export default function PrivacyPage() {
    return (
        <div className="p-4 min-h-[calc(100dvh-135px)]">
            <InfoPage title="Privacy Policy">
                <p>Last updated: August 29, 2026</p>
                <p>
                    Genggi respects your privacy. This policy explains what we
                    collect, why we collect it, and the choices available to
                    you.
                </p>
                <h2>Information you provide</h2>
                <p>
                    We collect information you enter into Genggi, such as your
                    username, email address, profile details, posts, messages,
                    and bug reports. Some of this information is visible to
                    other members depending on the feature and your privacy
                    settings.
                </p>
                <h2>How we use information</h2>
                <ul>
                    <li>
                        To provide and maintain your account and Genggi
                        features.
                    </li>
                    <li>
                        To help keep the community safe and troubleshoot
                        problems.
                    </li>
                    <li>
                        To send account-related messages, such as verification
                        emails.
                    </li>
                </ul>
                <h2>Analytics and cookies</h2>
                <p>
                    We may use analytics tools and essential cookies to
                    understand site usage, keep you signed in, and improve the
                    service. You can control cookies through your browser
                    settings.
                </p>
                <h2>Your choices</h2>
                <p>
                    You can update much of your profile information from Edit
                    Profile. To ask a privacy question or request account help,
                    please contact the Genggi team through the site.
                </p>
            </InfoPage>
        </div>
    );
}
