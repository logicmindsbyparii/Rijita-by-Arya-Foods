"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Users,
  TrendingUp,
  MapPin,
  Shield,
  Headphones,
  CheckCircle,
  Send,
  Award,
  Target,
  Gift,
  BarChart3,
  ArrowRight,
  IndianRupee,
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import { contentApi } from "@/lib/api";
import { Button } from "@/components/ui/button";

const benefits = [
  { icon: Award, title: "Exclusive Territory", description: "Get exclusive distribution rights for your area with protected territory." },
  { icon: TrendingUp, title: "High Margins", description: "Enjoy attractive margins with competitive pricing and volume-based incentives." },
  { icon: Target, title: "Marketing Support", description: "Receive promotional materials, samples, and marketing support from our team." },
  { icon: Gift, title: "Free Samples", description: "Get starter kits and product samples to showcase to your customers." },
  { icon: BarChart3, title: "Sales Analytics", description: "Access to sales reports and insights to optimize your distribution strategy." },
  { icon: Headphones, title: "Dedicated Support", description: "Personal account manager to assist you with orders, queries, and growth." },
];

const requirements = [
  "Minimum 1 year experience in FMCG distribution",
  "Warehouse/storage facility in your city",
  "Sales team to manage retail outreach",
  "Investment capacity for initial stock purchase",
  "Valid GST registration",
  "Passion for quality food products",
];

const process = [
  { step: "01", title: "Submit Application", desc: "Fill the form below with your details and experience" },
  { step: "02", title: "Team Review", desc: "Our team evaluates your application and location" },
  { step: "03", title: "Discussion Call", desc: "We discuss terms, territory, and mutual expectations" },
  { step: "04", title: "Agreement", desc: "Sign the distributor agreement and place first order" },
  { step: "05", title: "Onboarding", desc: "Receive training, samples, and marketing materials" },
];

