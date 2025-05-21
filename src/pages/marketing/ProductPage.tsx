import { Button } from "@/domains/core/components/ui/button";
import { Link } from "react-router-dom";
import { 
  BeakerIcon, 
  ArrowRight, 
  Database, 
  LineChart, 
  ShieldCheck, 
  Zap,
  CheckCircle2,
  ArrowUpRight,
  LucideSettings
} from "lucide-react";
import { ROUTES } from "@/config/routes";

export default function ProductPage() {
  const features = [
    {
      title: "AI-Powered Data Processing",
      description: "Our advanced AI algorithms automatically process and validate your product data, reducing manual work and errors.",
      icon: <Zap className="h-5 w-5 text-primary-600" />
    },
    {
      title: "Data Consistency",
      description: "Ensure your product data is consistent across all channels and platforms with our validation system.",
      icon: <ShieldCheck className="h-5 w-5 text-primary-600" />
    },
    {
      title: "Real-time Analytics",
      description: "Get insights into your product data performance with real-time analytics and reporting.",
      icon: <LineChart className="h-5 w-5 text-primary-600" />
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
              <Link to={ROUTES.MARKETING.HOME} className="text-enterprise-600 hover:text-primary-600 text-sm font-medium">Home</Link>
              <Link to={ROUTES.MARKETING.PRICING} className="text-enterprise-600 hover:text-primary-600 text-sm font-medium">Pricing</Link>
              <Link to={ROUTES.AUTH.LOGIN} className="text-enterprise-600 hover:text-primary-600 text-sm font-medium">Login</Link>
              <Button
                variant="primary"
                asChild
              >
                <Link to={ROUTES.AUTH.REGISTER}>Get Started</Link>
              </Button>
            </div>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="py-20 bg-gradient-to-b from-enterprise-50 to-white border-b border-enterprise-100">
        <div className="container mx-auto px-6">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-block px-3 py-1 rounded-full bg-primary-50 text-primary-700 text-xs font-medium tracking-wide mb-4">
              POWERFUL FEATURES
            </div>
            <h1 className="text-4xl font-bold text-enterprise-900 mb-6">
              Transform Your Product Data Management
            </h1>
            <p className="text-lg text-enterprise-600 mb-8 max-w-2xl mx-auto">
              Our enterprise-grade platform provides all the tools you need to maintain, validate, and leverage your product data efficiently.
            </p>
            <Button 
              variant="primary"
              size="lg" 
              asChild
            >
              <Link to={ROUTES.AUTH.REGISTER}>
                Start Free Trial
                <ArrowRight />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-enterprise-900 mb-4">Key Platform Features</h2>
              <p className="text-lg text-enterprise-600 max-w-2xl mx-auto">
                Everything you need to streamline your product data workflow
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
              {features.map((feature) => (
                <div key={feature.title} className="bg-white p-6 rounded-xl border border-enterprise-200 shadow-sm hover:shadow-md transition-shadow">
                  <div className="rounded-full bg-primary-50 p-3 w-12 h-12 flex items-center justify-center mb-4">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-semibold text-enterprise-900 mb-3">{feature.title}</h3>
                  <p className="text-enterprise-600 mb-4">{feature.description}</p>
                  <Link to={ROUTES.MARKETING.PRODUCT} className="inline-flex items-center text-primary-600 hover:text-primary-700 text-sm font-medium">
                    Learn more
                    <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
      
      {/* Platform Benefits */}
      <section className="py-20 bg-enterprise-50 border-y border-enterprise-100">
        <div className="container mx-auto px-6">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-enterprise-900 mb-4">Why Choose Our Platform</h2>
              <p className="text-lg text-enterprise-600 max-w-2xl mx-auto">
                KernLogic helps you optimize your entire product data workflow
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div>
                <div className="mb-8">
                  <div className="flex items-start">
                    <div className="rounded-full bg-success-50 p-2 mt-1 mr-4">
                      <CheckCircle2 className="h-4 w-4 text-success-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-enterprise-900 mb-2">Reduce Manual Work</h3>
                      <p className="text-enterprise-600">
                        Automate tedious tasks like data validation, categorization, and consistency checks. Save valuable time and resources.
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="mb-8">
                  <div className="flex items-start">
                    <div className="rounded-full bg-success-50 p-2 mt-1 mr-4">
                      <CheckCircle2 className="h-4 w-4 text-success-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-enterprise-900 mb-2">Eliminate Errors</h3>
                      <p className="text-enterprise-600">
                        Our AI-powered validation ensures your product data is accurate and consistent across all channels.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div>
                <div className="mb-8">
                  <div className="flex items-start">
                    <div className="rounded-full bg-success-50 p-2 mt-1 mr-4">
                      <CheckCircle2 className="h-4 w-4 text-success-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-enterprise-900 mb-2">Centralized Management</h3>
                      <p className="text-enterprise-600">
                        Keep all your product data in one secure location, accessible to your entire team.
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="mb-8">
                  <div className="flex items-start">
                    <div className="rounded-full bg-success-50 p-2 mt-1 mr-4">
                      <CheckCircle2 className="h-4 w-4 text-success-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-enterprise-900 mb-2">Data-Driven Decisions</h3>
                      <p className="text-enterprise-600">
                        Make better business decisions with real-time insights and analytics about your product data.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto bg-primary-600 rounded-xl p-10 text-center text-white">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">Ready to transform your product data?</h2>
            <p className="text-primary-100 mb-8 max-w-2xl mx-auto">
              Join thousands of businesses using KernLogic to streamline their product data management.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                variant="secondary"
                size="lg" 
                asChild
              >
                <Link to={ROUTES.AUTH.REGISTER}>
                  Start Free Trial
                  <ArrowRight />
                </Link>
              </Button>
              <Button 
                variant="ghost"
                size="lg" 
                className="text-white hover:text-white hover:bg-primary-700"
                asChild
              >
                <Link to={ROUTES.MARKETING.PRICING}>
                  View Pricing
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
} 