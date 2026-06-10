import type { CraftItem, FaqItem } from '@/types/crafts';

export function buildArticleJsonLd(
  item: CraftItem,
  title: string,
  meta_description: string,
  url: string
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": title,
    "description": meta_description,
    "url": url,
    "about": { "@type": "Thing", "name": item.name_en },
    "inLanguage": "en"
  };
}

export function buildFaqJsonLd(faq: FaqItem[]): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faq.map(item => ({
      "@type": "Question",
      "name": item.question,
      "acceptedAnswer": { "@type": "Answer", "text": item.answer }
    }))
  };
}

export function buildBreadcrumbJsonLd(
  pillarSlug: string,
  pillarName: string,
  spokeSlug: string,
  spokeName: string
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Crafts", "item": "/blogs/crafts" },
      { "@type": "ListItem", "position": 2, "name": pillarName, "item": `/blogs/crafts/${pillarSlug}` },
      { "@type": "ListItem", "position": 3, "name": spokeName, "item": `/blogs/crafts/${spokeSlug}` }
    ]
  };
}

export function embedJsonLd(bodyHtml: string, jsonLdObjects: Record<string, unknown>[]): string {
  const scripts = jsonLdObjects
    .map(obj => `<script type="application/ld+json">\n${JSON.stringify(obj, null, 2)}\n</script>`)
    .join('\n');
  return bodyHtml + '\n' + scripts;
}
