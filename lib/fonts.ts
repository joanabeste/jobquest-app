import {
  Inter, Roboto, Open_Sans, Montserrat, Poppins, Lato, Nunito, Raleway,
  Oswald, Source_Sans_3, PT_Sans, Merriweather, Playfair_Display, Lora,
  Roboto_Slab, Work_Sans, Quicksand, Fira_Sans, Mulish, Karla, Rubik,
  DM_Sans, Manrope, Bitter, Cabin,
  Roboto_Condensed, Barlow_Condensed, PT_Sans_Narrow, Fira_Sans_Condensed,
} from 'next/font/google';

// All Google Fonts loaded via next/font/google are automatically downloaded
// and self-hosted at build time — no runtime requests to fonts.googleapis.com.
// next/font/google requires *literal* arguments at every call site, so each
// font is configured inline instead of via a shared `common` object.

const inter = Inter({ weight: ['400', '500', '600', '700'], display: 'swap', variable: '--font-inter', subsets: ['latin'] });
const roboto = Roboto({ weight: ['400', '500', '700'], display: 'swap', variable: '--font-roboto', subsets: ['latin'] });
const openSans = Open_Sans({ weight: ['400', '500', '600', '700'], display: 'swap', variable: '--font-open-sans', subsets: ['latin'] });
const montserrat = Montserrat({ weight: ['400', '500', '600', '700'], display: 'swap', variable: '--font-montserrat', subsets: ['latin'] });
const poppins = Poppins({ weight: ['400', '500', '600', '700'], display: 'swap', variable: '--font-poppins', subsets: ['latin'] });
const lato = Lato({ weight: ['400', '700'], display: 'swap', variable: '--font-lato', subsets: ['latin'] });
const nunito = Nunito({ weight: ['400', '500', '600', '700'], display: 'swap', variable: '--font-nunito', subsets: ['latin'] });
const raleway = Raleway({ weight: ['400', '500', '600', '700'], display: 'swap', variable: '--font-raleway', subsets: ['latin'] });
const oswald = Oswald({ weight: ['400', '500', '600', '700'], display: 'swap', variable: '--font-oswald', subsets: ['latin'] });
const sourceSans = Source_Sans_3({ weight: ['400', '500', '600', '700'], display: 'swap', variable: '--font-source-sans', subsets: ['latin'] });
const ptSans = PT_Sans({ weight: ['400', '700'], display: 'swap', variable: '--font-pt-sans', subsets: ['latin'] });
const merriweather = Merriweather({ weight: ['400', '700'], display: 'swap', variable: '--font-merriweather', subsets: ['latin'] });
const playfair = Playfair_Display({ weight: ['400', '500', '600', '700'], display: 'swap', variable: '--font-playfair', subsets: ['latin'] });
const lora = Lora({ weight: ['400', '500', '600', '700'], display: 'swap', variable: '--font-lora', subsets: ['latin'] });
const robotoSlab = Roboto_Slab({ weight: ['400', '500', '600', '700'], display: 'swap', variable: '--font-roboto-slab', subsets: ['latin'] });
const workSans = Work_Sans({ weight: ['400', '500', '600', '700'], display: 'swap', variable: '--font-work-sans', subsets: ['latin'] });
const quicksand = Quicksand({ weight: ['400', '500', '600', '700'], display: 'swap', variable: '--font-quicksand', subsets: ['latin'] });
const firaSans = Fira_Sans({ weight: ['400', '500', '600', '700'], display: 'swap', variable: '--font-fira-sans', subsets: ['latin'] });
const mulish = Mulish({ weight: ['400', '500', '600', '700'], display: 'swap', variable: '--font-mulish', subsets: ['latin'] });
const karla = Karla({ weight: ['400', '500', '600', '700'], display: 'swap', variable: '--font-karla', subsets: ['latin'] });
const rubik = Rubik({ weight: ['400', '500', '600', '700'], display: 'swap', variable: '--font-rubik', subsets: ['latin'] });
const dmSans = DM_Sans({ weight: ['400', '500', '600', '700'], display: 'swap', variable: '--font-dm-sans', subsets: ['latin'] });
const manrope = Manrope({ weight: ['400', '500', '600', '700'], display: 'swap', variable: '--font-manrope', subsets: ['latin'] });
const bitter = Bitter({ weight: ['400', '500', '600', '700'], display: 'swap', variable: '--font-bitter', subsets: ['latin'] });
const cabin = Cabin({ weight: ['400', '500', '600', '700'], display: 'swap', variable: '--font-cabin', subsets: ['latin'] });
const robotoCondensed = Roboto_Condensed({ weight: ['400', '500', '700'], display: 'swap', variable: '--font-roboto-condensed', subsets: ['latin'] });
const barlowCondensed = Barlow_Condensed({ weight: ['400', '500', '600', '700'], display: 'swap', variable: '--font-barlow-condensed', subsets: ['latin'] });
const ptSansNarrow = PT_Sans_Narrow({ weight: ['400', '700'], display: 'swap', variable: '--font-pt-sans-narrow', subsets: ['latin'] });
const firaSansCondensed = Fira_Sans_Condensed({ weight: ['400', '500', '600', '700'], display: 'swap', variable: '--font-fira-sans-condensed', subsets: ['latin'] });

export const ALL_FONTS = [
  inter, roboto, openSans, montserrat, poppins, lato, nunito, raleway, oswald,
  sourceSans, ptSans, merriweather, playfair, lora, robotoSlab, workSans,
  quicksand, firaSans, mulish, karla, rubik, dmSans, manrope, bitter, cabin,
  robotoCondensed, barlowCondensed, ptSansNarrow, firaSansCondensed,
];