export default function BecomeDistributorPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    city: "",
    company: "",
    experience: "",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.phone || !form.city) {
      toast.error("Please fill all required fields");
      return;
    }
    setSubmitting(true);
    try {
      const submissionMessage = form.message.trim() || 
        `Company: ${form.company || 'N/A'}\nExperience: ${form.experience || 'N/A'}\nCity/Territory: ${form.city}\nInterested in becoming a distributor for RIJITA.`;
        
      await contentApi.submitContact({
        ...form,
        message: submissionMessage,
        subject: `Distributorship Inquiry - ${form.city}`,
        type: "distributor",
      });
      toast.success("Application submitted! We'll contact you within 48 hours.");
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
            <Users size={16} />
            Join Our Network
          </div>
          <h1 className="text-4xl md:text-6xl font-display font-black text-ink mb-4 tracking-tight">
            Become a <span className="font-serif italic font-medium text-gold-600">Distributor</span>
          </h1>
          <p className="text-ink-2 max-w-3xl mx-auto text-lg [text-wrap:pretty]">
            Partner with RIJITA by Arya Foods and bring the authentic taste of India to your city.
            Join our growing family of distributors across India.
          </p>
        </motion.div>

        {/* Network Proof */}
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16"
        >
          {[
            { icon: Shield, title: "Protected Territory", desc: "Exclusive rights for your region" },
            { icon: MapPin, title: "Pan-India Reach", desc: "Serving cities across the country" },
            { icon: Users, title: "Growing Network", desc: "Join a trusted partner family" },
            { icon: Target, title: "Retailer Support", desc: "Tools to win shelf space" },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="bg-paper-2 rounded-2xl p-6 border border-rule text-center card-hover">
                <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-brand-600/10 flex items-center justify-center">
                  <Icon size={24} className="text-brand-700" />
                </div>
                <p className="font-display font-bold text-ink">{item.title}</p>
                <p className="text-sm text-ink-2 mt-2">{item.desc}</p>
              </div>
            );
          })}
        </motion.div>

        {/* Benefits */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <h2 className="text-3xl font-display font-black text-ink text-center mb-8">Why Partner With Us?</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {benefits.map((benefit, i) => {
              const Icon = benefit.icon;
              return (
                <motion.div
                  key={benefit.title}
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
          </div>
        </motion.div>

        {/* Requirements */}
        <motion.div
          className="bg-paper-2 rounded-2xl p-8 md:p-12 border border-rule mb-16"
        >
          <h2 className="text-3xl font-display font-black text-ink text-center mb-8">Requirements</h2>
          <div className="grid sm:grid-cols-2 gap-4 max-w-3xl mx-auto">
            {requirements.map((req) => (
              <div key={req} className="flex items-start gap-4">
                <CheckCircle size={18} className="text-brand-600 mt-0 flex-shrink-0" />
                <span className="text-sm text-ink-2">{req}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Process */}
        <motion.div
          className="mb-16"
        >
          <h2 className="text-3xl font-display font-black text-ink text-center mb-8">
            How It <span className="font-serif italic font-medium text-gold-600">Works</span>
          </h2>
          <div className="grid sm:grid-cols-3 lg:grid-cols-5 gap-6">
            {process.map((step) => (
              <div key={step.step} className="text-center">
                <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-brand-600 text-white flex items-center justify-center text-xl font-bold font-display">
                  {step.step}
                </div>
                <h4 className="font-semibold text-sm text-ink mb-2">{step.title}</h4>
                <p className="text-xs text-ink-3">{step.desc}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Application Form */}
        <motion.div
          className="max-w-2xl mx-auto"
        >
          {submitted ? (
            <div className="bg-brand-600/5 border border-brand-600/20 rounded-2xl p-8 md:p-12 text-center">
              <CheckCircle size={48} className="mx-auto mb-4 text-brand-600" />
              <h3 className="text-2xl font-display font-bold text-ink mb-2">Application submitted.</h3>
              <p className="text-ink-2 mb-6">Our distribution team will review your application and contact you within 48 hours.</p>
              <Button onClick={() => setSubmitted(false)} variant="outline">Submit Another</Button>
            </div>
          ) : (
            <div className="bg-paper-2 rounded-2xl p-8 border border-rule">
              <h3 className="text-2xl font-display font-bold text-ink mb-2">Apply to Become a Distributor</h3>
              <p className="text-ink-2 mb-6">Fill in your details and our team will get back to you.</p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="dist-name" className="block text-sm font-medium text-ink-2 mb-2">Full Name *</label>
                    <input id="dist-name" type="text" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} className="w-full h-12 px-4 rounded-xl border border-rule bg-paper focus:outline-none focus:ring-2 focus:ring-[var(--color-focus)] text-sm" placeholder="Your name" />
                  </div>
                  <div>
                    <label htmlFor="dist-email" className="block text-sm font-medium text-ink-2 mb-2">Email *</label>
                    <input id="dist-email" type="email" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} className="w-full h-12 px-4 rounded-xl border border-rule bg-paper focus:outline-none focus:ring-2 focus:ring-[var(--color-focus)] text-sm" placeholder="your@email.com" />
                  </div>
                  <div>
                    <label htmlFor="dist-phone" className="block text-sm font-medium text-ink-2 mb-2">Phone *</label>
                    <input id="dist-phone" type="tel" value={form.phone} onChange={(e) => setForm({...form, phone: e.target.value})} className="w-full h-12 px-4 rounded-xl border border-rule bg-paper focus:outline-none focus:ring-2 focus:ring-[var(--color-focus)] text-sm" placeholder="+91 98765 43210" />
                  </div>
                  <div>
                    <label htmlFor="dist-city" className="block text-sm font-medium text-ink-2 mb-2">City *</label>
                    <input id="dist-city" type="text" value={form.city} onChange={(e) => setForm({...form, city: e.target.value})} className="w-full h-12 px-4 rounded-xl border border-rule bg-paper focus:outline-none focus:ring-2 focus:ring-[var(--color-focus)] text-sm" placeholder="Your city" />
                  </div>
                  <div>
                    <label htmlFor="dist-company" className="block text-sm font-medium text-ink-2 mb-2">Company / Business Name</label>
                    <input id="dist-company" type="text" value={form.company} onChange={(e) => setForm({...form, company: e.target.value})} className="w-full h-12 px-4 rounded-xl border border-rule bg-paper focus:outline-none focus:ring-2 focus:ring-[var(--color-focus)] text-sm" placeholder="Business name" />
                  </div>
                  <div>
                    <label htmlFor="dist-exp" className="block text-sm font-medium text-ink-2 mb-2">Years of Experience</label>
                    <input id="dist-exp" type="text" value={form.experience} onChange={(e) => setForm({...form, experience: e.target.value})} className="w-full h-12 px-4 rounded-xl border border-rule bg-paper focus:outline-none focus:ring-2 focus:ring-[var(--color-focus)] text-sm" placeholder="e.g. 3 years" />
                  </div>
                </div>
                <div>
                  <label htmlFor="dist-message" className="block text-sm font-medium text-ink-2 mb-2">Why do you want to distribute our products?</label>
                  <textarea id="dist-message" value={form.message} onChange={(e) => setForm({...form, message: e.target.value})} rows={3} className="w-full px-4 py-3 rounded-xl border border-rule bg-paper focus:outline-none focus:ring-2 focus:ring-[var(--color-focus)] text-sm resize-none" placeholder="Tell us about yourself and your interest..." />
                </div>
                <Button type="submit" disabled={submitting} size="lg" className="w-full">
                  {submitting ? "Submitting..." : <><Send size={16} className="mr-2" /> Submit Application</>}
                </Button>
              </form>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
