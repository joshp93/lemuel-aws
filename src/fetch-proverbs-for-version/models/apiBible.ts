export interface Language {
  id: string;
  name: string;
  nameLocal: string;
  script: string;
  scriptDirection: string;
}

export interface Country {
  id: string;
  name: string;
  nameLocal: string;
}

export interface AudioBible {
  id: string;
  dblId: string;
  name: string;
  nameLocal: string;
  abbreviation: string;
  abbreviationLocal: string;
}

export interface Bible {
  id: string;
  dblId: string | null;
  relatedDbl: string | null;
  name: string;
  nameLocal: string;
  abbreviation: string;
  abbreviationLocal: string;
  description: string;
  descriptionLocal: string;
  language: Language;
  countries: Country[];
  type: string;
  updatedAt: string;
  copyright: string;
  info: string;
  audioBibles: AudioBible[];
}

export interface BiblesResponse {
  data: Bible[];
}

export interface ChaptersResponse {
  data: ChapterData;
  meta?: {
    fumsToken?: string;
  };
}

export interface ChapterData {
  id: string;
  bibleId: string;
  number: string;
  bookId: string;
  reference: string;
  copyright: string;
  verseCount: number;
  content: ContentElement[];
  next?: {
    id: string;
    number: string;
    bookId: string;
  };
  previous?: {
    id: string;
    number: string;
    bookId: string;
  };
}

export interface ContentTextItem {
  text: string;
  type: string;
  attrs?: Record<string, unknown>;
}

export interface ContentElement {
  name: string;
  type: string;
  attrs?: Record<string, unknown>;
  items?: (ContentElement | ContentTextItem)[];
}