// Single className string with every CSS variable — apply to <body>.
export const ALL_FONT_VARIABLES = ALL_FONTS.map((f) => f.variable).join(' ');

export interface FontOption {
  /** Stable identifier saved to the database. */
  value: string;
  /** Human-readable label shown in the UI. */
  label: string;
  /** CSS font-family value to use in style props. */
  cssFamily: string;
  /** Category for grouping in the dropdown. */
  category: 'sans' | 'serif' | 'display' | 'condensed';
}

export const FONT_OPTIONS: FontOption[] = [
  { value: 'system',           label: 'Standard (System)',  cssFamily: 'system-ui, -apple-system, sans-serif', category: 'sans' },
  { value: 'Inter',            label: 'Inter',              cssFamily: `${inter.style.fontFamily}, sans-serif`, category: 'sans' },
  { value: 'Roboto',           label: 'Roboto',             cssFamily: `${roboto.style.fontFamily}, sans-serif`, category: 'sans' },
  { value: 'Open Sans',        label: 'Open Sans',          cssFamily: `${openSans.style.fontFamily}, sans-serif`, category: 'sans' },
  { value: 'Montserrat',       label: 'Montserrat',         cssFamily: `${montserrat.style.fontFamily}, sans-serif`, category: 'sans' },
  { value: 'Poppins',          label: 'Poppins',            cssFamily: `${poppins.style.fontFamily}, sans-serif`, category: 'sans' },
  { value: 'Lato',             label: 'Lato',               cssFamily: `${lato.style.fontFamily}, sans-serif`, category: 'sans' },
  { value: 'Nunito',           label: 'Nunito',             cssFamily: `${nunito.style.fontFamily}, sans-serif`, category: 'sans' },
  { value: 'Raleway',          label: 'Raleway',            cssFamily: `${raleway.style.fontFamily}, sans-serif`, category: 'sans' },
  { value: 'Source Sans 3',    label: 'Source Sans',        cssFamily: `${sourceSans.style.fontFamily}, sans-serif`, category: 'sans' },
  { value: 'PT Sans',          label: 'PT Sans',            cssFamily: `${ptSans.style.fontFamily}, sans-serif`, category: 'sans' },
  { value: 'Work Sans',        label: 'Work Sans',          cssFamily: `${workSans.style.fontFamily}, sans-serif`, category: 'sans' },
  { value: 'Fira Sans',        label: 'Fira Sans',          cssFamily: `${firaSans.style.fontFamily}, sans-serif`, category: 'sans' },
  { value: 'Mulish',           label: 'Mulish',             cssFamily: `${mulish.style.fontFamily}, sans-serif`, category: 'sans' },
  { value: 'Karla',            label: 'Karla',              cssFamily: `${karla.style.fontFamily}, sans-serif`, category: 'sans' },
  { value: 'Rubik',            label: 'Rubik',              cssFamily: `${rubik.style.fontFamily}, sans-serif`, category: 'sans' },
  { value: 'DM Sans',          label: 'DM Sans',            cssFamily: `${dmSans.style.fontFamily}, sans-serif`, category: 'sans' },
  { value: 'Manrope',          label: 'Manrope',            cssFamily: `${manrope.style.fontFamily}, sans-serif`, category: 'sans' },
  { value: 'Cabin',            label: 'Cabin',              cssFamily: `${cabin.style.fontFamily}, sans-serif`, category: 'sans' },
  { value: 'Quicksand',        label: 'Quicksand',          cssFamily: `${quicksand.style.fontFamily}, sans-serif`, category: 'display' },
  { value: 'Oswald',           label: 'Oswald',             cssFamily: `${oswald.style.fontFamily}, sans-serif`, category: 'display' },
  { value: 'Merriweather',     label: 'Merriweather',       cssFamily: `${merriweather.style.fontFamily}, serif`, category: 'serif' },
  { value: 'Playfair Display', label: 'Playfair Display',   cssFamily: `${playfair.style.fontFamily}, serif`, category: 'serif' },
  { value: 'Lora',             label: 'Lora',               cssFamily: `${lora.style.fontFamily}, serif`, category: 'serif' },
  { value: 'Roboto Slab',      label: 'Roboto Slab',        cssFamily: `${robotoSlab.style.fontFamily}, serif`, category: 'serif' },
  { value: 'Bitter',           label: 'Bitter',             cssFamily: `${bitter.style.fontFamily}, serif`, category: 'serif' },
  { value: 'Roboto Condensed',     label: 'Roboto Condensed',     cssFamily: `${robotoCondensed.style.fontFamily}, sans-serif`, category: 'condensed' },
  { value: 'Barlow Condensed',     label: 'Barlow Condensed',     cssFamily: `${barlowCondensed.style.fontFamily}, sans-serif`, category: 'condensed' },
  { value: 'PT Sans Narrow',       label: 'PT Sans Narrow',       cssFamily: `${ptSansNarrow.style.fontFamily}, sans-serif`, category: 'condensed' },
  { value: 'Fira Sans Condensed',  label: 'Fira Sans Condensed',  cssFamily: `${firaSansCondensed.style.fontFamily}, sans-serif`, category: 'condensed' },
];

export function fontFamilyFor(value: string | undefined, fallback = 'system-ui, sans-serif'): string {
  if (!value) return fallback;
  return FONT_OPTIONS.find((f) => f.value === value)?.cssFamily ?? fallback;
}
