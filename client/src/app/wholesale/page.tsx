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
  { label: "₹2,000 - ₹5,000", discount: "10% Off", badge: "Standard" },
  { label: "₹5,000 - ₹15,000", discount: "15% Off", badge: "Silver", color: "from-gray-400 to-gray-500" },
  { label: "₹15,000 - ₹50,000", discount: "20% Off", badge: "Gold", color: "from-spice-gold to-amber-600" },
  { label: "₹50,000+", discount: "25% Off", badge: "Platinum", color: "from-brand-500 to-orange-600" },
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
    <div className="min-h-screen pt-36 sm:pt-40 lg:pt-44 pb-16 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Hero */}
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-brand-100 rounded-full text-brand-700 text-sm font-medium mb-4">
            <ShoppingBag size={16} />
            Wholesale Program
          </div>
          <h1 className="text-4xl md:text-6xl font-display font-bold mb-4">
            Bulk Order & <span className="text-brand-600">Wholesale</span>
          </h1>
          <p className="text-muted-foreground max-w-3xl mx-auto text-lg">
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
                className="bg-white rounded-2xl p-6 border card-hover"
              >
                <div className="w-12 h-12 rounded-xl bg-brand-50 flex items-center justify-center mb-4">
                  <Icon size={24} className="text-brand-500" />
                </div>
                <h3 className="font-display font-bold mb-2">{benefit.title}</h3>
                <p className="text-sm text-muted-foreground">{benefit.description}</p>
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
          <h2 className="text-3xl font-display font-bold text-center mb-8">
            Pricing <span className="text-brand-600">Tiers</span>
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {pricingTiers.map((tier) => (
              <div key={tier.label} className="bg-white rounded-2xl border p-6 text-center card-hover">
                <div className={cn("inline-block px-4 py-2 rounded-full text-xs font-semibold text-white mb-4 bg-gradient-to-r", tier.color || "bg-muted")}>
                  {tier.badge}
                </div>
                <p className="text-2xl font-bold font-display mb-2">{tier.discount}</p>
                <p className="text-sm text-muted-foreground">on orders of</p>
                <p className="text-lg font-semibold mt-2">{tier.label}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Process */}
        <motion.div
          className="bg-cream rounded-2xl p-8 md:p-12 border mb-16"
        >
          <h2 className="text-3xl font-display font-bold text-center mb-10">
            How It <span className="text-brand-600">Works</span>
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { step: "01", title: "Submit Inquiry", desc: "Fill the form below with your requirements" },
              { step: "02", title: "Get a Quote", desc: "Our team will send you a customized quote" },
              { step: "03", title: "Place Order", desc: "Confirm your order via WhatsApp or email" },
              { step: "04", title: "Doorstep Delivery", desc: "Receive your order with free delivery" },
            ].map((step) => (
              <div key={step.step} className="text-center">
                <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-brand-500 text-white flex items-center justify-center text-xl font-bold font-display">
                  {step.step}
                </div>
                <h4 className="font-semibold mb-2">{step.title}</h4>
                <p className="text-sm text-muted-foreground">{step.desc}</p>
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
              <div className="bg-green-50 border border-green-200 rounded-2xl p-8 text-center">
                <CheckCircle size={48} className="mx-auto mb-4 text-green-500" />
                <h3 className="text-xl font-display font-bold text-green-800 mb-2">Inquiry Submitted!</h3>
                <p className="text-green-700/80 mb-6">Our wholesale team will reach out within 24 hours with a customized quote.</p>
                <Button onClick={() => setSubmitted(false)} variant="outline">Submit Another Inquiry</Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <h3 className="text-2xl font-display font-bold mb-2">Send Us Your Requirements</h3>
                <p className="text-muted-foreground mb-4">Fill in the details and our team will get back to you with a customized quote.</p>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Name *</label>
                    <input type="text" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} className="w-full px-4 py-2 rounded-xl border bg-background focus:outline-none focus:ring-2 focus:ring-brand-500/50 text-sm" placeholder="Your name" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Email *</label>
                    <input type="email" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} className="w-full px-4 py-2 rounded-xl border bg-background focus:outline-none focus:ring-2 focus:ring-brand-500/50 text-sm" placeholder="your@email.com" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Phone *</label>
                    <input type="tel" value={form.phone} onChange={(e) => setForm({...form, phone: e.target.value})} className="w-full px-4 py-2 rounded-xl border bg-background focus:outline-none focus:ring-2 focus:ring-brand-500/50 text-sm" placeholder="+91 98765 43210" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Company / Store Name</label>
                    <input type="text" value={form.company} onChange={(e) => setForm({...form, company: e.target.value})} className="w-full px-4 py-2 rounded-xl border bg-background focus:outline-none focus:ring-2 focus:ring-brand-500/50 text-sm" placeholder="Your business name" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Message / Requirements</label>
                  <textarea value={form.message} onChange={(e) => setForm({...form, message: e.target.value})} rows={4} className="w-full px-4 py-2 rounded-xl border bg-background focus:outline-none focus:ring-2 focus:ring-brand-500/50 text-sm resize-none" placeholder="Tell us about your requirements, estimated quantity, etc." />
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
            <div className="bg-gradient-to-br from-brand-500 to-spice-gold rounded-2xl p-6 text-white">
              <Headphones size={28} className="mb-4" />
              <h4 className="font-display font-bold text-lg mb-2">Need Help?</h4>
              <p className="text-white/80 text-sm mb-4">Our wholesale team is available to assist you.</p>
              <a href={`https://wa.me/${whatsappNumber}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 bg-white text-brand-600 rounded-xl text-sm font-medium hover:bg-white/90 transition-colors">
                Chat on WhatsApp
              </a>
            </div>

            <div className="bg-white rounded-2xl p-6 border space-y-4">
              <h4 className="font-semibold">Quick Info</h4>
              {[
                { label: "Min. Order", value: "₹2,000" },
                { label: "Delivery", value: "Pan India (Free)" },
                { label: "Payment", value: "UPI / Bank Transfer" },
                { label: "Response Time", value: "Within 24 hours" },
              ].map((info) => (
                <div key={info.label} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{info.label}</span>
                  <span className="font-medium">{info.value}</span>
                </div>
              ))}
            </div>

            <div className="bg-cream rounded-2xl p-6 border text-center">
              <Users size={24} className="mx-auto mb-2 text-brand-500" />
              <p className="text-sm font-medium">Trusted by 50+ businesses</p>
              <p className="text-xs text-muted-foreground mt-2">Across India</p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
