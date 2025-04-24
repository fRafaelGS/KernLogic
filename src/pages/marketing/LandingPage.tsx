import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { 
  ArrowRight, 
  Database, 
  LineChart, 
  ShieldCheck, 
  Zap,
  CheckCircle2,
  BeakerIcon, 
} from "lucide-react";

export default function LandingPage() {
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
              <Link to="/marketing/product" className="text-enterprise-600 hover:text-primary-600 text-sm font-medium">Product</Link>
              <Link to="/marketing/pricing" className="text-enterprise-600 hover:text-primary-600 text-sm font-medium">Pricing</Link>
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

      {/* Hero Section */}
      <section className="py-20 bg-gradient-to-b from-enterprise-50 to-white border-b border-enterprise-100">
        <div className="container mx-auto px-6">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-10">
              <div className="inline-block px-3 py-1 rounded-full bg-primary-50 text-primary-700 text-xs font-medium tracking-wide mb-4">
                ENTERPRISE-READY SOLUTION
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-enterprise-900 mb-6 leading-tight">
                Transform Your Product Data Management with AI
              </h1>
              <p className="text-lg text-enterprise-600 mb-8 max-w-2xl mx-auto">
                Streamline your B2B product data operations with our advanced platform. 
                Ensure consistency, reduce errors, and make better business decisions.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
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
                <Button 
                  variant="outline"
                  size="lg" 
                  asChild
                >
                  <Link to="/marketing/product">
                    Learn More
                  </Link>
                </Button>
              </div>
            </div>
            
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16 bg-white rounded-xl shadow-sm border border-enterprise-200 p-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-enterprise-900">10,000+</p>
                <p className="text-sm text-enterprise-600">Products Managed</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-enterprise-900">98%</p>
                <p className="text-sm text-enterprise-600">Data Accuracy</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-enterprise-900">45%</p>
                <p className="text-sm text-enterprise-600">Time Saved</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-enterprise-900 mb-4">Why Choose KernLogic?</h2>
            <p className="text-lg text-enterprise-600 max-w-2xl mx-auto">
              Our platform provides the tools you need to streamline your product data management
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-xl border border-enterprise-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="rounded-full bg-primary-50 p-3 w-12 h-12 flex items-center justify-center mb-4">
                <Zap className="h-5 w-5 text-primary-600" />
              </div>
              <h3 className="text-xl font-semibold text-enterprise-900 mb-3">AI-Powered Processing</h3>
              <p className="text-enterprise-600">Leverage advanced AI to automatically process and validate your product data.</p>
              <ul className="mt-4 space-y-2">
                <li className="flex items-center">
                  <CheckCircle2 className="h-4 w-4 text-success-500 mr-2" />
                  <span className="text-sm text-enterprise-600">Automated data validation</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle2 className="h-4 w-4 text-success-500 mr-2" />
                  <span className="text-sm text-enterprise-600">Smart categorization</span>
                </li>
              </ul>
            </div>
            
            <div className="bg-white p-6 rounded-xl border border-enterprise-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="rounded-full bg-primary-50 p-3 w-12 h-12 flex items-center justify-center mb-4">
                <Database className="h-5 w-5 text-primary-600" />
              </div>
              <h3 className="text-xl font-semibold text-enterprise-900 mb-3">Data Consistency</h3>
              <p className="text-enterprise-600">Ensure your product data is consistent across all channels and platforms.</p>
              <ul className="mt-4 space-y-2">
                <li className="flex items-center">
                  <CheckCircle2 className="h-4 w-4 text-success-500 mr-2" />
                  <span className="text-sm text-enterprise-600">Cross-channel verification</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle2 className="h-4 w-4 text-success-500 mr-2" />
                  <span className="text-sm text-enterprise-600">Data integrity checks</span>
                </li>
              </ul>
            </div>
            
            <div className="bg-white p-6 rounded-xl border border-enterprise-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="rounded-full bg-primary-50 p-3 w-12 h-12 flex items-center justify-center mb-4">
                <LineChart className="h-5 w-5 text-primary-600" />
              </div>
              <h3 className="text-xl font-semibold text-enterprise-900 mb-3">Real-time Analytics</h3>
              <p className="text-enterprise-600">Get insights into your product data performance with real-time analytics.</p>
              <ul className="mt-4 space-y-2">
                <li className="flex items-center">
                  <CheckCircle2 className="h-4 w-4 text-success-500 mr-2" />
                  <span className="text-sm text-enterprise-600">Customizable dashboards</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle2 className="h-4 w-4 text-success-500 mr-2" />
                  <span className="text-sm text-enterprise-600">Actionable insights</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>
      
      {/* CTA Section */}
      <section className="py-16 bg-enterprise-50 border-y border-enterprise-200">
        <div className="container mx-auto px-6">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-enterprise-900 mb-4">Ready to transform your product data?</h2>
            <p className="text-enterprise-600 mb-8">
              Join thousands of companies that trust KernLogic for their product data management
            </p>
            <Button 
              variant="primary"
              size="lg" 
              asChild
            >
              <Link to="/register">
                Start Free 14-Day Trial
                <ArrowRight />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
} 