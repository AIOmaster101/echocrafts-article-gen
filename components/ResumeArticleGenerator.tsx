"use client";

import { useEffect, useRef } from "react";
import { ArticleGenerator } from "./ArticleGenerator";
import type { ArticleGeneratorInitialState } from "@/types";

export function ResumeArticleGenerator({
  initialState,
}: {
  initialState: ArticleGeneratorInitialState;
}) {
  return <ArticleGenerator initialState={initialState} />;
}
