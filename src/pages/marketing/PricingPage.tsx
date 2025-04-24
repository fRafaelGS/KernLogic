import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export default function PricingPage() {
  const plans = [
    {
      name: "Starter",
      price: "$49",
      period: "per month",
      features: [
        "Up to 1,000 products",
        "Basic AI processing",
        "Standard support",
        "API access",
        "Basic analytics"
      ],
      cta: "Start Free Trial"
    },
    {
      name: "Professional",
      price: "$149",
      period: "per month",
      features: [
        "Up to 10,000 products",
        "Advanced AI processing",
        "Priority support",
        "API access",
        "Advanced analytics",
        "Custom integrations"
      ],
      cta: "Start Free Trial",
      popular: true
    },
    {
      name: "Enterprise",
      price: "Custom",
      period: "per month",
      features: [
        "Unlimited products",
        "Custom AI models",
        "24/7 support",
        "Dedicated account manager",
        "Custom integrations",
        "SLA guarantee"
      ],
      cta: "Contact Sales"
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="text-2xl font-bold text-gray-900">KernLogic</div>
          <div className="flex items-center space-x-4">
            <Link to="/marketing" className="text-gray-600 hover:text-gray-900">Home</Link>
            <Link to="/marketing/product" className="text-gray-600 hover:text-gray-900">Product</Link>
            <Link to="/login" className="text-gray-600 hover:text-gray-900">Login</Link>
            <Button asChild>
              <Link to="/register">Get Started</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Pricing Section */}
      <section className="container mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Simple, Transparent Pricing</h1>
          <p className="text-xl text-gray-600">Choose the plan that's right for your business</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-lg p-8 ${
                plan.popular
                  ? "bg-white border-2 border-blue-500 shadow-lg"
                  : "bg-white border border-gray-200"
              }`}
            >
              {plan.popular && (
                <div className="bg-blue-500 text-white text-sm font-semibold px-4 py-1 rounded-full inline-block mb-4">
                  Most Popular
                </div>
              )}
              <h3 className="text-2xl font-bold text-gray-900 mb-4">{plan.name}</h3>
              <div className="mb-6">
                <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                <span className="text-gray-600">/{plan.period}</span>
              </div>
              <ul className="space-y-4 mb-8">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center text-gray-600">
                    <svg
                      className="w-5 h-5 mr-2 text-green-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>
              <Button
                className={`w-full ${
                  plan.popular ? "bg-blue-500 hover:bg-blue-600" : "bg-gray-900 hover:bg-gray-800"
                }`}
                asChild
              >
                <Link to={plan.name === "Enterprise" ? "/contact" : "/register"}>
                  {plan.cta}
                </Link>
              </Button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
} 