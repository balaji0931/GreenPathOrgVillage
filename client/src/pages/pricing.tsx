import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Leaf, 
  Calculator, 
  CheckCircle, 
  Phone,
  IndianRupee,
  Calendar,
  Percent,
  Info,
  Sparkles,
  Crown,
  ArrowRight,
  LogIn,
  Home,
} from "lucide-react";
import { Link } from "wouter";

const PRICE_PER_HOUSEHOLD = 4;
const MINIMUM_BILLING = 500;


interface PricingProps {
  onContactClick?: () => void;
  isStandalone?: boolean;
}

export default function Pricing(props: PricingProps = {}) {
  const { onContactClick, isStandalone = true } = props;
  const [households, setHouseholds] = useState<number>(100);
  const [billingCycle, setBillingCycle] = useState<string>("quarterly");
  const [showResults, setShowResults] = useState(false);
  const [calculatorOpen, setCalculatorOpen] = useState(false);

  const calculatePricing = () => {
    const monthlyBase = households * PRICE_PER_HOUSEHOLD;
    const monthlyAmount = Math.max(monthlyBase, MINIMUM_BILLING);
    const isMinimumApplied = monthlyBase < MINIMUM_BILLING;

    let months = 3;
    let discountPercent = 0;

    if (billingCycle === "halfyearly") {
      months = 6;
      discountPercent = 5;
    } else if (billingCycle === "yearly") {
      months = 12;
      discountPercent = 10;
    }

    const totalBeforeDiscount = monthlyAmount * months;
    const discountAmount = (totalBeforeDiscount * discountPercent) / 100;
    const totalAfterDiscount = totalBeforeDiscount - discountAmount;
    const effectivePerHousehold = households > 0 ? totalAfterDiscount / months / households : 0;

    return {
      monthlyAmount,
      isMinimumApplied,
      months,
      discountPercent,
      totalBeforeDiscount,
      discountAmount,
      totalAfterDiscount,
      effectivePerHousehold,
    };
  };

  const handleCalculate = () => {
    setShowResults(true);
  };

  const pricing = calculatePricing();

  const handleContactClick = () => {
    if (onContactClick) {
      onContactClick();
    } else {
      window.location.href = "/contact";
    }
  };

  const plans = [
    {
      name: "Quarterly Plan",
      duration: "3 Months",
      icon: <Calendar className="w-8 h-8" />,
      color: "from-emerald-400 to-green-500",
      bgColor: "bg-emerald-50",
      borderColor: "border-emerald-200",
      textColor: "text-emerald-600",
      features: [
        "All features included",
        "Billed once every 3 months",
        "₹4 per household per month",
        "Minimum billing applies",
        "Ideal for organizations starting with GreenPath",
      ],
      badge: null,
    },
    {
      name: "Half-Yearly Plan",
      duration: "6 Months",
      icon: <Sparkles className="w-8 h-8" />,
      color: "from-blue-400 to-indigo-500",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200",
      textColor: "text-blue-600",
      features: [
        "All features included",
        "Billed once every 6 months",
        "Includes 5% discount on total",
        "Minimum billing applies",
        "Designed for organizations planning long-term operations",
      ],
      badge: "5% OFF",
      badgeColor: "bg-blue-500",
    },
    {
      name: "Yearly Plan",
      duration: "12 Months",
      icon: <Crown className="w-8 h-8" />,
      color: "from-purple-400 to-pink-500",
      bgColor: "bg-purple-50",
      borderColor: "border-purple-200",
      textColor: "text-purple-600",
      features: [
        "All features included",
        "Billed once every 12 months",
        "Includes 10% discount on total",
        "Minimum billing applies",
        "Best value for large-scale deployments",
      ],
      badge: "BEST VALUE 10% OFF",
      badgeColor: "bg-purple-500",
    },
  ];

  const content = (
    <div className="min-h-screen">
      {/* Hero Section */}
      {/* <div className="relative py-5 sm:py-20 px-4 sm:px-6 text-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 via-green-500 to-teal-600">
          <div className="absolute inset-0 bg-black/20"></div>
          <div className="absolute top-10 left-10 w-48 sm:w-72 h-48 sm:h-72 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-10 right-10 w-64 sm:w-96 h-64 sm:h-96 bg-white/5 rounded-full blur-3xl animate-pulse delay-1000"></div>
        </div>

        <div className="relative z-10 max-w-4xl mx-auto">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-white/20 rounded-full blur-xl animate-pulse"></div>
              <div className="relative bg-white/90 backdrop-blur-sm p-4 rounded-full shadow-2xl">
                <IndianRupee className="w-10 h-10 sm:w-12 sm:h-12 text-green-600" />
              </div>
            </div>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 leading-tight">
            GreenPath Pricing
          </h1>
          <p className="text-lg sm:text-xl text-green-100 max-w-2xl mx-auto">
            Simple, transparent pricing based on the number of households you manage.
          </p>
        </div>
      </div> */}

      {/* Pricing Plans */}
      <div className="py-8 sm:py-12 px-4 sm:px-6 bg-gradient-to-r from-gray-50 to-slate-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-4xl lg:text-5xl font-bold mb-3 bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
              GreenPath Pricing Plans
            </h2>
            <p className="text-gray-600 text-md sm:text-lg">Select the billing cycle that works best for you</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 sm:gap-8">
            {plans.map((plan, index) => (
              <Card 
                key={index} 
                className={`relative group border-2 ${plan.borderColor} shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 overflow-hidden`}
              >
                {plan.badge && (
                  <div className={`absolute top-4 right-4 ${plan.badgeColor} text-white text-xs font-bold px-3 py-1 rounded-full`}>
                    {plan.badge}
                  </div>
                )}
                <div className={`absolute inset-0 bg-gradient-to-br ${plan.color} opacity-5 group-hover:opacity-10 transition-opacity`}></div>
                <CardHeader className="relative z-10 pb-4">
                  <div className={`bg-gradient-to-br ${plan.color} w-16 h-16 rounded-2xl flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                    <div className="text-white">{plan.icon}</div>
                  </div>
                  <CardTitle className="text-xl sm:text-2xl font-bold text-gray-800">
                    {plan.name}
                  </CardTitle>
                  <p className={`text-lg font-semibold ${plan.textColor}`}>{plan.duration}</p>
                </CardHeader>
                <CardContent className="relative z-10 space-y-4">
                  <ul className="space-y-3">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <CheckCircle className={`w-5 h-5 ${plan.textColor} flex-shrink-0 mt-0.5`} />
                        <span className="text-gray-600 text-sm sm:text-base">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button 
                    onClick={handleContactClick}
                    className={`w-full bg-gradient-to-r ${plan.color} hover:opacity-90 text-white font-semibold py-3 rounded-xl shadow-lg transform hover:scale-105 transition-all duration-300`}
                    data-testid={`button-contact-${plan.name.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <Phone className="w-4 h-4 mr-2" />
                    Contact Us
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Calculator Section */}
      <div className="py-8 sm:py-12 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center">
          <Dialog open={calculatorOpen} onOpenChange={setCalculatorOpen}>
            <DialogTrigger asChild>
              <Button 
                size="lg"
                className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold px-8 py-4 text-lg rounded-full shadow-xl transform hover:scale-105 transition-all duration-300"
                data-testid="button-calculate-cost"
              >
                <Calculator className="w-5 h-5 mr-2" />
                Calculate Your Cost
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle className="text-xl sm:text-2xl font-bold text-gray-800 flex items-center gap-3">
                  <Calculator className="w-6 h-6 text-green-600" />
                  Calculate Your Pricing
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-6 py-4">
                <p className="text-gray-600">
                  Enter the number of households and choose a billing cycle to estimate your cost.
                </p>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="households" className="text-gray-700 font-medium">
                      Number of Households
                    </Label>
                    <Input
                      id="households"
                      type="number"
                      min="1"
                      value={households}
                      onChange={(e) => {
                        setHouseholds(parseInt(e.target.value) || 0);
                        setShowResults(false);
                      }}
                      className="border-gray-300 focus:border-green-500 focus:ring-green-500"
                      data-testid="input-households"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-700 font-medium">Select Billing Cycle</Label>
                    <Select 
                      value={billingCycle} 
                      onValueChange={(value) => {
                        setBillingCycle(value);
                        setShowResults(false);
                      }}
                    >
                      <SelectTrigger className="border-gray-300" data-testid="select-billing-cycle">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="quarterly">Quarterly (3 months)</SelectItem>
                        <SelectItem value="halfyearly">Half-Yearly (6 months, 5% off)</SelectItem>
                        <SelectItem value="yearly">Yearly (12 months, 10% off)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button 
                    onClick={handleCalculate}
                    className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold py-3 rounded-xl"
                    data-testid="button-calculate"
                  >
                    <Calculator className="w-4 h-4 mr-2" />
                    Calculate
                  </Button>
                </div>

                {showResults && households > 0 && (
                  <div className="space-y-4 pt-4 border-t border-gray-200">
                    {/* Monthly Estimate */}
                    <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
                      <h4 className="font-semibold text-green-800 mb-2 flex items-center gap-2">
                        <CheckCircle className="w-5 h-5" />
                        Monthly Estimate
                      </h4>
                      <p className="text-2xl font-bold text-green-600">
                        ₹{pricing.monthlyAmount.toLocaleString()}/month
                      </p>
                      {pricing.isMinimumApplied && (
                        <p className="text-sm text-yellow-700 mt-2 bg-yellow-50 p-2 rounded">
                          Minimum billing of ₹500 per month applies.
                        </p>
                      )}
                    </div>

                    {/* Plan Cost */}
                    <div className={`p-4 rounded-xl ${
                      billingCycle === "quarterly" 
                        ? "bg-emerald-50 border border-emerald-200" 
                        : billingCycle === "halfyearly" 
                          ? "bg-blue-50 border border-blue-200" 
                          : "bg-purple-50 border border-purple-200"
                    }`}>
                      <h4 className={`font-semibold mb-2 flex items-center gap-2 ${
                        billingCycle === "quarterly" 
                          ? "text-emerald-800" 
                          : billingCycle === "halfyearly" 
                            ? "text-blue-800" 
                            : "text-purple-800"
                      }`}>
                        <CheckCircle className="w-5 h-5" />
                        {billingCycle === "quarterly" ? "Quarterly" : billingCycle === "halfyearly" ? "Half-Yearly" : "Yearly"} Plan Cost
                      </h4>

                      {billingCycle === "quarterly" ? (
                        <>
                          <p className="text-2xl font-bold text-emerald-600">
                            ₹{pricing.totalAfterDiscount.toLocaleString()}
                          </p>
                          <p className="text-sm text-gray-600 mt-2">
                            Total cost for 3 months
                          </p>
                          <p className="text-sm text-gray-500 mt-1 italic">
                            Quarterly plan does not include any discount.
                          </p>
                        </>
                      ) : billingCycle === "halfyearly" ? (
                        <>
                          <p className="text-gray-600 line-through text-lg">
                            ₹{pricing.totalBeforeDiscount.toLocaleString()}
                          </p>
                          <p className="text-2xl font-bold text-blue-600">
                            ₹{pricing.totalAfterDiscount.toLocaleString()}
                          </p>
                          <p className="text-sm text-gray-600 mt-2">
                            Total after 5% discount for 6 months
                          </p>
                          <p className="text-sm text-green-600 font-medium mt-1">
                            You save 5% by choosing the half-yearly plan.
                          </p>
                          <p className="text-sm text-gray-500 mt-1">
                            Effective cost: ₹{pricing.effectivePerHousehold.toFixed(2)} per household per month
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="text-gray-600 line-through text-lg">
                            ₹{pricing.totalBeforeDiscount.toLocaleString()}
                          </p>
                          <p className="text-2xl font-bold text-purple-600">
                            ₹{pricing.totalAfterDiscount.toLocaleString()}
                          </p>
                          <p className="text-sm text-gray-600 mt-2">
                            Total after 10% discount for 12 months
                          </p>
                          <p className="text-sm text-green-600 font-medium mt-1">
                            You save 10% by choosing the yearly plan.
                          </p>
                          <p className="text-sm text-gray-500 mt-1">
                            Effective cost: ₹{pricing.effectivePerHousehold.toFixed(2)} per household per month
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

            {/* Pricing Model Card */}
      <div className="py-8 sm:py-12 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <Card className="border-2 border-green-200 shadow-xl bg-gradient-to-br from-green-50 to-emerald-50">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl sm:text-2xl font-bold text-green-800 flex items-center gap-3">
                <Leaf className="w-6 h-6 sm:w-8 sm:h-8 text-green-600" />
                GreenPath Pricing Model
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-3 bg-white rounded-lg shadow-sm">
                  <IndianRupee className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <span className="text-gray-700 font-medium">₹4 per household per month</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-white rounded-lg shadow-sm">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <span className="text-gray-700 font-medium">Minimum billing: ₹500 per month before discount</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-white rounded-lg shadow-sm">
                  <Calendar className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <span className="text-gray-700 font-medium">Billed only for 3, 6, or 12 months</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-white rounded-lg shadow-sm">
                  <Percent className="w-5 h-5 text-blue-600 flex-shrink-0" />
                  <span className="text-gray-700 font-medium">5% discount on half-yearly plans</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-white rounded-lg shadow-sm">
                  <Percent className="w-5 h-5 text-purple-600 flex-shrink-0" />
                  <span className="text-gray-700 font-medium">10% discount on yearly plans</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-white rounded-lg shadow-sm">
                  <Sparkles className="w-5 h-5 text-yellow-500 flex-shrink-0" />
                  <span className="text-gray-700 font-medium">All features included during early access</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Contact CTA */}
      <div className="py-12 sm:py-16 px-4 sm:px-6 bg-gradient-to-r from-green-500 to-emerald-600">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-green-100 text-lg mb-8 max-w-2xl mx-auto">
            Contact our team to discuss your requirements and get a customized quote for your organization.
          </p>
          <Button 
            onClick={handleContactClick}
            size="lg"
            className="bg-white text-green-600 hover:bg-green-50 font-semibold px-8 py-4 text-lg rounded-full shadow-xl transform hover:scale-105 transition-all duration-300"
            data-testid="button-contact-us-cta"
          >
            <Phone className="w-5 h-5 mr-2" />
            Contact Us to Get Started
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </div>

      {/* Additional Information */}
      <div className="py-8 sm:py-12 px-4 sm:px-6 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <Card className="border border-gray-200 bg-white/80 shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold text-gray-700 flex items-center gap-2">
                <Info className="w-5 h-5 text-gray-500" />
                Additional Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-gray-600">
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span>Pricing depends only on the number of households.</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span>All features are included during early access.</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span>Advanced features may become part of future premium plans.</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span>Organizations will be contacted directly after submitting details.</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );

  if (!isStandalone) {
    return content;
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation Bar */}
      <nav className="bg-white/95 backdrop-blur-md shadow-lg border-b border-green-100 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 sm:h-20">
            <Link href="/">
              <div className="relative cursor-pointer">
                <div className="p-2">
                  <img src="/logos/logo-full.svg" alt="GreenPath" className="w-auto sm:h-12 h-10" />
                </div>
              </div>
            </Link>

            <div className="flex items-center gap-3">
              <Link href="/">
                <Button 
                  variant="outline"
                  size="sm"
                  className="border-green-500 text-green-600 hover:bg-green-50 font-semibold px-2 sm:px-6 py-2 sm:py-3 rounded-xl sm:rounded-full"
                >
                  <Home className="w-4 h-4" />
                  <span className="hidden sm:inline" >Home</span>
                </Button>
              </Link>
              <Button 
                onClick={() => window.location.href = "/login"}
                size="sm"
                className="bg-gradient-to-r from-green-500 to-green-800 hover:from-blue-600 hover:to-purple-700 text-white font-semibold px-4 sm:px-6 py-2 sm:py-3 rounded-full shadow-lg transform hover:scale-105 transition-all duration-300"
              >
                <LogIn className="w-4 h-4 mr-1 sm:mr-2" />
                <span>Login</span>
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto">
        {content}
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex justify-center items-center gap-2 mb-4">
              <div className="p-2 rounded-lg">
                <img src="/logos/logo-dark.svg" alt="GreenPath" className="w-auto h-9" />
              </div>
            </div>
            <p className="text-gray-400 mb-4">
              Empowering Clean Villages through Smart Waste Management
            </p>
            <p className="text-sm text-gray-500">
              © 2025 GreenPath. All rights reserved.
            </p>
            <div className="flex flex-wrap justify-center gap-4 text-xs pt-3">
              <a href="/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-green-600 transition-colors underline">
                Privacy Policy
              </a>
              <a href="/terms-of-service" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-green-600 transition-colors underline">
                Terms of Service
              </a>
              <a href="/data-protection" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-green-600 transition-colors underline">
                Data Protection
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
