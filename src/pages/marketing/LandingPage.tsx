import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Navigation */}
      <nav className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="text-2xl font-bold text-gray-900">KernLogic</div>
          <div className="flex items-center space-x-4">
            <Link to="/marketing/product" className="text-gray-600 hover:text-gray-900">Product</Link>
            <Link to="/marketing/pricing" className="text-gray-600 hover:text-gray-900">Pricing</Link>
            <Link to="/login" className="text-gray-600 hover:text-gray-900">Login</Link>
            <Link to="/app/products" className="text-blue-600 hover:text-blue-800 font-bold">Products (Direct)</Link>
            <Button asChild>
              <Link to="/register">Get Started</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-6 py-20">
        <div className="flex flex-col items-center text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Transform Your Product Data with AI
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl">
            Streamline your B2B product data management with our AI-powered platform. 
            Automate data processing, ensure consistency, and make better business decisions.
          </p>
          <div className="flex space-x-4">
            <Button size="lg" asChild>
              <Link to="/register">Start Free Trial</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/marketing/product">Learn More</Link>
            </Button>
            <Button size="lg" variant="secondary" asChild>
              <Link to="/app/products">Go to Products (Bypass Login)</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-white py-20">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-12">Why Choose KernLogic?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 rounded-lg bg-gray-50">
              <h3 className="text-xl font-semibold mb-4">AI-Powered Processing</h3>
              <p className="text-gray-600">Leverage advanced AI to automatically process and validate your product data.</p>
            </div>
            <div className="p-6 rounded-lg bg-gray-50">
              <h3 className="text-xl font-semibold mb-4">Data Consistency</h3>
              <p className="text-gray-600">Ensure your product data is consistent across all channels and platforms.</p>
            </div>
            <div className="p-6 rounded-lg bg-gray-50">
              <h3 className="text-xl font-semibold mb-4">Real-time Analytics</h3>
              <p className="text-gray-600">Get insights into your product data performance with real-time analytics.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
} 