import type { Metadata } from "next";
import InfoPage from "@/app/components/InfoPage";

export const metadata: Metadata = { title: "Terms" };

export default function TermsPage() {
    return (
        <InfoPage title="Terms of Service">
            <p>Last updated: August 29, 2026</p>
            <p>
                By using Genggi, you agree to use the service responsibly and
                follow these terms.
            </p>
            <h2>Your account</h2>
            <p>
                Keep your account information accurate and your login details
                secure. You are responsible for activity that occurs through
                your account. Do not impersonate another person or create
                accounts deceptively.
            </p>
            <h2>Community standards</h2>
            <p>
                Do not use Genggi to harass, threaten, abuse, spam, or harm
                others. Do not post illegal, malicious, or infringing content,
                and do not attempt to access accounts or data that do not belong
                to you.
            </p>
            <h2>Content and moderation</h2>
            <p>
                You retain responsibility for content you submit and must have
                the right to share it. We may remove content or restrict
                accounts that violate these terms or put the community at risk.
            </p>
            <h2>Service changes</h2>
            <p>
                Genggi may change, suspend, or discontinue features as the
                service evolves. We may update these terms from time to time;
                continued use after an update means you accept the revised
                terms.
            </p>
        </InfoPage>
    );
}
