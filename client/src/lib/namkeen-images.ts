/**
 * Authentic Indian namkeen / mithai food photography (Wikimedia Commons,
 * freely licensed). Used as brand imagery and graceful fallbacks across the
 * homepage so sections never render generic stock photos.
 *
 * Swap any of these for real RIJITA product photos when available — the
 * component code reads from this single source of truth.
 */
export const NAMKEEN_IMAGES = {
  /** Colorful namkeen, bhujia & mixture spread at a street vendor (hero) */
  heroNamkeenSpread:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/Street_vendor_selling_namkeen%2C_bhujia_and_mixtures_at_Jaisalmer.jpg/1280px-Street_vendor_selling_namkeen%2C_bhujia_and_mixtures_at_Jaisalmer.jpg",
  /** Traditional halwai shop selling Bikaneri bhujia (story / hero alt) */
  bhujiaShop:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/7/75/Shop_selling_Bikaneri_bhujia_in_Jaipur.jpg/1280px-Shop_selling_Bikaneri_bhujia_in_Jaipur.jpg",
  /** Classic thin gram-flour sev */
  sev: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/93/Sev.jpg/1280px-Sev.jpg",
  /** Crispy bhujia */
  bhujia:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/6/68/Bikaneri_bhujia_in_West_Bengal%2C_India%2C_photographed_by_Yogabrata_Chakraborty%2C_on_March_11%2C_2023.jpg/1280px-Bikaneri_bhujia_in_West_Bengal%2C_India%2C_photographed_by_Yogabrata_Chakraborty%2C_on_March_11%2C_2023.jpg",
  /** Spiral chakli in a bowl */
  chakli:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9a/Chakli_in_a_bowl.jpg/1280px-Chakli_in_a_bowl.jpg",
  /** Poha chivda */
  chivda: "https://upload.wikimedia.org/wikipedia/commons/3/3f/Bowl_of_Chivda.jpg",
  /** Bombay / namkeen mixture in a bowl */
  mixture: "https://upload.wikimedia.org/wikipedia/commons/c/c6/Bombaymix.jpg",
  /** Gujarati khakhra */
  khakhra:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Khakhra.JPG/1280px-Khakhra.JPG",
  /** Masala mathri */
  mathri:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ef/Masala_Mathri.JPG/1280px-Masala_Mathri.JPG",
  /** Gujarati Diwali farsan assortment (gift / festival) */
  diwaliFarsan:
    "https://upload.wikimedia.org/wikipedia/commons/d/d6/Diwali_Farsan_%28Faral%29_-_Gujarati_Style.jpg",
  /** Kaju katli */
  kajuKatli:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Kaju_katli_dessert_-_top_view.jpg/1280px-Kaju_katli_dessert_-_top_view.jpg",
  /** Besan ladoo */
  laddu:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Laddu_Sweet.JPG/1280px-Laddu_Sweet.JPG",
} as const;

/** Maps a category name to an authentic photo that matches that collection. */
export function getCategoryFallbackImage(categoryName: string): string {
  const name = (categoryName || "").toLowerCase();

  if (name.includes("sev")) return NAMKEEN_IMAGES.sev;
  if (name.includes("bhujiya") || name.includes("bhujia")) return NAMKEEN_IMAGES.bhujia;
  if (name.includes("mixture") || name.includes("mix")) return NAMKEEN_IMAGES.mixture;
  if (name.includes("chakli") || name.includes("murukku")) return NAMKEEN_IMAGES.chakli;
  if (name.includes("chivda") || name.includes("poha")) return NAMKEEN_IMAGES.chivda;
  if (name.includes("khakhra")) return NAMKEEN_IMAGES.khakhra;
  if (name.includes("mathri") || name.includes("papdi")) return NAMKEEN_IMAGES.mathri;
  if (name.includes("sweet") || name.includes("mithai") || name.includes("ladoo")) return NAMKEEN_IMAGES.kajuKatli;
  if (name.includes("gift") || name.includes("festival") || name.includes("hamper") || name.includes("diwali")) {
    return NAMKEEN_IMAGES.diwaliFarsan;
  }
  if (name.includes("farsan")) return NAMKEEN_IMAGES.mathri;
  if (name.includes("ready") || name.includes("eat")) return NAMKEEN_IMAGES.chivda;
  return NAMKEEN_IMAGES.heroNamkeenSpread;
}
