"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ShoppingBag,
  Package,
  IndianRupee,
  Truck,
  Shield,
  CheckCircle,
  ArrowRight,
  Send,
  Sparkles,
  Percent,
  Star,
  Users,
  Scale,
  Headphones,
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import { contentApi } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const benefits = [
  { icon: Percent, title: "Bulk Discounts", description: "Special pricing for orders above ₹2,000. Save up to 25% on bulk purchases." },
  { icon: Truck, title: "Free Delivery", description: "Free pan-India delivery on all bulk orders above ₹5,000." },
  { icon: Shield, title: "Quality Guarantee", description: "All products meet our premium quality standards with FSSAI certification." },
  { icon: Package, title: "Custom Packaging", description: "Custom packaging options available for corporate gifting and events." },
  { icon: Star, title: "Priority Support", description: "Dedicated account manager for all your bulk order requirements." },
  { icon: Scale, title: "Flexible MOQ", description: "Flexible minimum order quantities to suit businesses of all sizes." },
];

const pricingTiers = [
  { label: "₹2,000 - ₹5,000", discount: "10% Off", badge: "Standard", color: "bg-paper-3 text-ink-2 border border-rule" },
  { label: "₹5,000 - ₹15,000", discount: "15% Off", badge: "Silver", color: "bg-ink-2 text-paper" },
  { label: "₹15,000 - ₹50,000", discount: "20% Off", badge: "Gold", color: "bg-gold-500 text-brand-950" },
  { label: "₹50,000+", discount: "25% Off", badge: "Platinum", color: "bg-brand-800 text-white" },
];

