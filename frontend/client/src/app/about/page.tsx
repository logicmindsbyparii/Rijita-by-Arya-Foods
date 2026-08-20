"use client";

import { useRef, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { contentApi, productApi } from "@/lib/api";
import { getImageUrl } from "@/lib/utils";
import { ArrowRight, ArrowUpRight, CheckCircle2, Leaf, Star, ShieldCheck } from "lucide-react";
import { NAMKEEN_IMAGES } from "@/lib/namkeen-images";
import JainMarqueeTicker from "@/components/home/JainMarqueeTicker";
import { cn } from "@/lib/utils";

// GSAP Imports
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

// ── Fallback Data ─────────────────
const fallbackProducts = [
  { id: 1, title: "Classic Ratlami Sev", image: NAMKEEN_IMAGES.sev, description: "Crisp, spicy, and perfectly seasoned.", slug: "classic-ratlami-sev" },
  { id: 2, title: "Authentic Khakhra", image: NAMKEEN_IMAGES.khakhra, description: "Thin, roasted to absolute perfection.", slug: "authentic-khakhra" },
  { id: 3, title: "Premium Dry Fruit Mixture", image: NAMKEEN_IMAGES.mixture, description: "A rich blend of cashews, almonds, and spices.", slug: "premium-dry-fruit-mixture" },
];

const fallbackStories = [
  { id: 1, title: "The Secret Spice Blend", excerpt: "Discover the hand-ground masalas that give our Namkeen its signature kick.", image: NAMKEEN_IMAGES.bhujia, slug: "secret-spice-blend" },
  { id: 2, title: "Sourcing the Best Gram Flour", excerpt: "We travel directly to the best farms to ensure our Besan is flawlessly pure.", image: NAMKEEN_IMAGES.chakli, slug: "sourcing-best-gram-flour" },
  { id: 3, title: "A Grandmother's Recipe", excerpt: "Our mixtures weren't created in labs. They were perfected decades ago.", image: NAMKEEN_IMAGES.mathri, slug: "grandmothers-recipe" }
];

export default function AboutPage() {
  const containerRef = useRef<HTMLElement>(null);
  const scrubTextRef = useRef<HTMLHeadingElement>(null);
  const imageGalleryRef = useRef<HTMLDivElement>(null);
  
  const { data: settingsData } = useQuery({
    queryKey: ["settings"],
    queryFn: () => contentApi.getSiteSettings(),
    staleTime: 10 * 60 * 1000,
  });

  const { data: productsData } = useQuery({
    queryKey: ["products", { limit: 20 }],
    queryFn: () => productApi.getProducts({ limit: 20 }),
  });

  const { data: blogsData } = useQuery({
    queryKey: ["blogs"],
    queryFn: () => contentApi.getBlogs(),
  });

  const settings = settingsData?.data?.settings;
  const about = settings?.about;
  
  // Dynamic Admin Content
  const heroHeadline = about?.heroHeadline || "Rooted in tradition. Crafted with purity.";
  const heroSubtitle = about?.heroSubtitle || "We don't just make snacks. We preserve the authentic, unadulterated heritage of traditional Indian Namkeen.";
  const heroImage = settings?.heroImage || settings?.storyImage || "/images/about/hero.jpg";
  
  const mission = about?.mission || "To preserve the authentic taste of Indian tradition by crafting premium snacks using time-honored recipes.";
  const vision = about?.vision || "To be the global standard for uncorrupted, authentic Indian snacks, sharing our generational heritage with the world.";
  const founderName = about?.founderName || "Arya Foods Family";
  const founderBio = about?.founderBio || "Our vision was singularly focused: to share the authentic, uncorrupted taste of home-made Indian snacks with the world.";
  const founderImage = settings?.founderImage || NAMKEEN_IMAGES.bhujiaShop;
  
  const values = about?.values && about.values.length > 0 ? about.values : [
    { title: "Purity", description: "Sourcing only the finest ingredients directly from farmers." },
    { title: "Heritage", description: "Preserving generational recipes without modern shortcuts." },
    { title: "Quality", description: "Uncompromising standards in every single batch we produce." }
  ];

  const qualityBadges = about?.qualityBadges && about.qualityBadges.length > 0 ? about.qualityBadges : [
    { label: "FSSAI Certified", description: "Rigorous quality testing." },
    { label: "100% Authentic", description: "Traditional Indian flavors." },
    { label: "Zero Preservatives", description: "Pure, natural ingredients." },
    { label: "Hand-crafted", description: "Made with artisanal care." }
  ];

  const brandProducts = useMemo(() => {
    if (productsData?.data?.products && productsData.data.products.length >= 3) {
      const shuffled = [...productsData.data.products].sort(() => 0.5 - Math.random());
      return shuffled.slice(0, 3);
    }
    return fallbackProducts;
  }, [productsData]);

  const brandStories = blogsData?.data?.blogs?.length > 0 ? blogsData.data.blogs.slice(0, 4) : fallbackStories;

  // GSAP Animations
  useGSAP(() => {
    if (scrubTextRef.current) {
      const words = scrubTextRef.current.querySelectorAll(".scrub-word");
      gsap.fromTo(
        words,
        { opacity: 0, y: 50, rotationZ: 2 },
        {
          opacity: 1,
          y: 0,
          rotationZ: 0,
          stagger: 0.03,
          ease: "back.out(1.2)",
          duration: 0.8,
          scrollTrigger: {
            trigger: scrubTextRef.current,
            start: "top 85%",
          },
        }
      );
    }

    // 2. Image Scale & Fade Scroll (Chronicles Gallery)
    if (imageGalleryRef.current) {
      const cards = gsap.utils.toArray(".gallery-card");
      cards.forEach((card: any) => {
        const img = card.querySelector(".gallery-img");
        gsap.fromTo(
          img,
          { scale: 0.8, opacity: 0.2 },
          {
            scale: 1,
            opacity: 1,
            ease: "power2.out",
            scrollTrigger: {
              trigger: card,
              start: "top 85%",
              end: "center center",
              scrub: 1,
            },
          }
        );
      });
    }

    // 3. Bento Grid Stagger Fade
    gsap.from(".bento-item", {
      y: 60,
      opacity: 0,
      duration: 1.2,
      stagger: 0.15,
      ease: "power3.out",
      scrollTrigger: {
        trigger: ".bento-grid",
        start: "top 75%",
      },
    });

    // 4. Hero Parallax
    gsap.to(".hero-parallax-img", {
      yPercent: 20,
      ease: "none",
      scrollTrigger: {
        trigger: ".hero-section",
        start: "top top",
        end: "bottom top",
        scrub: true
      }
    });

    // 5. Founder Parallax
    gsap.to(".founder-parallax-img", {
      yPercent: 20,
      ease: "none",
      scrollTrigger: {
        trigger: ".founder-section",
        start: "top bottom",
        end: "bottom top",
        scrub: true
      }
    });

    // 6. Founder Image Reveal (Scroll-based for Mobile & Desktop)
    gsap.fromTo(".founder-img-container", 
      { rotation: -3, scale: 0.95 },
      { 
        rotation: 0, 
        scale: 1,
        ease: "power2.out",
        scrollTrigger: {
          trigger: ".founder-img-container",
          start: "top 85%",
          end: "center center",
          scrub: 1
        }
      }
    );
    
    gsap.fromTo(".founder-img-reveal", 
      { filter: "grayscale(100%) contrast(125%)" },
      { 
        filter: "grayscale(0%) contrast(100%)",
        ease: "power2.out",
        scrollTrigger: {
          trigger: ".founder-img-container",
          start: "top 85%",
          end: "center center",
          scrub: 1
        }
      }
    );
  }, { scope: containerRef });

  return (
    // Wrap entire page to prevent horizontal scrollbars from GSAP offscreen elements
    <main ref={containerRef} className="overflow-x-hidden w-full max-w-full bg-paper text-brand-900 selection:bg-gold-500/30 selection:text-brand-950 font-sans">

      {/* ═══ 1. ATTENTION: CINEMATIC CENTER HERO ═══ */}
      <section className="hero-section relative min-h-[95vh] flex items-center justify-center pt-32 pb-24 px-6 sm:px-12 bg-brand-950 overflow-hidden">
        {/* Background Parallax Image */}
        <div className="absolute inset-0 z-0 opacity-40">
          <Image 
            src={getImageUrl(heroImage)} 
            alt="Heritage Background" 
            fill 
            priority
            className="hero-parallax-img object-cover object-center filter saturate-50" 
          />
          {/* Radial Dark Wash */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(5,20,8,0.4)_0%,rgba(5,20,8,0.9)_100%)]" />
        </div>

        <div className="relative z-10 w-full max-w-6xl mx-auto flex flex-col items-center text-center">
          {/* Guaranteed 2-Line Iron Rule via max-w-6xl with Inline Micro-Images */}
          <h1 className="text-[clamp(3.5rem,6vw,7.5rem)] font-black tracking-[-0.04em] leading-[0.95] text-white w-full drop-shadow-2xl">
            {heroHeadline.split('. ').map((part: string, idx: number, arr: string[]) => (
              <span key={idx} className="block mb-2 sm:mb-4">
                {idx % 2 !== 0 ? (
                  <span className="font-serif italic font-medium text-gold-500 tracking-[-0.02em]">{part}</span>
                ) : (
                  <>
                    {part}
                    {idx === 0 && (
                      <span 
                        className="inline-block w-32 sm:w-48 h-12 sm:h-20 rounded-[40px] align-middle bg-cover bg-center mx-3 sm:mx-6 shadow-inner ring-4 ring-gold-500/20 hover:scale-105 transition-transform duration-700 ease-out" 
                        style={{backgroundImage: `url(${getImageUrl(founderImage)})`}}
                      />
                    )}
                  </>
                )}
                {idx !== arr.length - 1 ? "." : ""}
              </span>
            ))}
          </h1>
          <p className="text-xl sm:text-3xl text-brand-100/90 max-w-3xl mt-10 font-medium leading-relaxed [text-wrap:balance]">
            {heroSubtitle}
          </p>

          <div className="mt-16 flex flex-col sm:flex-row items-center gap-6">
            <Link
              href="/products"
              className="px-10 py-5 bg-gold-500 text-brand-950 rounded-full font-black text-lg hover:bg-gold-400 hover:scale-105 shadow-[0_10px_30px_rgba(212,175,55,0.2)] transition-all duration-500 flex items-center gap-3"
            >
              Discover Our Range <ArrowRight size={20} />
            </Link>
          </div>
        </div>
      </section>

      {/* INFINITE MARQUEE: QUALITY BADGES */}
      <div className="w-full bg-gold-500 py-6 overflow-hidden border-y border-gold-400 relative z-20">
        <div className="flex whitespace-nowrap animate-marquee items-center">
          {/* Duplicate 3 times for seamless infinite scroll */}
          {[1, 2, 3].map((set) => (
            <div key={set} className="flex items-center mx-4">
              {qualityBadges.map((badge: any, i: number) => (
                <div key={i} className="flex items-center mx-8 sm:mx-16 gap-3">
                  <Star className="w-6 h-6 text-brand-950 fill-brand-950" />
                  <span className="text-brand-950 font-black text-xl tracking-wide uppercase">{badge.label}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ═══ 2. INTEREST: GAPLESS BENTO GRID (The Values) ═══ */}
      <section className="py-20 lg:py-48 px-4 sm:px-12 lg:px-24 bg-paper relative z-20">
        <div className="max-w-[1600px] mx-auto">
          
          <div className="mb-12 lg:mb-20 flex flex-col items-center text-center">
            <h2 className="text-[40px] sm:text-[64px] lg:text-[80px] font-black tracking-[-0.04em] leading-[0.9] text-brand-950 max-w-4xl">
              <span className="block">Our Mission &</span>
              <span className="font-serif italic text-brand-700 tracking-[-0.02em] block mt-2 sm:mt-4">Core Values.</span>
            </h2>
          </div>

          {/* Math Check: 2 Cols, 2 Rows. 
              Value 0 = col-span-2, row-span-1
              Value 1 = col-span-1, row-span-1
              Value 2 = col-span-1, row-span-1
              Total = 2x2 grid completely filled with 3 items. ZERO empty space. */}
          <div className="bento-grid grid grid-cols-1 md:grid-cols-2 grid-rows-[auto_auto] gap-4 lg:gap-6 grid-flow-dense">
            
            {/* Top Wide Block */}
            {values[0] && (
              <div className="bento-item md:col-span-2 bg-brand-950 text-white rounded-[32px] sm:rounded-[40px] p-6 sm:p-10 lg:p-16 flex flex-col justify-between overflow-hidden relative group">
                <div className="absolute inset-0 bg-brand-900 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                <div className="relative z-10 flex flex-col lg:flex-row gap-8 sm:gap-12 lg:gap-24 items-start lg:items-center">
                  <div className="lg:w-1/2">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gold-500/20 flex items-center justify-center mb-6 sm:mb-8 text-gold-500 border border-gold-500/30">
                      <ShieldCheck size={28} className="sm:w-8 sm:h-8 w-6 h-6" />
                    </div>
                    <h3 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight mb-4 sm:mb-6">{values[0].title}</h3>
                    <p className="text-lg sm:text-xl text-brand-200 font-medium leading-relaxed">{values[0].description}</p>
                  </div>
                  <div className="w-full lg:w-1/2 bg-brand-900/50 p-6 lg:p-8 rounded-[24px] sm:rounded-3xl border border-brand-800">
                    <h4 className="text-xs sm:text-sm font-bold tracking-[0.2em] uppercase text-gold-500 mb-3 sm:mb-4">Our Mission</h4>
                    <p className="text-xl sm:text-2xl font-serif italic text-white/90 leading-relaxed">&ldquo;{mission}&rdquo;</p>
                  </div>
                </div>
              </div>
            )}

            {/* Bottom Left Block */}
            {values[1] && (
              <div className="bento-item md:col-span-1 bg-brand-50 border border-brand-200 rounded-[32px] sm:rounded-[40px] p-6 sm:p-10 lg:p-16 flex flex-col justify-between group hover:bg-white transition-colors duration-500 shadow-sm hover:shadow-xl">
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-brand-100 flex items-center justify-center mb-8 lg:mb-12 text-brand-700">
                  <Leaf size={28} className="sm:w-8 sm:h-8 w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-brand-950 mb-4 sm:mb-6">{values[1].title}</h3>
                  <p className="text-lg sm:text-xl text-brand-800 font-medium leading-relaxed">{values[1].description}</p>
                </div>
              </div>
            )}

            {/* Bottom Right Block */}
            {values[2] && (
              <div className="bento-item md:col-span-1 bg-gold-500 rounded-[32px] sm:rounded-[40px] p-6 sm:p-10 lg:p-16 flex flex-col justify-between group hover:bg-gold-400 transition-colors duration-500 shadow-sm hover:shadow-xl">
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-brand-950/10 flex items-center justify-center mb-8 lg:mb-12 text-brand-950">
                  <Star size={28} className="sm:w-8 sm:h-8 w-6 h-6" />
                </div>
                <div>
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-brand-900 border border-brand-800 flex items-center justify-center shrink-0 mb-4 sm:mb-6">
                    <span className="text-brand-300 font-serif text-xl sm:text-2xl leading-none">&ldquo;</span>
                  </div>
                  <h3 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-brand-950 mb-4 sm:mb-6">{values[2].title}</h3>
                  <p className="text-lg sm:text-xl text-brand-950/80 font-medium leading-relaxed">{values[2].description}</p>
                </div>
              </div>
            )}

          </div>
        </div>
      </section>

      {/* ═══ 3. DESIRE: SCRUBBING TEXT REVEAL (The Founder/Vision) ═══ */}
      <section className="founder-section py-32 lg:py-56 px-6 sm:px-12 lg:px-24 bg-brand-950 text-white relative overflow-hidden">
        {/* Background Parallax Image with noise */}
        <div className="absolute inset-0 z-0 opacity-30">
          <Image 
            src={getImageUrl(heroImage)} 
            alt="Founder Background" 
            fill 
            className="founder-parallax-img object-cover object-center filter saturate-50" 
          />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(5,20,8,0.7)_0%,rgba(5,20,8,0.98)_100%)]" />
          {/* Subtle noise overlay */}
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-overlay bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
        </div>

        {/* Decorative ambient glow */}
        <div className="absolute top-1/2 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gold-500/10 rounded-full blur-[140px] pointer-events-none z-0" />
        
        <div className="max-w-[1400px] mx-auto relative z-10 flex flex-col">
          
          <div className="flex flex-col lg:flex-row items-center justify-between gap-12 lg:gap-0 mb-24 lg:mb-40">
            {/* The Scrubbing Text (Massive) */}
            <div className="lg:w-[65%] z-20">
              <div className="flex items-center gap-6 mb-12">
                <span className="w-16 h-px bg-gold-500/50" />
                <h4 className="text-sm font-bold tracking-[0.3em] uppercase text-gold-500">The Legacy</h4>
              </div>
              <h2 
                ref={scrubTextRef}
                className="text-[24px] sm:text-[32px] lg:text-[40px] font-black tracking-tight leading-[1.2] max-w-4xl text-white"
              >
                {founderBio.split(" ").map((word: string, i: number) => {
                  const isEmphasized = word.toLowerCase().includes("authentic") || word.toLowerCase().includes("uncorrupted") || word.toLowerCase().includes("home-made") || word.toLowerCase().includes("passion");
                  return (
                    <span key={i} className="inline-block overflow-hidden pb-1 mr-[0.25em]">
                      <span className={`scrub-word block ${isEmphasized ? "font-serif italic text-gold-300 font-medium" : ""}`}>
                        {word}
                      </span>
                    </span>
                  )
                })}
              </h2>
            </div>
            
            {/* Artistic Floating Image - Asymmetric */}
            <div className="lg:w-[45%] w-full flex justify-end lg:-ml-20 z-10 lg:-mt-24">
              <div className="founder-img-container w-full max-w-[500px] aspect-[3/4] relative rounded-[20px] overflow-hidden shadow-[0_40px_80px_rgba(0,0,0,0.6)] border border-white/10">
                 {/* True Glassmorphism Inner Border */}
                 <div className="absolute inset-0 border border-white/20 rounded-[20px] pointer-events-none z-20 mix-blend-overlay" />
                 <Image 
                  src={getImageUrl(founderImage)} 
                  alt={founderName} 
                  fill 
                  className="founder-img-reveal object-cover" 
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-12 border-t border-white/10 pt-16">
            <div className="max-w-2xl">
              <p className="text-lg sm:text-xl lg:text-2xl font-serif italic text-white/70 leading-relaxed">
                &ldquo;{vision}&rdquo;
              </p>
            </div>
            <div className="flex flex-col items-start md:items-end gap-4">
              <h4 className="text-2xl sm:text-3xl font-black text-white tracking-tighter uppercase">{founderName}</h4>
              <div className="flex items-center gap-4">
                <span className="w-12 h-px bg-brand-500/50" />
                <p className="text-gold-500 font-bold tracking-[0.2em] uppercase text-xs">Founder & Patriarch</p>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ═══ 4. THE HERITAGE CHRONICLES (Blog/Story mapping) ═══ */}
      <section className="py-20 lg:py-48 px-4 sm:px-12 lg:px-24 bg-[#FAF9F6] text-brand-950 relative">
        <div className="max-w-[1400px] mx-auto">
          
          <div className="flex flex-col md:flex-row justify-between items-end mb-16 lg:mb-24 gap-8 lg:gap-12">
            <h2 className="text-[40px] md:text-[64px] lg:text-[80px] font-black tracking-tighter leading-[0.9] uppercase">
              Heritage<br />
              <span className="text-brand-800 italic font-serif lowercase tracking-normal text-[48px] md:text-[72px] lg:text-[96px]">chronicles</span>
            </h2>
            <Link 
              href="/blog" 
              className="group flex items-center gap-4 text-brand-800 font-bold uppercase tracking-[0.2em] text-sm hover:text-brand-900 transition-colors pb-4"
            >
              View all Blogs & Stories
              <span className="w-12 h-px bg-brand-800 group-hover:w-24 transition-all duration-700 ease-out" />
            </Link>
          </div>

          {/* Editorial Border-Separated List */}
          <div className="flex flex-col border-t-2 border-brand-950/10">
            {brandStories.map((story: any, i: number) => (
              <Link 
                href={story.slug ? `/blog/${story.slug}` : "/blog"}
                key={story._id || i}
                className="group flex flex-col lg:flex-row justify-between items-start lg:items-center py-12 lg:py-16 border-b-2 border-brand-950/10 hover:bg-brand-900 hover:px-8 lg:hover:px-12 transition-all duration-500 ease-out"
              >
                {/* Number & Category */}
                <div className="flex items-center gap-8 mb-6 lg:mb-0 w-full lg:w-1/4">
                  <span className="text-sm font-bold tracking-widest text-brand-400 group-hover:text-gold-500 transition-colors">
                    {(i + 1).toString().padStart(2, '0')}
                  </span>
                  <div className="h-px w-12 bg-brand-950/20 group-hover:bg-gold-500/50 transition-colors" />
                  <span className="text-xs font-bold uppercase tracking-[0.2em] text-brand-600 group-hover:text-brand-300 transition-colors">
                    Story
                  </span>
                </div>

                {/* Title */}
                <div className="w-full lg:w-2/4 mb-8 lg:mb-0 pr-8">
                  <h3 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight leading-tight group-hover:text-white transition-colors line-clamp-2">
                    {story.title}
                  </h3>
                </div>

                {/* Hover Reveal Image */}
                <div className="w-full lg:w-1/4 flex justify-start lg:justify-end">
                  <div className="w-[180px] sm:w-[220px] aspect-[4/3] relative overflow-hidden rounded-2xl shadow-xl lg:opacity-0 lg:-translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] lg:scale-95 group-hover:scale-100">
                    <Image 
                      src={getImageUrl(story.image || story.featuredImage || NAMKEEN_IMAGES.mixture)} 
                      alt={story.title} 
                      fill 
                      className="object-cover filter grayscale group-hover:grayscale-0 transition-all duration-700"
                    />
                  </div>
                </div>
              </Link>
            ))}
          </div>

        </div>
      </section>

      {/* ═══ 5. ACTION: FOOTER CTA ═══ */}
      <section className="py-32 lg:py-56 px-6 text-center bg-brand-50 border-t border-brand-100">
        <div className="max-w-5xl mx-auto flex flex-col items-center">
          <h2 className="text-[64px] sm:text-[88px] lg:text-[140px] font-black tracking-[-0.04em] leading-[0.85] text-brand-950 mb-16">
            <span className="block">Taste the</span>
            <span className="font-serif italic text-brand-600 tracking-[-0.02em] block mt-4">Difference.</span>
          </h2>
          
          <Link
            href="/products"
            className="group relative inline-flex items-center justify-center gap-6 px-16 py-6 bg-brand-950 text-white rounded-full font-black text-2xl hover:bg-brand-900 hover:scale-105 shadow-[0_20px_40px_rgba(5,20,8,0.2)] focus-visible:outline-none transition-all duration-500"
          >
            Explore the Shop
            <ArrowRight size={28} className="group-hover:translate-x-3 transition-transform duration-300" />
          </Link>
        </div>
      </section>

    </main>
  );
}
