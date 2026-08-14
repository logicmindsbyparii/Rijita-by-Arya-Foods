import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Privacy Policy for RIJITA by Arya Foods. Learn how we collect, use, and protect your personal information.",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen pt-36 sm:pt-40 lg:pt-44 pb-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-10">
          <p className="text-sm text-brand-600 font-medium mb-2">Last Updated: January 2026</p>
          <h1 className="text-4xl md:text-5xl font-display font-bold mb-4">Privacy Policy</h1>
          <p className="text-muted-foreground text-lg">
            At RIJITA by Arya Foods, we take your privacy seriously. This policy describes how we collect, use, and protect your personal information.
          </p>
        </div>

        <div className="prose prose-stone max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-display font-bold mb-4">1. Information We Collect</h2>
            <p className="text-muted-foreground leading-relaxed">
              We collect information you provide directly to us, including:
            </p>
            <ul className="text-muted-foreground space-y-2 mt-4">
              <li><strong>Personal Information:</strong> Name, email address, phone number, shipping address, and payment information when you place an order.</li>
              <li><strong>Account Information:</strong> If you create an account, we store your profile details, order history, wishlist, and preferences.</li>
              <li><strong>Communication:</strong> Records of your interactions with us via WhatsApp, email, or contact forms.</li>
              <li><strong>Usage Data:</strong> Information about how you use our website, including pages visited, products viewed, and search queries.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-display font-bold mb-4">2. How We Use Your Information</h2>
            <p className="text-muted-foreground leading-relaxed">We use your information to:</p>
            <ul className="text-muted-foreground space-y-2 mt-4">
              <li>Process and fulfill your orders, including sending order confirmations via WhatsApp</li>
              <li>Communicate with you about your orders, inquiries, and requests</li>
              <li>Send you promotional offers and newsletters (with your consent)</li>
              <li>Improve our website, products, and services</li>
              <li>Comply with legal obligations and prevent fraud</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-display font-bold mb-4">3. Information Sharing</h2>
            <p className="text-muted-foreground leading-relaxed">
              We do not sell, trade, or rent your personal information to third parties. We may share your information with:
            </p>
            <ul className="text-muted-foreground space-y-2 mt-4">
              <li><strong>Delivery Partners:</strong> To fulfill your orders, we share your name, phone number, and shipping address with our delivery partners.</li>
              <li><strong>Service Providers:</strong> Third-party vendors who assist us with website hosting, analytics, and communication services.</li>
              <li><strong>Legal Requirements:</strong> When required by law or to protect our rights and safety.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-display font-bold mb-4">4. Data Security</h2>
            <p className="text-muted-foreground leading-relaxed">
              We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the internet is 100% secure.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-display font-bold mb-4">5. Your Rights</h2>
            <p className="text-muted-foreground leading-relaxed">You have the right to:</p>
            <ul className="text-muted-foreground space-y-2 mt-4">
              <li>Access your personal information held by us</li>
              <li>Request correction of inaccurate information</li>
              <li>Request deletion of your information</li>
              <li>Withdraw consent for marketing communications</li>
              <li>Lodge a complaint with relevant authorities</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-display font-bold mb-4">6. Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have questions about this Privacy Policy or how we handle your data, please contact us:
            </p>
            <div className="mt-4 p-4 bg-cream rounded-2xl border">
              <p className="text-sm"><strong>Email:</strong> privacy@rijita.com</p>
              <p className="text-sm mt-2"><strong>Phone:</strong> +91 98765 43210</p>
              <p className="text-sm mt-2"><strong>Address:</strong> Pal, Surat, Gujarat, India</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
