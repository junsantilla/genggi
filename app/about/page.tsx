import type { Metadata } from "next";
import InfoPage from "@/app/components/InfoPage";

export const metadata: Metadata = { title: "About" };

export default function AboutPage() {
    return (
        <InfoPage title="About Genggi">
            <p>
                Genggi is a nostalgic social network for making a profile,
                finding friends, sharing updates, and staying connected.
            </p>
            <h2>Built for the good old days</h2>
            <p>
                We love the personal, playful feel of early social websites:
                custom profiles, guestbook-style testimonials, messages, and
                communities that feel like your own corner of the internet.
            </p>
            <h2>Have feedback?</h2>
            <p>
                We&apos;re always working to make Genggi better. If something
                doesn&apos;t work as expected, please use the{" "}
                <a href="/report-bug">Report a bug</a> page to let us know.
            </p>
        </InfoPage>
    );
}
