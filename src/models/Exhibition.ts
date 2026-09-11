import { ArtStyle } from './Artwork';

export interface Exhibition {
  id: string;
  title: string;
  theme: string;
  style: ArtStyle;
  artworkIds: string[];
  artistIds: string[];
  createdAtTurn: number;
}
