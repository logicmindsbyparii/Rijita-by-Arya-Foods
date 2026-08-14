"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  HelpCircle,
  ChevronDown,
  Search,
  X,
  Sparkles,
  MessageSquare,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { contentApi } from "@/lib/api";

interface FaqItem {
  question: string;
  answer: string;
  category: string;
}

const faqs: FaqItem[] = [
  {
    category: "Orders",
    question: "How do I place an order?",
    answer: "Browse our products, add items to your cart, and proceed to checkout. Fill in your delivery details and place the order. You'll receive a confirmation on WhatsApp. Alternatively, you can order directly via WhatsApp by sending us a message with your requirements.",
  },
  {
    category: "Orders",
    question: "Can I modify or cancel my order?",
    answer: "Orders can be modified or cancelled within 2 hours of placement. Please contact us on WhatsApp with your order number and the changes required. Once the order is processed for dispatch, modifications may not be possible.",
  },
  {
    category: "Orders",
    question: "How do I track my order?",
    answer: "You can track your order using the order number sent to your WhatsApp. Visit our Track Order page, enter your order number, and you'll see the current status and tracking information.",
  },
  {
    category: "Payment",
    question: "What payment methods do you accept?",
    answer: "Currently, we accept orders through WhatsApp and process payments via UPI, bank transfer, or cash on delivery (COD) in select areas. Online payment integration is coming soon.",
  },
  {
    category: "Payment",
    question: "Is COD (Cash on Delivery) available?",
    answer: "Yes, COD is available in select areas. You can choose the COD option during checkout. A nominal convenience fee may apply for COD orders.",
  },
  {
    category: "Shipping",
    question: "What are your delivery charges?",
    answer: "We offer free delivery on orders above ₹499. For orders below ₹499, a standard delivery charge of ₹49 applies. We deliver across India.",
  },
  {
    category: "Shipping",
    question: "How long does delivery take?",
    answer: "We dispatch orders within 24-48 hours. Delivery typically takes 2-5 business days depending on your location. Remote areas may take slightly longer.",
  },
  {
    category: "Shipping",
    question: "Do you ship internationally?",
    answer: "Currently, we ship only within India. We plan to start international shipping soon. Follow us on Instagram for updates on international availability.",
  },
  {
    category: "Products",
    question: "Are your products Jain-friendly?",
    answer: "Yes! We offer a wide range of Jain-friendly snacks made without onion, garlic, ginger, or root vegetables. Look for the 'Jain' tag on product pages to identify Jain-safe options.",
  },
  {
    category: "Products",
    question: "Do you use preservatives?",
    answer: "No, we pride ourselves on using 100% natural ingredients with no added preservatives or artificial flavors. Our products are made using traditional recipes and natural preservation methods.",
  },
  {
    category: "Products",
    question: "What is the shelf life of your products?",
    answer: "Our products typically have a shelf life of 3-6 months from the date of manufacture. The exact shelf life is mentioned on each product's packaging and product page.",
  },
  {
    category: "Quality",
    question: "Are your products FSSAI approved?",
    answer: "Yes, all our products are FSSAI approved. We maintain strict quality control and hygiene standards in our production facility. Our FSSAI license number is mentioned on all product packaging.",
  },
  {
    category: "Quality",
    question: "What is your quality control process?",
    answer: "We follow a rigorous quality control process including raw material testing, in-process quality checks, and final product inspection. Our facility follows GMP (Good Manufacturing Practices) standards.",
  },
  {
    category: "Returns",
    question: "What is your return policy?",
    answer: "If you receive a damaged or defective product, please contact us within 24 hours via WhatsApp with photos of the issue. We will arrange a replacement or refund. For more details, visit our Refund Policy page.",
  },
  {
    category: "Returns",
    question: "Can I return a product if I don't like the taste?",
    answer: "We take great care in ensuring consistent quality. If you're unsatisfied with the taste, please reach out to us. We value your feedback and will work with you to find a satisfactory solution.",
  },
  {
    category: "Wholesale",
    question: "Do you offer bulk/wholesale pricing?",
    answer: "Yes, we offer special pricing for bulk orders and wholesale purchases. Visit our Wholesale page or contact us directly for customized pricing based on your requirements.",
  },
  {
    category: "Wholesale",
    question: "How can I become a distributor?",
    answer: "We're always looking for passionate distributors. Visit our Become a Distributor page, fill in your details, and our team will get in touch with you regarding distributorship opportunities.",
  },
];

const categories = [...new Set(faqs.map((f) => f.category))];

