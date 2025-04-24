import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { 
  Check, 
  ArrowRight, 
  BeakerIcon,
  Shield,
  Zap,
  Users
} from "lucide-react";

export default function PricingPage() {
  const plans = [
    {
      name: "Starter",
      price: "$49",
      period: "per month",
      description: "Perfect for small businesses with basic product management needs",
      icon: <Zap className="h-5 w-5 text-primary-600" />,
      features: [
        "Up to 1,000 products",
        "Basic AI processing",
        "Standard support",
        "API access",
        "Basic analytics"
      ],
      cta: "Start Free Trial",
      variant: "secondary"
    },
    {
      name: "Professional",
      price: "$149",
      period: "per month",
      description: "Ideal for growing businesses with advanced data needs",
      icon: <Shield className="h-5 w-5 text-primary-600" />,
      features: [
        "Up to 10,000 products",
        "Advanced AI processing",
        "Priority support",
        "API access",
        "Advanced analytics",
        "Custom integrations"
      ],
      cta: "Start Free Trial",
      popular: true,
      variant: "primary"
    },
    {
      name: "Enterprise",
      price: "Custom",
      period: "per month",
      description: "Tailored solutions for large organizations",
      icon: <Users className="h-5 w-5 text-primary-600" />,
      features: [
        "Unlimited products",
        "Custom AI models",
        "24/7 support",
        "Dedicated account manager",
        "Custom integrations",
        "SLA guarantee"
      ],
      cta: "Contact Sales",
      variant: "outline"
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <header className="border-b border-enterprise-100">
        <nav className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <BeakerIcon className="h-6 w-6 text-primary-600 mr-2" />
              <span className="text-xl font-bold text-enterprise-900">KernLogic</span>
            </div>
            <div className="flex items-center space-x-6">
              <Link to="/marketing" className="text-enterprise-600 hover:text-primary-600 text-sm font-medium">Home</Link>
              <Link to="/marketing/product" className="text-enterprise-600 hover:text-primary-600 text-sm font-medium">Product</Link>
              <Link to="/login" className="text-enterprise-600 hover:text-primary-600 text-sm font-medium">Login</Link>
              <Button
                variant="primary"
                asChild
              >
                <Link to="/register">Get Started</Link>
              </Button>
            </div>
          </div>
        </nav>
      </header>

      {/* Pricing Section */}
      <section className="py-20 bg-gradient-to-b from-enterprise-50 to-white">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16 max-w-3xl mx-auto">
            <div className="inline-block px-3 py-1 rounded-full bg-primary-50 text-primary-700 text-xs font-medium tracking-wide mb-4">
              FLEXIBLE PRICING
            </div>
            <h1 className="text-4xl font-bold text-enterprise-900 mb-4">Simple, Transparent Pricing</h1>
            <p className="text-lg text-enterprise-600">Choose the plan that's right for your business needs and scale as you grow</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-xl p-8 bg-white border transition-all ${
                  plan.popular
                    ? "border-2 border-primary-400 shadow-lg relative"
                    : "border-enterprise-200 hover:border-primary-200 hover:shadow-md"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-primary-600 text-white text-xs font-semibold px-4 py-1 rounded-full">
                    Most Popular
                  </div>
                )}
                
                <div className="flex items-center mb-4">
                  <div className="rounded-full bg-primary-50 p-2 mr-3">
                    {plan.icon}
                  </div>
                  <h3 className="text-xl font-bold text-enterprise-900">{plan.name}</h3>
                </div>
                
                <p className="text-enterprise-600 text-sm mb-6">{plan.description}</p>
                
                <div className="mb-6">
                  <span className="text-4xl font-bold text-enterprise-900">{plan.price}</span>
                  <span className="text-enterprise-500 ml-1">{plan.period}</span>
                </div>
                
                <div className="border-t border-b border-enterprise-100 py-6 mb-6">
                  <p className="text-sm font-medium text-enterprise-700 mb-4">Features include:</p>
                  <ul className="space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start">
                        <Check className="h-4 w-4 text-success-500 mt-0.5 mr-3 flex-shrink-0" />
                        <span className="text-sm text-enterprise-600">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                <Button
                  variant={plan.popular ? "primary" : plan.name === "Enterprise" ? "secondary" : "outline"}
                  fullWidth={true}
                  asChild
                >
                  <Link to={plan.name === "Enterprise" ? "/contact" : "/register"}>
                    {plan.cta}
                    <ArrowRight />
                  </Link>
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>
      
      {/* FAQ Section */}
      <section className="py-16 bg-white border-t border-enterprise-100">
        <div className="container mx-auto px-6">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-enterprise-900 mb-10 text-center">Frequently Asked Questions</h2>
            
            <div className="space-y-6">
              <div className="bg-enterprise-50 rounded-lg p-6">
                <h3 className="text-lg font-medium text-enterprise-900 mb-2">Can I change plans later?</h3>
                <p className="text-enterprise-600">Yes, you can upgrade or downgrade your plan at any time. Changes will be applied to your next billing cycle.</p>
              </div>
              
              <div className="bg-enterprise-50 rounded-lg p-6">
                <h3 className="text-lg font-medium text-enterprise-900 mb-2">How does the free trial work?</h3>
                <p className="text-enterprise-600">Our 14-day free trial gives you full access to the platform features without requiring a credit card. You can upgrade to a paid plan at any time.</p>
              </div>
              
              <div className="bg-enterprise-50 rounded-lg p-6">
                <h3 className="text-lg font-medium text-enterprise-900 mb-2">What payment methods do you accept?</h3>
                <p className="text-enterprise-600">We accept all major credit cards, including Visa, Mastercard, and American Express. For Enterprise plans, we also offer invoicing.</p>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* CTA Section */}
      <section className="py-16 bg-enterprise-50 border-y border-enterprise-200">
        <div className="container mx-auto px-6">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-enterprise-900 mb-4">Ready to get started?</h2>
            <p className="text-enterprise-600 mb-8">
              Try KernLogic free for 14 days. No credit card required.
            </p>
            <Button 
              variant="primary"
              size="lg"
              asChild
            >
              <Link to="/register">
                Start Free Trial
                <ArrowRight />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
} 