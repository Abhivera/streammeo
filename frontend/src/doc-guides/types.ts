export type DocSection = {
  title: string;
  paragraphs?: string[];
  steps?: string[];
  code?: string;
};

export type DocGuide = {
  slug: string;
  title: string;
  summary: string;
  sections: DocSection[];
};
