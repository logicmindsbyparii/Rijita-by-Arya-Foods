import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description: "Terms and Conditions for RIJITA by Arya Foods. Read the terms governing the use of our website and services.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen pt-32 sm:pt-40 lg:pt-48 xl:pt-[200px] pb-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-10">
          <p className="text-sm text-brand-600 font-medium mb-2">Last Updated: January 2026</p>
          <h1 className="text-4xl md:text-5xl font-display font-bold mb-4">Terms & Conditions</h1>
          <p className="text-muted-foreground text-lg">
            Please read these terms and conditions carefully before using our website or placing an order with RIJITA by Arya Foods.
          </p>
        </div>

        <div className="prose prose-stone max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-display font-bold mb-4">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              By accessing and using this website, you agree to be bound by these Terms and Conditions. If you do not agree with any part of these terms, you should not use our website or services.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-display font-bold mb-4">2. Products & Pricing</h2>
            <ul className="text-muted-foreground space-y-2 mt-4">
              <li>All product prices are listed in Indian Rupees (INR) and are inclusive of applicable taxes unless stated otherwise.</li>
              <li>We reserve the right to modify prices without prior notice. However, the price at the time of order confirmation will be honored.</li>
              <li>Product images are for illustration purposes. Actual products may vary slightly.</li>
              <li>We strive to ensure all product descriptions are accurate, but we do not guarantee that descriptions are error-free.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-display font-bold mb-4">3. Orders</h2>
            <ul className="text-muted-foreground space-y-2 mt-4">
              <li>All orders are subject to availability and acceptance.</li>
              <li>We reserve the right to refuse or cancel any order at our discretion.</li>
              <li>In the event of a product being unavailable, we will inform you and offer a substitute or full refund.</li>
              <li>Order confirmation will be sent via WhatsApp within 24 hours of placement.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-display font-bold mb-4">4. Payment Terms</h2>
            <ul className="text-muted-foreground space-y-2 mt-4">
              <li>Currently, we accept orders primarily through WhatsApp with payments via UPI, bank transfer, or cash on delivery (COD).</li>
              <li>Full payment is required before order dispatch, except for COD orders.</li>
              <li>COD may have a nominal convenience fee applied.</li>
              <li>All payments are processed securely. We do not store your payment information.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-display font-bold mb-4">5. Shipping & Delivery</h2>
            <ul className="text-muted-foreground space-y-2 mt-4">
              <li>We ship across India. Delivery times vary by location, typically 2-5 business days.</li>
              <li>Free shipping is available on orders above ₹499. Standard delivery charges of ₹49 apply for orders below this threshold.</li>
              <li>Risk of loss and title for products pass to you upon delivery.</li>
              <li>We are not responsible for delays caused by unforeseen circumstances or courier partners.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-display font-bold mb-4">6. Intellectual Property</h2>
            <p className="text-muted-foreground leading-relaxed">
              All content on this website, including text, images, logos, and product designs, is the property of RIJITA by Arya Foods and is protected by applicable intellectual property laws. You may not reproduce, distribute, or use our content without prior written permission.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-display font-bold mb-4">7. User Accounts</h2>
            <ul className="text-muted-foreground space-y-2 mt-4">
              <li>You are responsible for maintaining the confidentiality of your account credentials.</li>
              <li>You must provide accurate and complete information when creating an account.</li>
              <li>We reserve the right to suspend or terminate accounts for violation of these terms.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-display font-bold mb-4">8. Limitation of Liability</h2>
            <p className="text-muted-foreground leading-relaxed">
              RIJITA by Arya Foods shall not be liable for any indirect, incidental, or consequential damages arising from the use of our products or website. Our total liability shall not exceed the amount paid by you for the products in question.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-display font-bold mb-4">9. Governing Law</h2>
            <p className="text-muted-foreground leading-relaxed">
              These terms shall be governed by and construed in accordance with the laws of India. Any disputes arising shall be subject to the exclusive jurisdiction of the courts in Surat, Gujarat.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-display font-bold mb-4">10. Contact</h2>
            <div className="p-4 bg-cream rounded-2xl border">
              <p className="text-sm"><strong>Email:</strong> legal@rijita.com</p>
              <p className="text-sm mt-2"><strong>WhatsApp:</strong> +91 98765 43210</p>
              <p className="text-sm mt-2"><strong>Address:</strong> Pal, Surat, Gujarat, India</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
