"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  X,
  Camera,
  Grid3X3,
  LayoutGrid,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface GalleryImage {
  id: number;
  src: string;
  title: string;
  category: string;
  description: string;
}

const galleryCategories = [
  { id: "all", label: "All Photos" },
  { id: "products", label: "Products" },
  { id: "kitchen", label: "Our Kitchen" },
  { id: "packaging", label: "Packaging" },
  { id: "events", label: "Events" },
  { id: "team", label: "Our Team" },
];

const galleryImages: GalleryImage[] = [
  { id: 1, src: "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=800&q=80", title: "Traditional Namkeen", category: "products", description: "Our signature crispy namkeen blend" },
  { id: 2, src: "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=800&q=80", title: "Spicy Mixture", category: "products", description: "Perfectly spiced snack mix" },
  { id: 3, src: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=80", title: "Healthy Snacks", category: "products", description: "Baked and healthy alternatives" },
  { id: 4, src: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&q=80", title: "Gift Packs", category: "packaging", description: "Elegant gift packaging solutions" },
  { id: 5, src: "https://images.unsplash.com/photo-1623428187969-88db2b0f0df3?w=800&q=80", title: "Quality Packaging", category: "packaging", description: "Freshness sealed packaging" },
  { id: 6, src: "https://images.unsplash.com/photo-1581299894007-aaa50297cf16?w=800&q=80", title: "Modern Facility", category: "kitchen", description: "State-of-the-art production facility" },
  { id: 7, src: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&q=80", title: "Hygienic Kitchen", category: "kitchen", description: "Maintaining highest hygiene standards" },
  { id: 8, src: "https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=800&q=80", title: "Quality Check", category: "kitchen", description: "Rigorous quality control process" },
  { id: 9, src: "https://images.unsplash.com/photo-1531058020387-3be344556be6?w=800&q=80", title: "Festival Celebration", category: "events", description: "Celebrating festivals together" },
  { id: 10, src: "https://images.unsplash.com/photo-1527529482837-4698179dc6ce?w=800&q=80", title: "Food Exhibition", category: "events", description: "Showcasing at food exhibitions" },
  { id: 11, src: "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=800&q=80", title: "Team RIJITA", category: "team", description: "Our dedicated team members" },
  { id: 12, src: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=800&q=80", title: "Craftsmanship", category: "team", description: "Expert craftspeople at work" },
];

export default function GalleryPage() {
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [layout, setLayout] = useState<"grid" | "masonry">("grid");

  const filtered = useMemo(() => {
    return galleryImages.filter((img) => {
      const matchCategory = category === "all" || img.category === category;
      const matchSearch = !search || 
        img.title.toLowerCase().includes(search.toLowerCase()) ||
        img.description.toLowerCase().includes(search.toLowerCase());
      return matchCategory && matchSearch;
    });
  }, [category, search]);

  const currentIndex = selectedId !== null ? filtered.findIndex((img) => img.id === selectedId) : -1;
  const selectedImage = selectedId !== null ? filtered.find((img) => img.id === selectedId) : null;

  const goToPrev = useCallback(() => {
    if (filtered.length === 0) return;
    const newIndex = (currentIndex - 1 + filtered.length) % filtered.length;
    setSelectedId(filtered[newIndex].id);
  }, [currentIndex, filtered]);

  const goToNext = useCallback(() => {
    if (filtered.length === 0) return;
    const newIndex = (currentIndex + 1) % filtered.length;
    setSelectedId(filtered[newIndex].id);
  }, [currentIndex, filtered]);

  // Keyboard navigation for lightbox
  useEffect(() => {
    if (selectedId === null) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "Escape":
          setSelectedId(null);
          break;
        case "ArrowLeft":
          goToPrev();
          break;
        case "ArrowRight":
          goToNext();
          break;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedId, goToPrev, goToNext]);

  return (
    <div className="min-h-dvh pt-32 sm:pt-40 lg:pt-48 xl:pt-[200px] pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 border border-brand-600/20 bg-brand-600/10 rounded-full text-brand-700 text-sm font-medium mb-4">
            <Camera size={16} />
            Our Gallery
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-black text-ink mb-4 tracking-tight">
            A Visual <span className="font-serif italic font-medium text-gold-600">Journey</span>
          </h1>
          <p className="text-ink-2 max-w-2xl mx-auto text-lg [text-wrap:pretty]">
            Take a glimpse into our world — from our kitchen to your table. Every
            image tells a story of quality, tradition, and passion.
          </p>
        </motion.div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search gallery..."
              aria-label="Search gallery"
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-rule bg-paper-2 focus:outline-none focus:ring-2 focus:ring-[var(--color-focus)] transition-ui text-sm"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-2 hover:bg-paper-2 rounded-full transition-colors"
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setLayout("grid")}
              className={cn(
                "p-2 rounded-xl border transition-ui",
                layout === "grid"
                  ? "bg-brand-600/10 border-brand-600/30 text-brand-700 shadow-sm"
                  : "border-rule hover:bg-paper-2"
              )}
              aria-label="Grid layout"
            >
              <Grid3X3 size={16} />
            </button>
            <button
              onClick={() => setLayout("masonry")}
              className={cn(
                "p-2 rounded-xl border transition-ui",
                layout === "masonry"
                  ? "bg-brand-600/10 border-brand-600/30 text-brand-700 shadow-sm"
                  : "border-rule hover:bg-paper-2"
              )}
              aria-label="Masonry layout"
            >
              <LayoutGrid size={16} />
            </button>
          </div>
        </div>

        {/* Categories */}
        <div className="flex flex-wrap gap-2 mb-8">
          {galleryCategories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategory(cat.id)}
              className={cn(
                "px-4 py-2 rounded-xl text-sm font-semibold transition-ui",
                category === cat.id
                  ? "bg-brand-600 text-white shadow-md shadow-brand-700/20"
                  : "bg-paper-2 border border-rule text-ink-2 hover:border-brand-500 hover:text-brand-700"
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Gallery Grid */}
        <AnimatePresence mode="wait">
          {filtered.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-20"
            >
              <Camera size={40} className="mx-auto mb-4 text-muted-foreground/30" />
              <h3 className="text-lg font-medium mb-2">No images found</h3>
              <p className="text-muted-foreground">Try a different search or category</p>
            </motion.div>
          ) : (
            <motion.div
              key={`${category}-${layout}-${search}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={cn(
                "grid gap-4",
                layout === "grid"
                  ? "grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
                  : "columns-2 md:columns-3 lg:columns-4"
              )}
            >
              {filtered.map((img, i) => (
                <motion.button
                  key={img.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03, duration: 0.4 }}
                  onClick={() => setSelectedId(img.id)}
                  className={cn(
                    "group relative overflow-hidden rounded-xl bg-gradient-to-br from-paper-2 to-brand-600/10 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)]",
                    layout === "masonry" && "break-inside-avoid mb-4"
                  )}
                >
                  <div
                    className={cn(
                      "relative overflow-hidden",
                      layout === "grid" ? "aspect-square" : "aspect-[4/3]"
                    )}
                  >
                    <Image
                      src={img.src}
                      alt={img.title}
                      fill
                      sizes={layout === "grid" ? "(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw" : "(max-width: 768px) 50vw, 33vw"}
                      className="object-cover transition-ui duration-500 group-hover:scale-110"
                      loading="lazy"
                    />
                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-ink/75 via-ink/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                        <h4 className="text-white font-display font-bold text-sm">{img.title}</h4>
                        <p className="text-white/70 text-xs mt-0 line-clamp-2">{img.description}</p>
                      </div>
                    </div>
                  </div>
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {selectedId !== null && selectedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-ink/95 p-4"
            onClick={() => setSelectedId(null)}
          >
            {/* Close button */}
            <button
              onClick={() => setSelectedId(null)}
              className="absolute top-4 right-4 p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-ui z-10"
              aria-label="Close lightbox"
            >
              <X size={24} />
            </button>

            {/* Navigation - Previous */}
            {filtered.length > 1 && (
              <button
                onClick={(e) => { e.stopPropagation(); goToPrev(); }}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-ui z-10"
                aria-label="Previous image"
              >
                <ChevronLeft size={28} />
              </button>
            )}

            {/* Navigation - Next */}
            {filtered.length > 1 && (
              <button
                onClick={(e) => { e.stopPropagation(); goToNext(); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-ui z-10"
                aria-label="Next image"
              >
                <ChevronRight size={28} />
              </button>
            )}

            {/* Image */}
            <motion.div
              key={selectedImage.id}
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="max-w-5xl w-full max-h-[85vh] relative"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative w-full h-full max-h-[75vh] rounded-2xl overflow-hidden">
                <Image
                  src={selectedImage.src}
                  alt={selectedImage.title}
                  fill
                  className="object-contain"
                  sizes="(max-width: 1200px) 100vw, 80vw"
                  priority
                />
              </div>
              <div className="text-center mt-4 px-4">
                <h3 className="text-white text-lg font-medium">{selectedImage.title}</h3>
                <p className="text-white/50 text-sm mt-2">{selectedImage.description}</p>
                <p className="text-white/30 text-xs mt-2">
                  {currentIndex + 1} / {filtered.length}
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