export default function FaqPage() {
  const [openId, setOpenId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const { data: settingsData } = useQuery({ queryKey: ["settings"], queryFn: () => contentApi.getSiteSettings(), staleTime: 10 * 60 * 1000 });
  const whatsappNumber = settingsData?.data?.settings?.whatsapp?.number || process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "919876543210";

  const filtered = faqs.filter((faq) => {
    const matchSearch = !search ||
      faq.question.toLowerCase().includes(search.toLowerCase()) ||
      faq.answer.toLowerCase().includes(search.toLowerCase());
    const matchCategory = activeCategory === "all" || faq.category === activeCategory;
    return matchSearch && matchCategory;
  });

  return (
    <div className="min-h-screen pt-36 sm:pt-40 lg:pt-44 pb-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-brand-100 rounded-full text-brand-700 text-sm font-medium mb-4">
            <HelpCircle size={16} />
            FAQ
          </div>
          <h1 className="text-4xl md:text-5xl font-display font-bold mb-4">
            Frequently Asked <span className="text-brand-600">Questions</span>
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            Everything you need to know about ordering, shipping, products, and more.
            Can&apos;t find what you&apos;re looking for? Contact us!
          </p>
        </motion.div>

        {/* Search */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="relative max-w-xl mx-auto mb-8"
        >
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search questions..."
            className="w-full pl-12 pr-10 py-4 rounded-xl border bg-background focus:outline-none focus:ring-2 focus:ring-brand-500/50 transition-ui text-sm"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-4 top-1/2 -translate-y-1/2 p-2 hover:bg-muted rounded-full">
              <X size={14} />
            </button>
          )}
        </motion.div>

        {/* Category Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="flex flex-wrap justify-center gap-2 mb-8"
        >
          <button
            onClick={() => setActiveCategory("all")}
            className={cn(
              "px-4 py-2 rounded-xl text-sm font-medium transition-ui",
              activeCategory === "all"
                ? "bg-brand-500 text-white shadow-md shadow-brand-500/20"
                : "bg-muted text-muted-foreground hover:bg-brand-50 hover:text-brand-600"
            )}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                "px-4 py-2 rounded-xl text-sm font-medium transition-ui",
                activeCategory === cat
                  ? "bg-brand-500 text-white shadow-md shadow-brand-500/20"
                  : "bg-muted text-muted-foreground hover:bg-brand-50 hover:text-brand-600"
              )}
            >
              {cat}
            </button>
          ))}
        </motion.div>

        {/* FAQ Items */}
        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <HelpCircle size={40} className="mx-auto mb-4 text-muted-foreground/30" />
            <h3 className="text-lg font-medium mb-2">No matching questions</h3>
            <p className="text-muted-foreground mb-4">Try a different search term</p>
            <button onClick={() => { setSearch(""); setActiveCategory("all"); }} className="px-6 py-2 bg-brand-500 text-white rounded-xl font-medium text-sm hover:bg-brand-600 transition-colors">
              Reset Filters
            </button>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-4"
          >
            {filtered.map((faq, i) => {
              const isOpen = openId === i;
              return (
                <div
                  key={i}
                  className="border border-border rounded-xl overflow-hidden bg-white"
                >
                  <button
                    onClick={() => setOpenId(isOpen ? null : i)}
                    className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/30 transition-colors"
                  >
                    <span className="font-medium pr-4 text-sm md:text-base">{faq.question}</span>
                    <ChevronDown
                      size={18}
                      className={cn(
                        "text-muted-foreground flex-shrink-0 transition-transform duration-300",
                        isOpen && "rotate-180"
                      )}
                    />
                  </button>
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                      >
                        <p className="px-4 pb-4 text-sm text-muted-foreground leading-relaxed">
                          {faq.answer}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </motion.div>
        )}

        {/* Still have questions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-12 text-center bg-cream rounded-2xl p-8 border"
        >
          <MessageSquare size={32} className="mx-auto mb-4 text-brand-400" />
          <h3 className="text-xl font-display font-bold mb-2">Still Have Questions?</h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Our team is here to help. Reach out to us and we&apos;ll get back to you within 24 hours.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 px-6 py-4 bg-brand-500 text-white rounded-xl font-medium hover:bg-brand-600 transition-ui"
            >
              <MessageSquare size={16} />
              Contact Us
            </Link>
            <a
              href={`https://wa.me/${whatsappNumber}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-4 bg-green-500 text-white rounded-xl font-medium hover:bg-green-600 transition-ui"
            >
              Chat on WhatsApp
            </a>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
