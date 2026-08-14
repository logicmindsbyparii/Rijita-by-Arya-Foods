"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin,
  Phone,
  Mail,
  MessageSquare,
  ChevronDown,
  Send,
  Clock,
  Instagram,
  Youtube,
  Facebook,
  Twitter,
  CheckCircle,
  Sparkles,
  Navigation,
  ShieldCheck,
  Building2,
} from "lucide-react";
import toast from "react-hot-toast";
import { contentApi } from "@/lib/api";
import { cn } from "@/lib/utils";

const contactSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().min(10, "Please enter a valid 10-digit phone number").max(15),
  subject: z.string().min(5, "Subject must be at least 5 characters"),
  message: z.string().min(15, "Message must be at least 15 characters"),
});

type ContactFormValues = z.infer<typeof contactSchema>;

interface FaqItem {
  question: string;
  answer: string;
}

const faqs: FaqItem[] = [
  {
    question: "How can I place an order for Jain Namkeen?",
    answer: "You can easily browse our products on the storefront and place your order directly via WhatsApp or our online checkout. For bulk or wholesale orders, feel free to reach out using the contact form.",
  },
  {
    question: "What is your dispatch & delivery timeframe?",
    answer: "All orders are freshly packed and dispatched within 24-48 hours. Standard domestic delivery across India takes approximately 2 to 5 business days.",
  },
  {
    question: "Are all RIJITA products 100% Jain compliant?",
    answer: "Yes! Every single product under the RIJITA brand is crafted following strict 100% Jain dietary guidelines — strictly zero onion, zero garlic, and zero root vegetables.",
  },
  {
    question: "Do you ship nationwide across India?",
    answer: "Yes, we provide safe, high-grade express shipping to all postal pincodes across India.",
  },
  {
    question: "How can I visit your physical store in Surat?",
    answer: "Our flagship retail store is located at Shop no - 12B, Veer Arihanta Shopping Complex, near Nishal Circle, Pal, Surat, Gujarat 395009. We are open Monday to Saturday from 9:00 AM to 8:00 PM.",
  },
];

const businessHours = [
  { day: "Monday - Saturday", hours: "9:00 AM - 8:00 PM" },
  { day: "Sunday", hours: "10:00 AM - 6:00 PM" },
];

const defaultSocialLinks = [
  { icon: Instagram, href: "https://instagram.com/rijitabyaryafoods", label: "Instagram", hoverColor: "hover:bg-pink-600 hover:text-white" },
  { icon: Facebook, href: "https://facebook.com/rijitabyaryafoods", label: "Facebook", hoverColor: "hover:bg-blue-600 hover:text-white" },
  { icon: Youtube, href: "https://youtube.com/@rijitabyaryafoods", label: "YouTube", hoverColor: "hover:bg-red-600 hover:text-white" },
  { icon: Twitter, href: "https://twitter.com/rijitafoods", label: "Twitter", hoverColor: "hover:bg-sky-500 hover:text-white" },
];