export default function WholesalePage() {
  const [form, setForm] = useState({ name: "", email: "", phone: "", company: "", message: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { data: settingsData } = useQuery({ queryKey: ["settings"], queryFn: () => contentApi.getSiteSettings(), staleTime: 10 * 60 * 1000 });
  const whatsappNumber = settingsData?.data?.settings?.whatsapp?.number || process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "919876543210";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.phone) {
      toast.error("Please fill in all required fields");
      return;
    }
    setSubmitting(true);
    try {
      const submissionMessage = form.message.trim() || 
        `Company: ${form.company || 'N/A'}\nInterested in wholesale / bulk orders for RIJITA.`;
        
      await contentApi.submitContact({
        ...form,
        message: submissionMessage,
        subject: "Wholesale Inquiry",
        type: "wholesale",
      });
      toast.success("Thank you! Our team will contact you within 24 hours.");
      setSubmitted(true);
    } catch (err: any) {
      toast.error(err?.message || "Failed to submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-dvh pt-32 sm:pt-40 lg:pt-48 xl:pt-[200px] pb-16 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Hero */}
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 border border-brand-600/20 bg-brand-600/10 rounded-full text-brand-700 text-sm font-medium mb-4">
            <ShoppingBag size={16} />
            Wholesale Program
          </div>
          <h1 className="text-4xl md:text-6xl font-display font-black text-ink mb-4 tracking-tight">
            Bulk Order & <span className="font-serif italic font-medium text-gold-600">Wholesale</span>
          </h1>
          <p className="text-ink-2 max-w-3xl mx-auto text-lg [text-wrap:pretty]">
            Stock your shelves with the finest Indian snacks. Join our wholesale program
            and enjoy exclusive pricing, priority support, and seamless delivery across India.
          </p>
        </motion.div>

        {/* Benefits */}
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-16"
        >
          {benefits.map((benefit, i) => {
            const Icon = benefit.icon;
            return (
              <motion.div
                key={benefit.title}
                animate={{ opacity: 1, y: 0 }}
                className="bg-paper-2 rounded-2xl p-6 border border-rule card-hover"
              >
                <div className="w-12 h-12 rounded-xl bg-brand-600/10 flex items-center justify-center mb-4">
                  <Icon size={24} className="text-brand-700" />
                </div>
                <h3 className="font-display font-bold text-ink mb-2">{benefit.title}</h3>
                <p className="text-sm text-ink-2">{benefit.description}</p>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Pricing Tiers */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <h2 className="text-3xl font-display font-black text-ink text-center mb-8">
            Pricing <span className="font-serif italic font-medium text-gold-600">Tiers</span>
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {pricingTiers.map((tier) => (
              <div key={tier.label} className="bg-paper-2 rounded-2xl border border-rule p-6 text-center card-hover">
                <div className={cn("inline-block px-4 py-2 rounded-full text-xs font-semibold mb-4", tier.color)}>
                  {tier.badge}
                </div>
                <p className="text-2xl font-bold font-display text-ink mb-2">{tier.discount}</p>
                <p className="text-sm text-ink-2">on orders of</p>
                <p className="text-lg font-semibold text-ink mt-2">{tier.label}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Process */}
        <motion.div
          className="bg-paper-2 rounded-2xl p-8 md:p-12 border border-rule mb-16"
        >
          <h2 className="text-3xl font-display font-black text-ink text-center mb-10">
            How It <span className="font-serif italic font-medium text-gold-600">Works</span>
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { step: "01", title: "Submit Inquiry", desc: "Fill the form below with your requirements" },
              { step: "02", title: "Get a Quote", desc: "Our team will send you a customized quote" },
              { step: "03", title: "Place Order", desc: "Confirm your order via WhatsApp or email" },
              { step: "04", title: "Doorstep Delivery", desc: "Receive your order with free delivery" },
            ].map((step) => (
              <div key={step.step} className="text-center">
                <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-brand-600 text-white flex items-center justify-center text-xl font-bold font-display">
                  {step.step}
                </div>
                <h4 className="font-semibold text-ink mb-2">{step.title}</h4>
                <p className="text-sm text-ink-2">{step.desc}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Form + Info */}
        <div className="grid lg:grid-cols-5 gap-10">
          <motion.div
            className="lg:col-span-3"
          >
            {submitted ? (
              <div className="bg-brand-600/5 border border-brand-600/20 rounded-2xl p-8 text-center">
                <CheckCircle size={48} className="mx-auto mb-4 text-brand-600" />
                <h3 className="text-xl font-display font-bold text-ink mb-2">Inquiry submitted.</h3>
                <p className="text-ink-2 mb-6">Our wholesale team will reach out within 24 hours with a customized quote.</p>
                <Button onClick={() => setSubmitted(false)} variant="outline">Submit Another Inquiry</Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <h3 className="text-2xl font-display font-bold text-ink mb-2">Send Us Your Requirements</h3>
                <p className="text-ink-2 mb-4">Fill in the details and our team will get back to you with a customized quote.</p>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="ws-name" className="block text-sm font-medium text-ink-2 mb-2">Name *</label>
                    <input id="ws-name" type="text" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} className="w-full h-12 px-4 rounded-xl border border-rule bg-paper focus:outline-none focus:ring-2 focus:ring-[var(--color-focus)] text-sm" placeholder="Your name" />
                  </div>
                  <div>
                    <label htmlFor="ws-email" className="block text-sm font-medium text-ink-2 mb-2">Email *</label>
                    <input id="ws-email" type="email" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} className="w-full h-12 px-4 rounded-xl border border-rule bg-paper focus:outline-none focus:ring-2 focus:ring-[var(--color-focus)] text-sm" placeholder="your@email.com" />
                  </div>
                  <div>
                    <label htmlFor="ws-phone" className="block text-sm font-medium text-ink-2 mb-2">Phone *</label>
                    <input id="ws-phone" type="tel" value={form.phone} onChange={(e) => setForm({...form, phone: e.target.value})} className="w-full h-12 px-4 rounded-xl border border-rule bg-paper focus:outline-none focus:ring-2 focus:ring-[var(--color-focus)] text-sm" placeholder="+91 98765 43210" />
                  </div>
                  <div>
                    <label htmlFor="ws-company" className="block text-sm font-medium text-ink-2 mb-2">Company / Store Name</label>
                    <input id="ws-company" type="text" value={form.company} onChange={(e) => setForm({...form, company: e.target.value})} className="w-full h-12 px-4 rounded-xl border border-rule bg-paper focus:outline-none focus:ring-2 focus:ring-[var(--color-focus)] text-sm" placeholder="Your business name" />
                  </div>
                </div>
                <div>
                  <label htmlFor="ws-message" className="block text-sm font-medium text-ink-2 mb-2">Message / Requirements</label>
                  <textarea id="ws-message" value={form.message} onChange={(e) => setForm({...form, message: e.target.value})} rows={4} className="w-full px-4 py-3 rounded-xl border border-rule bg-paper focus:outline-none focus:ring-2 focus:ring-[var(--color-focus)] text-sm resize-none" placeholder="Tell us about your requirements, estimated quantity, etc." />
                </div>
                <Button type="submit" disabled={submitting} size="lg">
                  {submitting ? "Submitting..." : <><Send size={16} className="mr-2" /> Submit Inquiry</>}
                </Button>
              </form>
            )}
          </motion.div>

          {/* Sidebar */}
          <motion.div
            className="lg:col-span-2 space-y-6"
          >
            <div className="bg-brand-800 rounded-2xl p-6 text-white">
              <Headphones size={28} className="mb-4 text-gold-400" />
              <h4 className="font-display font-bold text-lg mb-2">Need Help?</h4>
              <p className="text-paper/80 text-sm mb-4">Our wholesale team is available to assist you.</p>
              <a href={`https://wa.me/${whatsappNumber}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 bg-gold-500 text-brand-950 rounded-xl text-sm font-bold hover:bg-gold-600 transition-colors">
                Chat on WhatsApp
              </a>
            </div>

            <div className="bg-paper-2 rounded-2xl p-6 border border-rule space-y-4">
              <h4 className="font-display font-bold text-ink">Quick Info</h4>
              {[
                { label: "Min. Order", value: "₹2,000" },
                { label: "Delivery", value: "Pan India (Free)" },
                { label: "Payment", value: "UPI / Bank Transfer" },
                { label: "Response Time", value: "Within 24 hours" },
              ].map((info) => (
                <div key={info.label} className="flex justify-between text-sm">
                  <span className="text-ink-3">{info.label}</span>
                  <span className="font-medium text-ink">{info.value}</span>
                </div>
              ))}
            </div>

            <div className="bg-paper-2 rounded-2xl p-6 border border-rule text-center">
              <Users size={24} className="mx-auto mb-2 text-brand-700" />
              <p className="text-sm font-medium text-ink">Partner with retailers across India</p>
              <p className="text-xs text-ink-3 mt-2">Bulk orders · Custom packaging · Priority support</p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
