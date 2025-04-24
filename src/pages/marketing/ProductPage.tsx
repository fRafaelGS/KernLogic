import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export default function ProductPage() {
  const features = [
    {
      title: "AI-Powered Data Processing",
      description: "Our advanced AI algorithms automatically process and validate your product data, reducing manual work and errors.",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      )
    },
    {
      title: "Data Consistency",
      description: "Ensure your product data is consistent across all channels and platforms with our validation system.",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    {
      title: "Real-time Analytics",
      description: "Get insights into your product data performance with real-time analytics and reporting.",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      )
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
            <Link to="/marketing/pricing" className="text-gray-600 hover:text-gray-900">Pricing</Link>
            <Link to="/login" className="text-gray-600 hover:text-gray-900">Login</Link>
            <Button asChild>
              <Link to="/register">Get Started</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Powerful Product Data Management</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Transform your B2B product data management with our AI-powered platform. 
            Streamline your workflow and make better business decisions.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
          {features.map((feature) => (
            <div key={feature.title} className="bg-white p-8 rounded-lg shadow-sm">
              <div className="text-blue-500 mb-4">{feature.icon}</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">{feature.title}</h3>
              <p className="text-gray-600">{feature.description}</p>
            </div>
          ))}
        </div>

        {/* CTA Section */}
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Ready to Get Started?</h2>
          <p className="text-xl text-gray-600 mb-8">
            Join thousands of businesses using KernLogic to manage their product data.
          </p>
          <Button size="lg" asChild>
            <Link to="/register">Start Free Trial</Link>
          </Button>
        </div>
      </section>
    </div>
  );
} 