function FaqAccordion({ item, isOpen, onToggle }: { item: FaqItem; isOpen: boolean; onToggle: () => void }) {
  return (
    <div className="border border-stone-200/90 rounded-2xl overflow-hidden bg-white shadow-xs transition-ui duration-200">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-5 text-left hover:bg-stone-50/80 transition-colors"
      >
        <span className="font-display font-bold text-base text-stone-900 pr-4 leading-snug">{item.question}</span>
        <div className={cn("w-8 h-8 rounded-full flex items-center justify-center bg-stone-100 text-stone-600 shrink-0 transition-transform duration-300", isOpen && "rotate-180 bg-brand-600 text-white")}>
          <ChevronDown size={16} />
        </div>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 pt-1 text-sm text-stone-600 leading-relaxed border-t border-stone-100 font-normal">
              {item.answer}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function ContactPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const { data: settingsData } = useQuery({
    queryKey: ["settings"],
    queryFn: () => contentApi.getSiteSettings(),
    staleTime: 30 * 1000,
  });
  const settings = settingsData?.data?.settings;
  const contactPhone = settings?.phone || "+91 99044 59998";
  const whatsappNumber = settings?.whatsapp?.number || process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "919904459998";
  const contactEmail = settings?.email || "info@rijita.com";
  const storeAddress = settings?.address || "Shop no - 12B, Veer arihanta shopping complex, near nishal circle, Pal, Surat, Gujarat 395009";

  const socialLinks = defaultSocialLinks.map((s) => ({
    ...s,
    href: (settings?.socialMedia as any)?.[s.label.toLowerCase()] || s.href,
  }));

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
  });

  const onSubmit = async (data: ContactFormValues) => {
    setIsSubmitting(true);
    try {
      await contentApi.submitContact(data);
      toast.success("Thank you for reaching out! Your message has been sent to our team.", {
        duration: 5000,
      });
      setIsSubmitted(true);
      reset();
    } catch (err: any) {
      toast.error(err?.message || "Failed to send message. Please try again or WhatsApp us directly.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-stone-50/50 min-h-screen">
      {/* ==================== HERO BANNER ==================== */}
      <section className="relative bg-brand-700 text-white pt-36 sm:pt-40 lg:pt-44 pb-20 overflow-hidden border-b border-brand-600">
        {/* Background glow graphics */}

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="max-w-3xl"
          >
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/15 text-amber-300 text-xs font-bold tracking-widest uppercase mb-6 backdrop-blur-md">
              <Sparkles size={14} className="text-amber-300" />
              <span>We Are Here For You</span>
            </div>
            
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-black tracking-tight leading-[1.1] mb-6">
              Connect With <span className="text-amber-300 underline decoration-amber-400/40 underline-offset-8">RIJITA</span> Arya Foods
            </h1>

            <p className="text-base sm:text-lg text-emerald-100/90 leading-relaxed font-normal max-w-2xl">
              Whether you have inquiries about our 100% pure Jain namkeen, bulk orders, or custom gifting — our team in Surat is ready to assist you.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ==================== MAIN SECTION (FORM + SIDEBAR) ==================== */}
      <section className="py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-12 gap-12 lg:gap-16 items-start">
            
            {/* ==================== FORM COLUMN (7 COLS) ==================== */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-10 border border-stone-200/80 shadow-xl shadow-stone-200/40"
            >
              <div className="mb-8 border-b border-stone-100 pb-6">
                <h2 className="text-2xl sm:text-3xl font-display font-bold text-stone-900 tracking-tight">
                  Send Us a Direct Message
                </h2>
                <p className="text-stone-500 text-sm mt-1 font-medium">
                  Fill in the form below and our team will get back to you within 24 hours.
                </p>
              </div>

              {isSubmitted ? (
                <motion.div
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-emerald-50 border border-emerald-200 rounded-2xl p-8 text-center"
                >
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-brand-600 text-white flex items-center justify-center shadow-lg shadow-emerald-900/20">
                    <CheckCircle size={32} />
                  </div>
                  <h3 className="text-2xl font-display font-bold text-stone-900 mb-2">Message Sent Successfully!</h3>
                  <p className="text-stone-600 text-sm mb-6 max-w-md mx-auto leading-relaxed">
                    Thank you for reaching out to RIJITA by Arya Foods. We have received your inquiry and will respond shortly.
                  </p>
                  <button
                    onClick={() => setIsSubmitted(false)}
                    className="px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-colors shadow-sm"
                  >
                    Send Another Message
                  </button>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid sm:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="name" className="block text-xs font-bold tracking-wider text-stone-700 uppercase mb-2">
                        Full Name <span className="text-emerald-700">*</span>
                      </label>
                      <input
                        id="name"
                        {...register("name")}
                        placeholder="e.g. Rahul Shah"
                        className={cn(
                          "w-full h-12 rounded-xl border bg-stone-50/50 px-4 text-sm font-medium text-stone-900 transition-ui focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-600",
                          errors.name ? "border-rose-400 focus:ring-rose-400" : "border-stone-200"
                        )}
                      />
                      {errors.name && <p className="text-xs text-rose-500 mt-1 font-semibold">{errors.name.message}</p>}
                    </div>

                    <div>
                      <label htmlFor="email" className="block text-xs font-bold tracking-wider text-stone-700 uppercase mb-2">
                        Email Address <span className="text-emerald-700">*</span>
                      </label>
                      <input
                        id="email"
                        type="email"
                        {...register("email")}
                        placeholder="e.g. rahul@example.com"
                        className={cn(
                          "w-full h-12 rounded-xl border bg-stone-50/50 px-4 text-sm font-medium text-stone-900 transition-ui focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-600",
                          errors.email ? "border-rose-400 focus:ring-rose-400" : "border-stone-200"
                        )}
                      />
                      {errors.email && <p className="text-xs text-rose-500 mt-1 font-semibold">{errors.email.message}</p>}
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="phone" className="block text-xs font-bold tracking-wider text-stone-700 uppercase mb-2">
                        Phone Number <span className="text-emerald-700">*</span>
                      </label>
                      <input
                        id="phone"
                        type="tel"
                        {...register("phone")}
                        placeholder="+91 99044 59998"
                        className={cn(
                          "w-full h-12 rounded-xl border bg-stone-50/50 px-4 text-sm font-medium text-stone-900 transition-ui focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-600",
                          errors.phone ? "border-rose-400 focus:ring-rose-400" : "border-stone-200"
                        )}
                      />
                      {errors.phone && <p className="text-xs text-rose-500 mt-1 font-semibold">{errors.phone.message}</p>}
                    </div>

                    <div>
                      <label htmlFor="subject" className="block text-xs font-bold tracking-wider text-stone-700 uppercase mb-2">
                        Subject / Inquiry Type <span className="text-emerald-700">*</span>
                      </label>
                      <input
                        id="subject"
                        {...register("subject")}
                        placeholder="Product inquiry, Gifting, Bulk Order"
                        className={cn(
                          "w-full h-12 rounded-xl border bg-stone-50/50 px-4 text-sm font-medium text-stone-900 transition-ui focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-600",
                          errors.subject ? "border-rose-400 focus:ring-rose-400" : "border-stone-200"
                        )}
                      />
                      {errors.subject && <p className="text-xs text-rose-500 mt-1 font-semibold">{errors.subject.message}</p>}
                    </div>
                  </div>

                  <div>
                    <label htmlFor="message" className="block text-xs font-bold tracking-wider text-stone-700 uppercase mb-2">
                      Your Message <span className="text-emerald-700">*</span>
                    </label>
                    <textarea
                      id="message"
                      {...register("message")}
                      rows={5}
                      placeholder="Tell us how we can help you..."
                      className={cn(
                        "w-full rounded-xl border bg-stone-50/50 px-4 py-3.5 text-sm font-medium text-stone-900 transition-ui focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-600 resize-y",
                        errors.message ? "border-rose-400 focus:ring-rose-400" : "border-stone-200"
                      )}
                    />
                    {errors.message && <p className="text-xs text-rose-500 mt-1 font-semibold">{errors.message.message}</p>}
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-4 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-ui shadow-md shadow-emerald-950/20 disabled:opacity-60 disabled:cursor-not-allowed hover:scale-[1.01]"
                  >
                    {isSubmitting ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Submitting...</span>
                      </>
                    ) : (
                      <>
                        <Send size={16} />
                        <span>Send Message</span>
                      </>
                    )}
                  </button>
                </form>
              )}
            </motion.div>

            {/* ==================== SIDEBAR COLUMN (5 COLS) ==================== */}
            <motion.div
              className="lg:col-span-5 space-y-6"
            >
              {/* Card 1: Store Location & Contact Info */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200/80 shadow-lg shadow-stone-200/30 space-y-6">
                <div className="flex items-center gap-3 pb-4 border-b border-stone-100">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-brand-600 flex items-center justify-center shrink-0">
                    <Building2 size={20} />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-lg text-stone-900">Flagship Store & Office</h3>
                    <p className="text-xs text-stone-500 font-medium">Surat, Gujarat, India</p>
                  </div>
                </div>

                <div className="space-y-5 text-sm">
                  <div className="flex items-start gap-4">
                    <div className="w-9 h-9 rounded-xl bg-stone-100 text-stone-700 flex items-center justify-center shrink-0 mt-0.5">
                      <MapPin size={18} className="text-brand-600" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-stone-400 uppercase tracking-wider">Address</p>
                      <p className="text-stone-800 font-semibold mt-0.5 leading-relaxed">{storeAddress}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-9 h-9 rounded-xl bg-stone-100 text-stone-700 flex items-center justify-center shrink-0 mt-0.5">
                      <Phone size={18} className="text-brand-600" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-stone-400 uppercase tracking-wider">Phone / Orders</p>
                      <a href={`tel:${contactPhone}`} className="text-stone-900 font-bold hover:text-brand-600 transition-colors block mt-0.5">
                        {contactPhone}
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-9 h-9 rounded-xl bg-stone-100 text-stone-700 flex items-center justify-center shrink-0 mt-0.5">
                      <Mail size={18} className="text-brand-600" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-stone-400 uppercase tracking-wider">Email</p>
                      <a href={`mailto:${contactEmail}`} className="text-stone-900 font-bold hover:text-brand-600 transition-colors block mt-0.5">
                        {contactEmail}
                      </a>
                    </div>
                  </div>
                </div>

                {/* Instant WhatsApp CTA */}
                <a
                  href={`https://wa.me/${whatsappNumber.replace(/\D/g, "")}?text=${encodeURIComponent("Hello! I have a question regarding RIJITA products.")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-3 px-5 py-4 bg-whatsapp hover:bg-whatsapp-600 text-white rounded-2xl transition-ui font-bold text-xs uppercase tracking-wider shadow-md shadow-emerald-950/20 hover:scale-[1.01]"
                >
                  <MessageSquare size={18} className="fill-white" />
                  <span>Chat Live on WhatsApp</span>
                </a>
              </div>

              {/* Card 2: Business Hours */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200/80 shadow-lg shadow-stone-200/30 space-y-4">
                <div className="flex items-center gap-3 pb-3 border-b border-stone-100">
                  <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                    <Clock size={20} />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-base text-stone-900">Operating Hours</h3>
                    <p className="text-xs text-stone-500 font-medium">Store & Customer Helpline</p>
                  </div>
                </div>

                <div className="space-y-3 pt-1">
                  {businessHours.map((item) => (
                    <div key={item.day} className="flex items-center justify-between text-xs py-1.5 border-b border-stone-100/60 last:border-0">
                      <span className="text-stone-600 font-semibold">{item.day}</span>
                      <span className="font-bold text-brand-600 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100">{item.hours}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Card 3: Social Touchpoints */}
              <div className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-lg shadow-stone-200/30">
                <h4 className="font-display font-bold text-sm text-stone-900 mb-3">Connect on Social Media</h4>
                <div className="flex gap-3">
                  {socialLinks.map((social) => {
                    const Icon = social.icon;
                    return (
                      <a
                        key={social.label}
                        href={social.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={social.label}
                        className={cn(
                          "w-11 h-11 rounded-2xl bg-stone-100 text-stone-700 flex items-center justify-center transition-ui shadow-xs",
                          social.hoverColor
                        )}
                      >
                        <Icon size={18} />
                      </a>
                    );
                  })}
                </div>
              </div>

            </motion.div>
          </div>
        </div>
      </section>

      {/* ==================== STORE LOCATION / MAP SECTION ==================== */}
      <section className="py-12 bg-stone-100/70 border-y border-stone-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-3xl overflow-hidden border border-stone-200/90 shadow-xl grid lg:grid-cols-12 items-stretch">
            
            <div className="lg:col-span-5 p-8 sm:p-10 bg-brand-700 text-white flex flex-col justify-between space-y-6">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-amber-300 text-xs font-bold uppercase tracking-wider mb-4">
                  <Navigation size={13} />
                  <span>Store Directions</span>
                </div>
                <h3 className="text-2xl sm:text-3xl font-display font-bold mb-3">
                  Visit Our Store in Surat
                </h3>
                <p className="text-emerald-100/90 text-sm leading-relaxed font-normal">
                  Experience the authentic taste of 100% pure Jain namkeen, freshly packed snacks, and traditional delicacies in person.
                </p>
              </div>

              <div className="space-y-4 pt-4 border-t border-emerald-700/60">
                <div className="flex items-start gap-3 text-xs text-emerald-100">
                  <MapPin size={16} className="text-amber-300 shrink-0 mt-0.5" />
                  <span className="font-medium">{storeAddress}</span>
                </div>
                
                <a
                  href={`https://maps.google.com/?q=${encodeURIComponent(storeAddress)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-bold text-xs uppercase tracking-wider transition-colors shadow-sm"
                >
                  <span>Open in Google Maps</span>
                  <Navigation size={14} />
                </a>
              </div>
            </div>

            <div className="lg:col-span-7 relative min-h-[340px] bg-stone-200">
              <iframe
                title="RIJITA Store Location Map"
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3720.573199859942!2d72.7795!3d21.1685!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3be04d9b4b9b9b9b%3A0x0!2zMjHCsDEwJzA2LjYiTiA3MsKwNDYnNDYuMiJF!5e0!3m2!1sen!2sin!4v1700000000000!5m2!1sen!2sin"
                width="100%"
                height="100%"
                style={{ border: 0, minHeight: "340px" }}
                allowFullScreen={false}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ==================== FAQ SECTION ==================== */}
      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 text-brand-600 text-xs font-bold tracking-widest uppercase mb-4 border border-emerald-200/80">
              <ShieldCheck size={14} />
              <span>Have Questions?</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-display font-black text-stone-900 tracking-tight">
              Frequently Asked <span className="text-brand-600">Questions</span>
            </h2>
            <p className="text-stone-500 text-sm max-w-xl mx-auto mt-2 font-medium">
              Everything you need to know about our products, ordering process, and dietary guarantees.
            </p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <FaqAccordion
                key={i}
                item={faq}
                isOpen={openFaqIndex === i}
                onToggle={() => setOpenFaqIndex(openFaqIndex === i ? null : i)}
              />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
