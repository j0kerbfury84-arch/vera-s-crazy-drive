import { createFileRoute } from "@tanstack/react-router";
import DrivingGame from "@/components/DrivingGame";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Vera's Impossible Driving Test — Meme Driving Game" },
      {
        name: "description",
        content:
          "Help Vera fail her driving exam in 60 chaotic seconds: hit checkpoints, flatten pedestrians and survive the instructor's screaming.",
      },
      { property: "og:title", content: "Vera's Impossible Driving Test" },
      {
        property: "og:description",
        content: "60 seconds, one route, zero talent. Can Vera pass the impossible driving exam?",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DrivingGame,
});
