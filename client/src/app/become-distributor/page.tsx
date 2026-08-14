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
    <div className="min-h-screen pt-36 sm:pt-40 lg:pt-44 pb-16 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Hero */}
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-brand-100 rounded-full text-brand-700 text-sm font-medium mb-4">
            <Users size={16} />
            Join Our Network
          </div>
          <h1 className="text-4xl md:text-6xl font-display font-bold mb-4">
            Become a <span className="text-brand-600">Distributor</span>
          </h1>
          <p className="text-muted-foreground max-w-3xl mx-auto text-lg">
            Partner with RIJITA by Arya Foods and bring the authentic taste of India to your city.
            Join our growing family of distributors across India.
          </p>
        </motion.div>

        {/* Stats */}
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16"
        >
          {[
            { value: "50+", label: "Distributors" },
            { value: "100+", label: "Cities Covered" },
            { value: "500+", label: "Retail Stores" },
            { value: "95%", label: "Retention Rate" },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-2xl p-6 border text-center">
              <p className="text-3xl font-bold text-brand-500 font-display">{stat.value}</p>
              <p className="text-sm text-muted-foreground mt-2">{stat.label}</p>
            </div>
          ))}
        </motion.div>

        {/* Benefits */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <h2 className="text-3xl font-display font-bold text-center mb-8">Why Partner With Us?</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {benefits.map((benefit, i) => {
              const Icon = benefit.icon;
              return (
                <motion.div
                  key={benefit.title}
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
          </div>
        </motion.div>

        {/* Requirements */}
        <motion.div
          className="bg-cream rounded-2xl p-8 md:p-12 border mb-16"
        >
          <h2 className="text-3xl font-display font-bold text-center mb-8">Requirements</h2>
          <div className="grid sm:grid-cols-2 gap-4 max-w-3xl mx-auto">
            {requirements.map((req) => (
              <div key={req} className="flex items-start gap-4">
                <CheckCircle size={18} className="text-green-500 mt-0 flex-shrink-0" />
                <span className="text-sm">{req}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Process */}
        <motion.div
          className="mb-16"
        >
          <h2 className="text-3xl font-display font-bold text-center mb-8">Process</h2>
          <div className="grid sm:grid-cols-3 lg:grid-cols-5 gap-6">
            {process.map((step) => (
              <div key={step.step} className="text-center">
                <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-brand-500 text-white flex items-center justify-center text-xl font-bold font-display">
                  {step.step}
                </div>
                <h4 className="font-semibold text-sm mb-2">{step.title}</h4>
                <p className="text-xs text-muted-foreground">{step.desc}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Application Form */}
        <motion.div
          className="max-w-2xl mx-auto"
        >
          {submitted ? (
            <div className="bg-green-50 border border-green-200 rounded-2xl p-8 md:p-12 text-center">
              <CheckCircle size={48} className="mx-auto mb-4 text-green-500" />
              <h3 className="text-2xl font-display font-bold text-green-800 mb-2">Application Submitted!</h3>
              <p className="text-green-700/80 mb-6">Our distribution team will review your application and contact you within 48 hours.</p>
              <Button onClick={() => setSubmitted(false)} variant="outline">Submit Another</Button>
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-8 border">
              <h3 className="text-2xl font-display font-bold mb-2">Apply to Become a Distributor</h3>
              <p className="text-muted-foreground mb-6">Fill in your details and our team will get back to you.</p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Full Name *</label>
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
                    <label className="block text-sm font-medium mb-2">City *</label>
                    <input type="text" value={form.city} onChange={(e) => setForm({...form, city: e.target.value})} className="w-full px-4 py-2 rounded-xl border bg-background focus:outline-none focus:ring-2 focus:ring-brand-500/50 text-sm" placeholder="Your city" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Company / Business Name</label>
                    <input type="text" value={form.company} onChange={(e) => setForm({...form, company: e.target.value})} className="w-full px-4 py-2 rounded-xl border bg-background focus:outline-none focus:ring-2 focus:ring-brand-500/50 text-sm" placeholder="Business name" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Years of Experience</label>
                    <input type="text" value={form.experience} onChange={(e) => setForm({...form, experience: e.target.value})} className="w-full px-4 py-2 rounded-xl border bg-background focus:outline-none focus:ring-2 focus:ring-brand-500/50 text-sm" placeholder="e.g. 3 years" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Why do you want to distribute our products?</label>
                  <textarea value={form.message} onChange={(e) => setForm({...form, message: e.target.value})} rows={3} className="w-full px-4 py-2 rounded-xl border bg-background focus:outline-none focus:ring-2 focus:ring-brand-500/50 text-sm resize-none" placeholder="Tell us about yourself and your interest..." />
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
