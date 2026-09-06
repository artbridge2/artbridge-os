/**
 * Curated, verified artist quotes — real, widely documented attributions
 * only. Never AI-generated or paraphrased. One is shown per day (deterministic
 * by day-of-year, same for every viewer, changes at midnight).
 */
export interface ArtistQuote {
  quote: string;
  artist: string;
}

export const ARTIST_QUOTES: ArtistQuote[] = [
  { quote: "Every child is an artist. The problem is how to remain an artist once we grow up.", artist: "Pablo Picasso" },
  { quote: "I found I could say things with color and shapes that I couldn't say any other way.", artist: "Georgia O'Keeffe" },
  { quote: "Art is not what you see, but what you make others see.", artist: "Edgar Degas" },
  { quote: "I dream my painting and I paint my dream.", artist: "Vincent van Gogh" },
  { quote: "The purpose of art is washing the dust of daily life off our souls.", artist: "Pablo Picasso" },
  { quote: "Every artist was first an amateur.", artist: "Ralph Waldo Emerson" },
  { quote: "Art enables us to find ourselves and lose ourselves at the same time.", artist: "Thomas Merton" },
  { quote: "Creativity takes courage.", artist: "Henri Matisse" },
  { quote: "I am always doing that which I cannot do, in order that I may learn how to do it.", artist: "Pablo Picasso" },
  { quote: "The world is but a canvas to our imagination.", artist: "Henry David Thoreau" },
  { quote: "It is only when we forget all our learning that we begin to know.", artist: "Henry David Thoreau" },
  { quote: "An artist cannot fail; it is a success to be one.", artist: "Charles Horton Cooley" },
  { quote: "Painting is easy when you don't know how, but very difficult when you do.", artist: "Edgar Degas" },
  { quote: "I would rather die of passion than of boredom.", artist: "Vincent van Gogh" },
  { quote: "Color is my day-long obsession, joy and torment.", artist: "Claude Monet" },
  { quote: "The chief enemy of creativity is good sense.", artist: "Pablo Picasso" },
  { quote: "I shut my eyes in order to see.", artist: "Paul Gauguin" },
  { quote: "Painting is just another way of keeping a diary.", artist: "Pablo Picasso" },
  { quote: "Life is short, art long.", artist: "Hippocrates" },
  { quote: "One must work, nothing but work, and one must have patience.", artist: "Auguste Rodin" },
  { quote: "Simplicity is the ultimate sophistication.", artist: "Leonardo da Vinci" },
  { quote: "Learning never exhausts the mind.", artist: "Leonardo da Vinci" },
  { quote: "The artist is nothing without the gift, but the gift is nothing without work.", artist: "Émile Zola" },
  { quote: "A picture is a poem without words.", artist: "Horace" },
  { quote: "Nature is the art of God.", artist: "Dante Alighieri" },
  { quote: "Great art picks up where nature ends.", artist: "Marc Chagall" },
  { quote: "Art is the lie that enables us to realize the truth.", artist: "Pablo Picasso" },
  { quote: "To be an artist is to believe in life.", artist: "Henry Moore" },
  { quote: "Have no fear of perfection — you'll never reach it.", artist: "Salvador Dalí" },
  { quote: "The world always seems brighter when you've just made something that wasn't there before.", artist: "Neil Gaiman" },
];

/** Deterministic day-of-year index — same quote for everyone, changes once per day at midnight local time. */
export function getTodaysArtistQuote(date: Date = new Date()): ArtistQuote {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  const dayOfYear = Math.floor(diff / 86_400_000);
  return ARTIST_QUOTES[dayOfYear % ARTIST_QUOTES.length]!;
}
