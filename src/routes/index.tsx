import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Unseen Studio® – Brand, Digital & Motion" },
      { name: "description", content: "Unseen Studio — an immersive brand, digital and motion studio experience." },
      { property: "og:title", content: "Unseen Studio® – Brand, Digital & Motion" },
      { property: "og:description", content: "An immersive brand, digital and motion studio experience." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <iframe
      src="/site/index.html"
      title="Unseen Studio"
      className="fixed inset-0 h-screen w-screen border-0"
      allow="autoplay; fullscreen"
    />
  );
}
