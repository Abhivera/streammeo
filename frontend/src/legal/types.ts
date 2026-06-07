export type LegalSection = {
  title: string;
  paragraphs: string[];
};

export type LegalPolicy = {
  slug: string;
  title: string;
  summary: string;
  sections: LegalSection[];
};
