import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Refund & Return Policy",
  description: "Refund and Return Policy for RIJITA by Arya Foods. Learn about our return process, eligibility, and refund timeline.",
};

export default function RefundPolicyPage() {
  return (
    <div className="min-h-screen pt-32 sm:pt-40 lg:pt-48 xl:pt-[200px] pb-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-10">
          <p className="text-sm text-brand-600 font-medium mb-2">Last Updated: January 2026</p>
          <h1 className="text-4xl md:text-5xl font-display font-bold mb-4">Refund & Return Policy</h1>
          <p className="text-muted-foreground text-lg">
            We take pride in our products and want you to be completely satisfied with your purchase. Please read our return and refund policy carefully.
          </p>
        </div>

        <div className="prose prose-stone max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-display font-bold mb-4">1. Eligibility for Returns</h2>
            <p className="text-muted-foreground leading-relaxed">
              You may request a return or replacement within 24 hours of receiving your order if:
            </p>
            <ul className="text-muted-foreground space-y-2 mt-4">
              <li>The product is damaged or defective</li>
              <li>You received an incorrect product or variant</li>
              <li>The product is past its expiry date</li>
              <li>The packaging is significantly damaged, affecting product quality</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-display font-bold mb-4">2. Non-Returnable Items</h2>
            <p className="text-muted-foreground leading-relaxed">
              We cannot accept returns for the following reasons:
            </p>
            <ul className="text-muted-foreground space-y-2 mt-4">
              <li>Product is consumed or opened</li>
              <li>Change of mind after the 24-hour window</li>
              <li>Damage caused by improper storage after delivery</li>
              <li>Products purchased more than 24 hours ago</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-display font-bold mb-4">3. Return Process</h2>
            <p className="text-muted-foreground leading-relaxed">To initiate a return:</p>
            <ol className="text-muted-foreground space-y-4 mt-4 list-decimal pl-4">
              <li>Contact us on <strong>WhatsApp at +91 98765 43210</strong> within 24 hours of delivery</li>
              <li>Provide your order number and photos of the issue</li>
              <li>Our team will review your request within 24 hours</li>
              <li>If approved, we will arrange for pickup or provide a replacement</li>
            </ol>
          </section>

          <section>
            <h2 className="text-2xl font-display font-bold mb-4">4. Refund Timeline</h2>
            <p className="text-muted-foreground leading-relaxed">
              Once your return is approved and received:
            </p>
            <ul className="text-muted-foreground space-y-2 mt-4">
              <li><strong>Replacement:</strong> Dispatched within 2-3 business days</li>
              <li><strong>Refund:</strong> Processed within 5-7 business days to your original payment method</li>
              <li><strong>Store Credit:</strong> Credited within 2 business days</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-display font-bold mb-4">5. Cancellation Policy</h2>
            <p className="text-muted-foreground leading-relaxed">
              Orders can be cancelled within 2 hours of placement. To cancel, please message us on WhatsApp with your order number. Orders already dispatched cannot be cancelled.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-display font-bold mb-4">6. Quality Guarantee</h2>
            <p className="text-muted-foreground leading-relaxed">
              We stand behind the quality of our products. If you&apos;re unsatisfied with the taste or quality for any reason, please reach out to us. We value your feedback and will work with you to find a satisfactory resolution.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-display font-bold mb-4">7. Contact for Returns</h2>
            <div className="p-4 bg-cream rounded-2xl border">
              <p className="text-sm"><strong>WhatsApp:</strong> +91 98765 43210</p>
              <p className="text-sm mt-2"><strong>Email:</strong> support@rijita.com</p>
              <p className="text-sm mt-2"><strong>Response Time:</strong> Within 24 hours</p>
            </div>
          </section>
        </div>

        <div className="mt-10 p-6 bg-brand-50 rounded-2xl border border-brand-100">
          <p className="text-sm text-brand-800">
            <strong>Need to initiate a return?</strong>{" "}
            <Link href="/contact" className="text-brand-600 underline hover:text-brand-700">
              Contact us
            </Link>{" "}
            or message us directly on WhatsApp.
          </p>
        </div>
      </div>
    </div>
  );
}
