import type { MetadataRoute } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://openbench.ai";

const COMPARE_SLUGS = [
  "qwen3-14b-vs-deepseek-r1-14b",
  "llama-3-1-8b-vs-qwen2-5-7b",
  "phi-4-14b-vs-gemma-3-12b",
  "llama-3-1-8b-vs-mistral-7b",
  "qwen3-32b-vs-llama-3-3-70b",
  "deepseek-r1-8b-vs-llama-3-1-8b",
  "qwen3-8b-vs-llama-3-1-8b",
  "phi-4-14b-vs-qwen3-14b",
  "qwen2-5-72b-vs-llama-3-3-70b",
  "gemma-3-9b-vs-qwen2-5-7b",
];

const MODEL_SLUGS = [
  "llama-3-1-8b", "llama-3-2-3b", "llama-3-3-70b",
  "qwen3-8b", "qwen3-14b", "qwen3-32b",
  "qwen2-5-7b", "qwen2-5-14b", "qwen2-5-32b", "qwen2-5-72b",
  "mistral-7b",
  "deepseek-r1-8b", "deepseek-r1-14b", "deepseek-r1-32b",
  "phi-4-14b", "phi-3-5-mini",
  "gemma-3-4b", "gemma-3-9b", "gemma-3-12b",
];

const HARDWARE_SLUGS = [
  "rtx-3060-12gb", "rtx-3060-ti", "rtx-3070", "rtx-3080-10gb", "rtx-3090",
  "rtx-4060", "rtx-4060-ti-16gb", "rtx-4070", "rtx-4070-ti-super", "rtx-4080-16gb", "rtx-4090",
  "rtx-5070-ti", "rtx-5090",
  "apple-m1", "apple-m2-pro", "apple-m3-max", "apple-m4-pro",
  "16gb-ram-cpu", "32gb-ram-cpu", "64gb-ram-cpu",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE_URL,                           lastModified: now, changeFrequency: "weekly",  priority: 1.0 },
    { url: `${BASE_URL}/run-check`,            lastModified: now, changeFrequency: "weekly",  priority: 0.9 },
    { url: `${BASE_URL}/analyze`,              lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/compare`,              lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/leaderboard`,          lastModified: now, changeFrequency: "daily",   priority: 0.7 },
    { url: `${BASE_URL}/community`,            lastModified: now, changeFrequency: "daily",   priority: 0.6 },
    { url: `${BASE_URL}/badge`,                lastModified: now, changeFrequency: "monthly", priority: 0.4 },
  ];

  const modelRoutes: MetadataRoute.Sitemap = MODEL_SLUGS.map((slug) => ({
    url: `${BASE_URL}/models/${slug}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.85,
  }));

  const hardwareRoutes: MetadataRoute.Sitemap = HARDWARE_SLUGS.map((slug) => ({
    url: `${BASE_URL}/hardware/${slug}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  const compareRoutes: MetadataRoute.Sitemap = COMPARE_SLUGS.map((slug) => ({
    url: `${BASE_URL}/compare/${slug}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.75,
  }));

  return [...staticRoutes, ...modelRoutes, ...hardwareRoutes, ...compareRoutes];
}
