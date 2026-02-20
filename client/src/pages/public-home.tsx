import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import Pricing from "@/pages/pricing";
import { useLocation } from "wouter";
import {
  Recycle,
  Users,
  Target,
  CheckCircle,
  Phone,
  Mail,
  MapPin,
  Heart,
  Star,
  UserCheck,
  Settings,
  Trash2,
  ClipboardList,
  Send,
  Award,
  TrendingUp,
  Shield,
  Zap,
  Globe,
  ArrowRight,
  Quote,
  LogIn,
  Menu,
  Home,
  BarChart,
  WifiOff,
} from "lucide-react";

// Add CSS for animations
const styles = `
  @keyframes float {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-20px); }
  }
  @keyframes pulse-glow {
    0%, 100% { box-shadow: 0 0 20px rgba(34, 197, 94, 0.5); }
    50% { box-shadow: 0 0 40px rgba(34, 197, 94, 0.8); }
  }
  .animate-float {
    animation: float 6s ease-in-out infinite;
  }
  .animate-pulse-glow {
    animation: pulse-glow 2s ease-in-out infinite;
  }
  @media (max-width: 640px) {
    .animate-float {
      animation-duration: 4s;
    }
  }
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement("style");
  styleSheet.innerText = styles;
  document.head.appendChild(styleSheet);
}

interface PublicHomeProps {
  initialSection?: string;
}

// Learning videos used in the Video Tutorials section
const learningVideos = [
  { id: 1, youtubeId: "dQw4w9WgXcQ", title: "Introduction to Waste Segregation", category: "Basics", duration: "5:30", description: "Learn the fundamentals of separating wet, dry, and hazardous waste." },
  { id: 2, youtubeId: "dQw4w9WgXcQ", title: "How to Use GreenPath App", category: "Tutorial", duration: "4:15", description: "Step-by-step walkthrough of all GreenPath features for households." },
  { id: 3, youtubeId: "dQw4w9WgXcQ", title: "Composting at Home", category: "Composting", duration: "7:00", description: "Turn your kitchen and garden waste into rich compost for your plants." },
  { id: 4, youtubeId: "dQw4w9WgXcQ", title: "Dry Waste Management", category: "Dry Waste", duration: "6:20", description: "Properly handle plastics, paper, glass, and metals for recycling." },
  { id: 5, youtubeId: "dQw4w9WgXcQ", title: "Community Collection Tips", category: "Community", duration: "5:45", description: "Best practices for households during community waste collection drives." },
  { id: 6, youtubeId: "dQw4w9WgXcQ", title: "Understanding Reports", category: "Reports", duration: "3:50", description: "How to read and use village-level waste management data and reports." },
];

export default function PublicHome({ initialSection = "home" }: PublicHomeProps = {}) {
  const [activeSection, setActiveSection] = useState(initialSection);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const navigateToSection = (sectionId: string) => {
    if (sectionId === "home") {
      setLocation("/");
    } else if (sectionId === "pricing") {
      setLocation("/pricing");
    } else {
      setLocation(`/${sectionId}`);
    }
    setActiveSection(sectionId);
  };

  // Navigation sections
  const sections = [
    { id: "home", label: "Home", icon: <Home className="w-4 h-4" /> },
    { id: "about", label: "About Us", icon: <Users className="w-4 h-4" /> },
    // { id: "learn", label: "Learn", icon: <ClipboardList className="w-4 h-4" /> },
    { id: "feedback", label: "Feedback", icon: <Star className="w-4 h-4" /> },
    { id: "contact", label: "Contact Us", icon: <Phone className="w-4 h-4" /> },
    { id: "pricing", label: "Pricing", icon: <TrendingUp className="w-4 h-4" /> },
  ];

  // User roles data
  const userRoles = [
    {
      title: "Moderator",
      icon: <UserCheck className="w-8 h-8" />,
      description: "Supervises multiple locations and ensures proper waste management implementation across regions and organizations.",
      responsibilities: ["Monitor location performance", "Support managers", "Quality assurance", "View reports"]
    },
    {
      title: "Manager",
      icon: <Settings className="w-8 h-8" />,
      description: "Location coordinator who manages households/units, collectors, and waste collection operations in villages, societies, apartments, or organizations.",
      responsibilities: ["Coordinate collections", "Manage households/units", "Oversee collectors", "Generate reports"]
    },
    {
      title: "Collector",
      icon: <Trash2 className="w-8 h-8" />,
      description: "Field workers who collect waste from households, apartments, or office units and provide feedback on segregation quality.",
      responsibilities: ["Collect waste", "Rate segregation", "Provide feedback", "Update collection status"]
    },
    {
      title: "Generator",
      icon: <Recycle className="w-8 h-8" />,
      description: "End users (households, apartment residents, office employees) who segregate waste and manage their waste generation.",
      responsibilities: ["Segregate waste", "Follow schedule", "Report issues", "Pay monthly fees"]
    }
  ];

  // Features data
  const features = [
    {
      title: "QR Code System",
      description: "Unique QR codes for each household enabling quick identification and collection tracking",
      icon: <ClipboardList className="w-6 h-6" />
    },
    {
      title: "Real-time Tracking",
      description: "Monitor waste collection status, segregation ratings, and collection schedules in real-time",
      icon: <Target className="w-6 h-6" />
    },
    {
      title: "Offline Data Collection",
      description: "Collectors can record data offline and sync automatically when internet is available",
      icon: <WifiOff className="w-6 h-6" />
    },
    {
      title: "Issue Reporting",
      description: "Report and track waste management issues with photo evidence and status updates",
      icon: <Star className="w-6 h-6" />
    },
    {
      title: "Performance Analytics",
      description: "Comprehensive dashboards showing collection trends, ratings, and village performance",
      icon: <Users className="w-6 h-6" />
    },
    {
      title: "Multi-role Access",
      description: "Role-based access for moderators, managers, collectors, and households",
      icon: <UserCheck className="w-6 h-6" />
    }
  ];

  // Learning videos data
  // const learningVideos = [
  //   {
  //     id: 1,
  //     title: "Getting Started with GreenPath",
  //     description: "Learn how to create an account, login, and navigate the GreenPath platform for the first time.",
  //     youtubeId: "dQw4w9WgXcQ", // Replace with actual YouTube video ID
  //     category: "Application Usage",
  //     duration: "5:30"
  //   },
  //   {
  //     id: 2,
  //     title: "Installing GreenPath Mobile App",
  //     description: "Step-by-step guide to install the GreenPath mobile application on your smartphone and set up notifications.",
  //     youtubeId: "dQw4w9WgXcQ", // Replace with actual YouTube video ID
  //     category: "Installation",
  //     duration: "3:45"
  //   },
  //   {
  //     id: 3,
  //     title: "Dashboard Overview for All Users",
  //     description: "Comprehensive tour of the dashboard features available for generators, collectors, managers, and moderators.",
  //     youtubeId: "dQw4w9WgXcQ", // Replace with actual YouTube video ID
  //     category: "Dashboard Guide",
  //     duration: "8:20"
  //   },
  //   {
  //     id: 4,
  //     title: "Proper Waste Segregation Techniques",
  //     description: "Learn the correct methods for separating wet waste, dry waste, and hazardous materials for effective recycling.",
  //     youtubeId: "dQw4w9WgXcQ", // Replace with actual YouTube video ID
  //     category: "Waste Management",
  //     duration: "6:15"
  //   },
  //   {
  //     id: 5,
  //     title: "QR Code Scanning for Collections",
  //     description: "How collectors can use the QR code scanner to efficiently track and record waste collections from households.",
  //     youtubeId: "dQw4w9WgXcQ", // Replace with actual YouTube video ID
  //     category: "Collection Process",
  //     duration: "4:30"
  //   },
  //   {
  //     id: 6,
  //     title: "Payment Management System",
  //     description: "Understanding how to manage monthly payments, view payment history, and handle payment-related issues.",
  //     youtubeId: "dQw4w9WgXcQ", // Replace with actual YouTube video ID
  //     category: "Payment System",
  //     duration: "7:10"
  //   },
  //   {
  //     id: 7,
  //     title: "Reporting Issues and Feedback",
  //     description: "Learn how to report waste management issues, submit feedback, and track the resolution status.",
  //     youtubeId: "dQw4w9WgXcQ", // Replace with actual YouTube video ID
  //     category: "Issue Management",
  //     duration: "5:00"
  //   },
  //   {
  //     id: 8,
  //     title: "Best Practices for Village Cleanliness",
  //     description: "Community guidelines and best practices for maintaining cleanliness and effective waste management in villages.",
  //     youtubeId: "dQw4w9WgXcQ", // Replace with actual YouTube video ID
  //     category: "Best Practices",
  //     duration: "9:45"
  //   }
  // ];

  // Feedback form mutation
  const feedbackMutation = useMutation({
    mutationFn: async (data: {
      name: string;
      email: string;
      feedbackType: string;
      message: string;
    }) => {
      const response = await fetch('/api/website-feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to submit feedback');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Feedback Submitted",
        description: "Thank you for your feedback! We'll review it soon.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit feedback",
        variant: "destructive",
      });
    },
  });

  // Contact form mutation
  const contactMutation = useMutation({
    mutationFn: async (data: {
      name: string;
      email: string;
      phone?: string;
      subject: string;
      message: string;
    }) => {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to send message');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Message Sent",
        description: "Thank you for contacting us! We'll respond within 24 hours.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send message",
        variant: "destructive",
      });
    },
  });

  const handleFeedbackSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    feedbackMutation.mutate({
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      feedbackType: formData.get('feedbackType') as string,
      message: formData.get('message') as string,
    });
    e.currentTarget.reset();
  };

  const handleContactSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    contactMutation.mutate({
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      phone: formData.get('phone') as string,
      subject: formData.get('subject') as string,
      message: formData.get('message') as string,
    });
    e.currentTarget.reset();
  };

  const renderHomeSection = () => (
    <div className="min-h-screen">
      {/* Hero Section with Animated Background */}
      <div className="relative py-12 sm:py-20 px-4 sm:px-6 text-center overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 via-green-500 to-teal-600">
          <div className="absolute inset-0 bg-black/20"></div>
          <div className="absolute top-10 left-10 w-48 sm:w-72 h-48 sm:h-72 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-10 right-10 w-64 sm:w-96 h-64 sm:h-96 bg-white/5 rounded-full blur-3xl animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] sm:w-[800px] h-[400px] sm:h-[600px] bg-gradient-to-r from-transparent via-white/5 to-transparent rounded-full blur-3xl animate-spin" style={{ animationDuration: '20s' }}></div>
        </div>

        {/* Hero Content */}
        <div className="relative z-10 max-w-6xl mx-auto">
          <div className="flex justify-center mb-6 sm:mb-8">
            <div className="relative">
              <div className="absolute inset-0 bg-white/20 rounded-full blur-xl animate-pulse"></div>
              <div className="relative bg-white/90 backdrop-blur-sm p-4 sm:p-6 rounded-full shadow-2xl">
                <img src="/logos/logo.svg" alt="GreenPath" className="w-12 h-12 sm:w-16 sm:h-16 animate-bounce" />
              </div>
            </div>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-4 sm:mb-6 leading-tight">
            <span className="bg-gradient-to-r from-white to-green-100 bg-clip-text text-transparent">
              GreenPath
            </span>
          </h1>

          <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl text-green-100 mb-6 sm:mb-8 font-light px-4">
            🌱 Transforming Communities Through Smart Waste Management
          </p>

          <p className="text-base sm:text-lg text-white/90 max-w-4xl mx-auto mb-8 sm:mb-12 leading-relaxed px-4">
            Join the revolution in sustainable living. Our cutting-edge platform connects communities,
            streamlines waste collection, and creates cleaner, healthier environments for villages, organizations, societies, apartments, and more.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center px-4">
            <Button
              onClick={() => navigateToSection("contact")}
              size="lg"
              className="w-full sm:w-auto bg-white text-green-600 hover:bg-green-50 font-semibold px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg rounded-full shadow-2xl transform hover:scale-105 transition-all duration-300"
            >
              <Zap className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
              Get Started Now
              <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 ml-2" />
            </Button>
            <Button
              onClick={() => navigateToSection("about")}
              variant="outline"
              size="lg"
              className="w-full sm:w-auto border-white/50 text-black hover:bg-white/10 hover:text-white font-semibold px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg rounded-full backdrop-blur-sm"
            >
              Learn More
            </Button>
          </div>
        </div>

        {/* Floating particles effect */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(10)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 bg-white/30 rounded-full animate-float"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 5}s`,
                animationDuration: `${3 + Math.random() * 4}s`
              }}
            ></div>
          ))}
        </div>
      </div>

      {/* Features Section - Modern Grid */}
      <div className="py-12 sm:py-20 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
              Powerful Features
            </h2>
            <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto px-4">
              Everything you need to transform your village's waste management system
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="group h-full border-0 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 bg-gradient-to-br from-white to-gray-50">
                <CardHeader className="pb-4">
                  <div className="flex items-start sm:items-center gap-3 sm:gap-4">
                    <div className="bg-gradient-to-br from-green-400 to-green-600 p-3 sm:p-4 rounded-xl sm:rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
                      <div className="text-white">
                        {feature.icon}
                      </div>
                    </div>
                    <CardTitle className="text-lg sm:text-xl font-bold text-gray-800 group-hover:text-green-600 transition-colors leading-tight">
                      {feature.title}
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm sm:text-base text-gray-600 leading-relaxed">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* User Roles Section - Modern Design */}
      <div className="py-12 sm:py-20 px-4 sm:px-6 bg-gradient-to-r from-blue-50 to-purple-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              User Roles & Responsibilities
            </h2>
            <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto px-4">
              Discover how each role contributes to creating cleaner, smarter villages
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 sm:gap-8">
            {userRoles.map((role, index) => {
              const colors = [
                { bg: "from-emerald-400 to-teal-500", accent: "bg-emerald-100 text-emerald-600" },
                { bg: "from-blue-400 to-indigo-500", accent: "bg-blue-100 text-blue-600" },
                { bg: "from-purple-400 to-pink-500", accent: "bg-purple-100 text-purple-600" },
                { bg: "from-orange-400 to-red-500", accent: "bg-orange-100 text-orange-600" }
              ];
              const color = colors[index % colors.length];

              return (
                <Card key={index} className="group relative overflow-hidden border-0 shadow-xl hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-3">
                  <div className={`absolute inset-0 bg-gradient-to-br ${color.bg} opacity-5 group-hover:opacity-10 transition-opacity`}></div>
                  <CardHeader className="relative z-10 pb-4">
                    <div className="flex items-start sm:items-center gap-3 sm:gap-4 mb-4">
                      <div className={`bg-gradient-to-br ${color.bg} p-3 sm:p-4 rounded-xl sm:rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-300 flex-shrink-0`}>
                        <div className="text-white">
                          {role.icon}
                        </div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-xl sm:text-2xl font-bold text-gray-800 group-hover:text-blue-600 transition-colors">
                          {role.title}
                        </CardTitle>
                        <div className={`inline-block px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium mt-2 ${color.accent}`}>
                          Essential Role
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="relative z-10 space-y-4 sm:space-y-6">
                    <p className="text-base sm:text-lg text-gray-700 leading-relaxed">{role.description}</p>
                    <div>
                      <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2 text-sm sm:text-base">
                        <Star className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500 flex-shrink-0" />
                        Key Responsibilities
                      </h4>
                      <div className="grid gap-2 sm:gap-3">
                        {role.responsibilities.map((resp, idx) => (
                          <div key={idx} className="flex items-start gap-3 p-2 sm:p-3 bg-white/50 rounded-lg border-l-4 border-green-400 hover:bg-white/80 transition-colors">
                            <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 flex-shrink-0 mt-0.5" />
                            <span className="text-sm sm:text-base text-gray-700 font-medium">{resp}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>

      {/* How It Works Section - Interactive Process Flow */}
      <div className="py-12 sm:py-20 px-4 sm:px-6 bg-gradient-to-r from-indigo-50 to-cyan-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <div className="inline-flex items-center gap-3 bg-white/80 backdrop-blur-sm px-4 sm:px-6 py-3 rounded-full shadow-lg mb-6">
              <ClipboardList className="w-6 sm:w-8 h-6 sm:h-8 text-indigo-600" />
              <span className="text-xl sm:text-2xl font-bold text-gray-800">How It Works</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 bg-gradient-to-r from-indigo-600 to-cyan-600 bg-clip-text text-transparent">
              Complete Waste Management Process
            </h2>
            <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto">
              Follow our streamlined 4-step process for efficient waste management in your community, organization, or residential complex
            </p>
          </div>

          {/* Interactive Process Steps */}
          <div className="relative">
            {/* Connection Lines - Desktop */}
            <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-1 bg-gradient-to-r from-indigo-300 via-purple-300 to-cyan-300 rounded-full transform -translate-y-1/2 z-0"></div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 relative z-10">
              {[
                {
                  step: 1,
                  title: "Source Segregation",
                  description: "Households, offices, or residential units separate waste into wet, dry, and hazardous categories using proper techniques",
                  icon: <Recycle className="w-8 h-8 sm:w-10 sm:h-10 text-white" />,
                  color: "from-green-400 to-emerald-500",
                  details: [
                    "Wet waste: Food scraps, organic matter",
                    "Dry waste: Paper, plastic, metal",
                    "Hazardous: Batteries, electronics",
                    "Use provided color-coded bins"
                  ]
                },
                {
                  step: 2,
                  title: "Scheduled Collection",
                  description: "Trained collectors arrive on schedule, scan unit QR codes, and pick up segregated waste from various locations",
                  icon: <Trash2 className="w-8 h-8 sm:w-10 sm:h-10 text-white" />,
                  color: "from-blue-400 to-indigo-500",
                  details: [
                    "QR code scanning for identification",
                    "Quality rating of waste segregation",
                    "Real-time collection confirmation",
                    "Photo documentation if needed"
                  ]
                },
                {
                  step: 3,
                  title: "Real-time Tracking",
                  description: "Collection status updated instantly, quality ratings recorded, and feedback provided",
                  icon: <Target className="w-8 h-8 sm:w-10 sm:h-10 text-white" />,
                  color: "from-purple-400 to-pink-500",
                  details: [
                    "Live collection status updates",
                    "Segregation quality scoring",
                    "Collector and household feedback",
                    "Issue reporting system"
                  ]
                },
                {
                  step: 4,
                  title: "Processing & Impact Reporting",
                  description: "Collected waste is processed responsibly through composting, recycling, or safe disposal, with transparent impact reports shared",
                  icon: <BarChart className="w-8 h-8 sm:w-10 sm:h-10 text-white" />,
                  color: "from-orange-400 to-red-500",
                  details: [
                    "Wet waste sent for composting or bio-processing",
                    "Dry waste segregated and sent for recycling",
                    "Hazardous waste handled via authorized channels",
                    "Environmental impact & performance reports"
                  ]
                }
              ].map((step, index) => (
                <Card key={index} className="group relative border-0 shadow-xl hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-3 bg-white/90 backdrop-blur-sm overflow-hidden cursor-pointer">
                  <div className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-10 transition-opacity duration-300" style={{ backgroundImage: `linear-gradient(135deg, var(--tw-gradient-stops))` }}></div>

                  {/* Step Number Badge */}
                  <div className="absolute -top-3 -right-3 z-20">
                    <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br ${step.color} flex items-center justify-center shadow-lg`}>
                      <span className="text-white font-bold text-lg sm:text-xl">{step.step}</span>
                    </div>
                  </div>

                  <CardHeader className="relative z-10 pb-4">
                    <div className="flex flex-col items-center text-center mb-4">
                      <div className={`bg-gradient-to-br ${step.color} p-4 sm:p-6 rounded-2xl sm:rounded-3xl shadow-lg group-hover:scale-110 transition-transform duration-300 mb-4`}>
                        {step.icon}
                      </div>
                      <CardTitle className="text-lg sm:text-xl font-bold text-gray-800 group-hover:text-indigo-600 transition-colors">
                        {step.title}
                      </CardTitle>
                    </div>
                  </CardHeader>

                  <CardContent className="relative z-10 px-4 sm:px-6 pb-6">
                    <p className="text-sm sm:text-base text-gray-600 leading-relaxed mb-4 text-center">
                      {step.description}
                    </p>

                    {/* Expandable Details */}
                    <div className="space-y-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <h4 className="font-semibold text-gray-800 text-sm flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${step.color}`}></div>
                        Key Features:
                      </h4>
                      <ul className="space-y-1">
                        {step.details.map((detail, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-xs sm:text-sm text-gray-600">
                            <CheckCircle className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />
                            <span>{detail}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Arrow for Desktop */}
                    {index < 3 && (
                      <div className="hidden lg:block absolute -right-4 top-1/2 transform -translate-y-1/2 z-30">
                        <ArrowRight className="w-6 h-6 text-indigo-400" />
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Process Benefits */}
          <div className="mt-12 sm:mt-16 text-center">
            <h3 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-8">Why This Process Works</h3>
            <div className="grid sm:grid-cols-3 gap-6 sm:gap-8">
              <div className="bg-white/70 backdrop-blur-sm p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300">
                <div className="bg-green-100 w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="w-6 h-6 sm:w-8 sm:h-8 text-green-600" />
                </div>
                <h4 className="font-bold text-gray-800 mb-2 text-sm sm:text-base">95% Efficiency</h4>
                <p className="text-xs sm:text-sm text-gray-600">Streamlined process ensures consistent collection and quality</p>
              </div>

              <div className="bg-white/70 backdrop-blur-sm p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300">
                <div className="bg-blue-100 w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
                </div>
                <h4 className="font-bold text-gray-800 mb-2 text-sm sm:text-base">100% Transparency</h4>
                <p className="text-xs sm:text-sm text-gray-600">Every step is tracked and documented in real-time</p>
              </div>

              <div className="bg-white/70 backdrop-blur-sm p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300">
                <div className="bg-purple-100 w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Globe className="w-6 h-6 sm:w-8 sm:h-8 text-purple-600" />
                </div>
                <h4 className="font-bold text-gray-800 mb-2 text-sm sm:text-base">Community Impact</h4>
                <p className="text-xs sm:text-sm text-gray-600">Cleaner villages, healthier environment for everyone</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Call to Action Section */}
      <div className="py-12 sm:py-20 px-4 sm:px-6 bg-gradient-to-br from-green-900 via-emerald-800 to-teal-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="absolute top-0 left-0 w-full h-full">
          <div className="absolute top-10 left-10 w-48 sm:w-64 h-48 sm:h-64 bg-green-400/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-10 right-10 w-64 sm:w-80 h-64 sm:h-80 bg-blue-400/10 rounded-full blur-3xl"></div>
        </div>

        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6 bg-gradient-to-r from-green-300 to-blue-300 bg-clip-text text-transparent">
            Ready to Transform Your Community?
          </h2>
          <p className="text-lg sm:text-xl text-green-100 mb-8 px-4">
            Join thousands of villages, organizations, societies, and residential complexes for smarter waste management using GreenPath
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center px-4">
            <Button
              onClick={() => window.location.href = "/login"}
              size="lg"
              className="w-full sm:w-auto bg-white text-green-600 hover:bg-green-50 font-semibold px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg rounded-full shadow-2xl transform hover:scale-105 transition-all duration-300"
            >
              <Zap className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
              Start Your Journey
            </Button>
            <Button
              onClick={() => navigateToSection("contact")}
              variant="outline"
              size="lg"
              className="w-full sm:w-auto border-white/50 text-black hover:text-white hover:bg-white/10 font-semibold px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg rounded-full backdrop-blur-sm"
            >
              Contact Us
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderAboutSection = () => (
    <div className="min-h-screen">
      {/* Hero Section for About */}
      <div className="relative py-16 sm:py-20 px-4 sm:px-6 text-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-400 via-purple-500 to-indigo-600">
          <div className="absolute inset-0 bg-black/20"></div>
          <div className="absolute top-10 left-10 w-48 sm:w-72 h-48 sm:h-72 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-10 right-10 w-64 sm:w-96 h-64 sm:h-96 bg-white/5 rounded-full blur-3xl animate-pulse delay-1000"></div>
        </div>

        <div className="relative z-10 max-w-6xl mx-auto">
          <div className="flex justify-center mb-6 sm:mb-8">
            <div className="relative">
              <div className="absolute inset-0 bg-white/20 rounded-full blur-xl animate-pulse"></div>
              <div className="relative bg-white/90 backdrop-blur-sm p-4 sm:p-6 rounded-full shadow-2xl">
                <Users className="w-12 h-12 sm:w-16 sm:h-16 text-purple-600 animate-bounce" />
              </div>
            </div>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-4 sm:mb-6 leading-tight">
            <span className="bg-gradient-to-r from-white to-purple-100 bg-clip-text text-transparent">
              About GreenPath
            </span>
          </h1>

          <p className="text-lg sm:text-xl md:text-2xl text-purple-100 mb-6 sm:mb-8 font-light max-w-4xl mx-auto">
            🌟 Discover the Story Behind Smart Waste Management
          </p>

          <p className="text-base sm:text-lg text-white/90 max-w-4xl mx-auto mb-8 sm:mb-12 leading-relaxed px-4">
            Learn about our platform, our passionate founders, and the amazing community
            that makes GreenPath a reality for villages across the nation.
          </p>
        </div>
      </div>

      {/* What GreenPath Is - Enhanced */}
      <div className="py-12 sm:py-20 px-4 sm:px-6 bg-gradient-to-r from-slate-50 to-blue-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <div className="inline-flex items-center gap-3 bg-white/80 backdrop-blur-sm px-4 sm:px-6 py-3 rounded-full shadow-lg mb-6">
              <Recycle className="w-6 sm:w-8 h-6 sm:h-8 text-green-600" />
              <span className="text-xl sm:text-2xl font-bold text-gray-800">What is GreenPath?</span>
            </div>
          </div>

          <Card className="border-0 shadow-2xl bg-white/70 backdrop-blur-sm hover:shadow-3xl transition-all duration-500 transform hover:-translate-y-2">
            <CardContent className="p-6 sm:p-12">
              <div className="grid lg:grid-cols-2 gap-8 sm:gap-12 items-center">
                <div className="space-y-6 sm:space-y-8">
                  <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-800 leading-tight">
                    Revolutionizing
                    <span className="bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent"> Community Waste Management</span>
                  </h3>
                  <p className="text-base sm:text-lg md:text-xl text-gray-700 leading-relaxed">
                    GreenPath is a cutting-edge waste management platform built for diverse communities including villages,
                    organizations, residential societies, apartment complexes, and corporate offices. We transform traditional
                    waste collection into a smart, digital process that benefits everyone involved.
                  </p>
                  <p className="text-base sm:text-lg text-gray-600 leading-relaxed">
                    Our platform connects households, offices, waste collectors, facility managers, and administrators through
                    a unified system that tracks collections, and ensures quality control throughout
                    the waste management process across various settings.
                  </p>
                  <p className="text-base sm:text-lg text-gray-600 leading-relaxed">
                    By leveraging technology like QR codes, mobile apps, and real-time tracking, we make waste
                    management more efficient, transparent, and environmentally sustainable for any community or organization.
                  </p>
                </div>

                <div className="relative">
                  <div className="bg-gradient-to-br from-green-400 to-blue-500 p-6 sm:p-8 rounded-3xl shadow-2xl transform rotate-3 hover:rotate-0 transition-transform duration-500">
                    <div className="bg-white rounded-2xl p-4 sm:p-6 space-y-4">
                      <div className="flex items-center gap-3 text-green-600">
                        <img src="/logos/logo.svg" alt="GreenPath" className="w-6 sm:w-8 h-6 sm:h-8" />
                        <span className="text-lg sm:text-2xl font-bold">Smart Platform</span>
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-gray-700 text-sm sm:text-base">
                          <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                          <span>Digital Collection</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-700 text-sm sm:text-base">
                          <div className="w-3 h-3 bg-blue-400 rounded-full"></div>
                          <span>Real-time Tracking</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-700 text-sm sm:text-base">
                          <div className="w-3 h-3 bg-purple-400 rounded-full"></div>
                          <span>Community Connect</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-700 text-sm sm:text-base">
                          <div className="w-3 h-3 bg-orange-400 rounded-full"></div>
                          <span>Quality Control</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="absolute -top-2 -right-2 bg-yellow-400 text-yellow-900 px-3 py-1 rounded-full text-xs sm:text-sm font-bold transform rotate-12">
                    🚀 Innovative!
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Founders Section - Replicated from Home
      <div className="py-12 sm:py-20 px-4 sm:px-6 bg-gradient-to-r from-purple-50 to-pink-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Meet Our Founders
            </h2>
            <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto px-4">
              Visionary leaders driving sustainable change in waste management
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 sm:gap-12 max-w-4xl mx-auto">
            <Card className="group text-center border-0 shadow-xl hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-3 bg-gradient-to-br from-white to-purple-50">
              <CardHeader className="pb-6">
                <div className="flex justify-center mb-6">
                  <div className="relative">
                    <div className="w-24 h-24 sm:w-32 sm:h-32 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform duration-300">
                      <Users className="w-10 h-10 sm:w-16 sm:h-16 text-white" />
                    </div>
                    <div className="absolute -top-2 -right-2 bg-yellow-400 text-yellow-900 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-bold">
                      CEO
                    </div>
                  </div>
                </div>
                <CardTitle className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">
                  Balaji Nayak
                </CardTitle>
                <p className="text-base sm:text-lg font-medium text-purple-600">Co-Founder & Chief Executive</p>
              </CardHeader>
              <CardContent className="px-4 sm:px-6">
                <p className="text-gray-700 text-base sm:text-lg leading-relaxed mb-6">
                  Visionary leader driving innovation in sustainable waste management, combining strategic leadership with hands-on product development and technology execution.
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  <div className="bg-purple-100 text-purple-600 px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-medium">
                    Technology
                  </div>
                  <div className="bg-green-100 text-green-600 px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-medium">
                    Innovation
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="group text-center border-0 shadow-xl hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-3 bg-gradient-to-br from-white to-pink-50">
              <CardHeader className="pb-6">
                <div className="flex justify-center mb-6">
                  <div className="relative">
                    <div className="w-24 h-24 sm:w-32 sm:h-32 bg-gradient-to-br from-pink-400 to-pink-600 rounded-full flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform duration-300">
                      <Users className="w-10 h-10 sm:w-16 sm:h-16 text-white" />
                    </div>
                    <div className="absolute -top-2 -right-2 bg-blue-400 text-blue-900 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-bold">
                      CDO
                    </div>
                  </div>
                </div>
                <CardTitle className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">
                  Sreeja
                </CardTitle>
                <p className="text-base sm:text-lg font-medium text-pink-600">Co-Founder & Strategic Partnerships Lead</p>
              </CardHeader>
              <CardContent className="px-4 sm:px-6">
                <p className="text-gray-700 text-base sm:text-lg leading-relaxed mb-6">
                  Leads partnerships, fundraising, and external relations to drive GreenPath’s mission forward through strong collaborations and impact-focused growth.
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  <div className="bg-pink-100 text-pink-600 px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-medium">
                    Sustainability
                  </div>
                  <div className="bg-blue-100 text-blue-600 px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-medium">
                    Leadership
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div> */}

      {/* Thank You Section - Enhanced */}
      <div className="py-12 sm:py-20 px-4 sm:px-6 bg-gradient-to-br from-amber-50 to-orange-100">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <div className="inline-flex items-center gap-3 bg-white/80 backdrop-blur-sm px-4 sm:px-8 py-4 rounded-full shadow-lg mb-8">
              <Heart className="w-6 sm:w-8 h-6 sm:h-8 text-red-500" />
              <span className="text-2xl sm:text-3xl font-bold text-gray-800">Special Thanks</span>
            </div>
          </div>

          <Card className="border-0 shadow-xl bg-white/70 backdrop-blur-sm hover:shadow-2xl transition-all duration-500">
            <CardContent className="p-6 sm:p-12">
              <div className="space-y-6 sm:space-y-8">
                <div className="flex justify-center">
                  <Quote className="w-12 h-12 sm:w-16 sm:h-16 text-orange-400" />
                </div>

                <p className="text-xl sm:text-2xl font-medium text-gray-800 leading-relaxed text-center">
                  We extend our heartfelt gratitude to
                  <span className="font-bold text-orange-600"> Azim Premji University</span> and the
                  <span className="font-bold text-green-600"> Hasiru Dala team</span> for their invaluable
                  support, guidance, and collaboration in making GreenPath a reality.
                </p>

                <p className="text-lg sm:text-xl text-gray-600 leading-relaxed text-center">
                  Their commitment to sustainability and community development has been instrumental
                  in shaping our platform and our mission to create cleaner, healthier villages.
                </p>

                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mt-8 sm:mt-12">
                  <div className="bg-white/80 p-4 sm:p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 text-center">
                    <CheckCircle className="w-8 h-8 text-orange-500 mx-auto mb-3" />
                    <h4 className="font-bold text-gray-800 mb-2">Academic Partners</h4>
                    <p className="text-sm text-gray-600">Azim Premji University</p>
                  </div>

                  <div className="bg-white/80 p-4 sm:p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 text-center">
                    <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-3" />
                    <h4 className="font-bold text-gray-800 mb-2">Community Partners</h4>
                    <p className="text-sm text-gray-600">Hasiru Dala Team</p>
                  </div>

                  <div className="bg-white/80 p-4 sm:p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 text-center">
                    <CheckCircle className="w-8 h-8 text-blue-500 mx-auto mb-3" />
                    <h4 className="font-bold text-gray-800 mb-2">Volunteers</h4>
                    <p className="text-sm text-gray-600">All Volunteers</p>
                  </div>

                  <div className="bg-white/80 p-4 sm:p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 text-center">
                    <CheckCircle className="w-8 h-8 text-purple-500 mx-auto mb-3" />
                    <h4 className="font-bold text-gray-800 mb-2">Development Team</h4>
                    <p className="text-sm text-gray-600">Team Members</p>
                  </div>
                </div>

                <div className="flex flex-wrap justify-center gap-4 sm:gap-6">
                  <div className="bg-gradient-to-r from-orange-400 to-orange-600 text-white px-4 sm:px-6 py-3 rounded-full font-semibold shadow-lg text-sm sm:text-base">
                    🎓 Azim Premji University
                  </div>
                  <div className="bg-gradient-to-r from-green-400 to-green-600 text-white px-4 sm:px-6 py-3 rounded-full font-semibold shadow-lg text-sm sm:text-base">
                    🌱 Hasiru Dala Team
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Vision & Mission - Enhanced */}
      <div className="py-12 sm:py-20 px-4 sm:px-6 bg-gradient-to-br from-green-900 via-emerald-800 to-teal-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="absolute top-0 left-0 w-full h-full">
          <div className="absolute top-10 left-10 w-48 sm:w-64 h-48 sm:h-64 bg-green-400/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-10 right-10 w-64 sm:w-80 h-64 sm:h-80 bg-blue-400/10 rounded-full blur-3xl"></div>
        </div>

        <div className="relative z-10 max-w-6xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-green-300 to-blue-300 bg-clip-text text-transparent">
              Vision & Mission
            </h2>
            <p className="text-lg sm:text-xl text-green-100 max-w-3xl mx-auto">
              Guided by purpose, driven by innovation
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8 sm:gap-12">
            <Card className="bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/20 transition-all duration-500 transform hover:-translate-y-2">
              <CardHeader>
                <CardTitle className="text-2xl sm:text-3xl flex items-center gap-3 mb-4">
                  <div className="bg-gradient-to-br from-blue-400 to-purple-500 p-3 rounded-2xl">
                    <Target className="w-6 sm:w-8 h-6 sm:h-8 text-white" />
                  </div>
                  Our Vision
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg sm:text-xl leading-relaxed text-green-100 mb-6">
                  To create sustainable, clean communities where technology empowers every individual and organization
                  to contribute to environmental preservation through efficient waste management across all settings.
                </p>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <span className="text-green-200 text-sm sm:text-base">Zero waste communities</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                    <span className="text-green-200 text-sm sm:text-base">Technology-driven solutions</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                    <span className="text-green-200 text-sm sm:text-base">Universal community empowerment</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/20 transition-all duration-500 transform hover:-translate-y-2">
              <CardHeader>
                <CardTitle className="text-2xl sm:text-3xl flex items-center gap-3 mb-4">
                  <div className="bg-gradient-to-br from-red-400 to-pink-500 p-3 rounded-2xl">
                    <Heart className="w-6 sm:w-8 h-6 sm:h-8 text-white" />
                  </div>
                  Our Mission
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg sm:text-xl leading-relaxed text-green-100 mb-6">
                  To digitize and streamline waste management processes across villages, organizations, societies,
                  and residential complexes, enabling transparency, accountability, and community participation
                  in building cleaner, healthier living and working environments.
                </p>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                    <span className="text-green-200 text-sm sm:text-base">Digital transformation</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                    <span className="text-green-200 text-sm sm:text-base">Transparent operations</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <span className="text-green-200 text-sm sm:text-base">Healthier communities</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );

  const renderFeedbackSection = () => (
    <div className="min-h-screen">
      {/* Hero Section for Feedback */}
      <div className="relative py-16 sm:py-20 px-4 sm:px-6 text-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-400 via-pink-500 to-red-500">
          <div className="absolute inset-0 bg-black/20"></div>
          <div className="absolute top-10 left-10 w-48 sm:w-72 h-48 sm:h-72 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-10 right-10 w-64 sm:w-96 h-64 sm:h-96 bg-white/5 rounded-full blur-3xl animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] sm:w-[800px] h-[400px] sm:h-[600px] bg-gradient-to-r from-transparent via-white/5 to-transparent rounded-full blur-3xl animate-spin" style={{ animationDuration: '20s' }}></div>
        </div>

        <div className="relative z-10 max-w-6xl mx-auto">
          <div className="flex justify-center mb-6 sm:mb-8">
            <div className="relative">
              <div className="absolute inset-0 bg-white/20 rounded-full blur-xl animate-pulse"></div>
              <div className="relative bg-white/90 backdrop-blur-sm p-4 sm:p-6 rounded-full shadow-2xl">
                <Star className="w-12 h-12 sm:w-16 sm:h-16 text-purple-600 animate-bounce" />
              </div>
            </div>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-4 sm:mb-6 leading-tight">
            <span className="bg-gradient-to-r from-white to-pink-100 bg-clip-text text-transparent">
              Share Your Feedback
            </span>
          </h1>

          <p className="text-lg sm:text-xl md:text-2xl text-pink-100 mb-6 sm:mb-8 font-light max-w-4xl mx-auto">
            💬 Help Us Improve GreenPath
          </p>

          <p className="text-base sm:text-lg text-white/90 max-w-4xl mx-auto mb-8 sm:mb-12 leading-relaxed px-4">
            Your voice matters! Share suggestions, report bugs, or provide general feedback
            to help us make GreenPath even better for communities everywhere.
          </p>
        </div>

        {/* Floating feedback icons */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(10)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 bg-white/30 rounded-full animate-float"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 5}s`,
                animationDuration: `${3 + Math.random() * 4}s`
              }}
            ></div>
          ))}
        </div>
      </div>

      {/* Feedback Form Section - Enhanced */}
      <div className="py-12 sm:py-20 px-4 sm:px-6 bg-gradient-to-br from-slate-50 to-purple-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <div className="inline-flex items-center gap-3 bg-white/80 backdrop-blur-sm px-4 sm:px-6 py-3 rounded-full shadow-lg mb-6">
              <Send className="w-6 sm:w-8 h-6 sm:h-8 text-purple-600" />
              <span className="text-xl sm:text-2xl font-bold text-gray-800">Feedback Form</span>
            </div>
            <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto">
              Every piece of feedback helps us build a better platform for waste management communities
            </p>
          </div>

          <Card className="border-0 shadow-2xl bg-white/80 backdrop-blur-sm hover:shadow-3xl transition-all duration-500">
            <CardContent className="p-6 sm:p-12">
              <form onSubmit={handleFeedbackSubmit} className="space-y-6 sm:space-y-8">
                <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-gray-800 font-medium text-sm sm:text-base">Name *</Label>
                    <Input
                      id="name"
                      name="name"
                      required
                      className="h-10 sm:h-12 text-sm sm:text-base border-gray-200 focus:border-purple-400 focus:ring-purple-400"
                      placeholder="Your full name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-gray-800 font-medium text-sm sm:text-base">Email *</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      required
                      className="h-10 sm:h-12 text-sm sm:text-base border-gray-200 focus:border-purple-400 focus:ring-purple-400"
                      placeholder="your.email@example.com"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="feedbackType" className="text-gray-800 font-medium text-sm sm:text-base">Feedback Type *</Label>
                  <Select name="feedbackType" required>
                    <SelectTrigger className="h-10 sm:h-12 text-sm sm:text-base border-gray-200 focus:border-purple-400 focus:ring-purple-400">
                      <SelectValue placeholder="Select feedback type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="suggestion">💡 Suggestion</SelectItem>
                      <SelectItem value="bug_report">🐛 Bug Report</SelectItem>
                      <SelectItem value="general">💬 General Feedback</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message" className="text-gray-800 font-medium text-sm sm:text-base">Message *</Label>
                  <Textarea
                    id="message"
                    name="message"
                    placeholder="Please share your feedback, suggestions, or report any issues you've encountered. Be as detailed as possible to help us understand and address your input effectively."
                    rows={6}
                    required
                    className="text-sm sm:text-base border-gray-200 focus:border-purple-400 focus:ring-purple-400 resize-none"
                  />
                </div>

                <div className="pt-4">
                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white font-semibold py-3 sm:py-4 text-sm sm:text-lg rounded-xl shadow-lg transform hover:scale-105 transition-all duration-300"
                    disabled={feedbackMutation.isPending}
                  >
                    {feedbackMutation.isPending ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        Submitting Feedback...
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Send className="w-4 h-4 sm:w-5 sm:h-5" />
                        Submit Feedback
                      </div>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Feedback Benefits Section */}
          <div className="mt-12 sm:mt-16 grid sm:grid-cols-3 gap-6 sm:gap-8">
            <Card className="text-center border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-white/60 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="bg-green-100 w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-6 h-6 sm:w-8 sm:h-8 text-green-600" />
                </div>
                <h3 className="font-bold text-gray-800 mb-2 text-sm sm:text-base">Quick Response</h3>
                <p className="text-xs sm:text-sm text-gray-600">We review all feedback within 24-48 hours</p>
              </CardContent>
            </Card>

            <Card className="text-center border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-white/60 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="bg-blue-100 w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
                </div>
                <h3 className="font-bold text-gray-800 mb-2 text-sm sm:text-base">Community Driven</h3>
                <p className="text-xs sm:text-sm text-gray-600">Your input shapes our platform's future</p>
              </CardContent>
            </Card>

            <Card className="text-center border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-white/60 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="bg-purple-100 w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Award className="w-6 h-6 sm:w-8 sm:h-8 text-purple-600" />
                </div>
                <h3 className="font-bold text-gray-800 mb-2 text-sm sm:text-base">Continuous Improvement</h3>
                <p className="text-xs sm:text-sm text-gray-600">We implement valuable suggestions</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );

  const renderLearnSection = () => (
    <div className="min-h-screen">
      {/* Hero Section for Learn */}
      <div className="relative py-16 sm:py-20 px-4 sm:px-6 text-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-400 via-amber-500 to-yellow-600">
          <div className="absolute inset-0 bg-black/20"></div>
          <div className="absolute top-10 left-10 w-48 sm:w-72 h-48 sm:h-72 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-10 right-10 w-64 sm:w-96 h-64 sm:h-96 bg-white/5 rounded-full blur-3xl animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] sm:w-[800px] h-[400px] sm:h-[600px] bg-gradient-to-r from-transparent via-white/5 to-transparent rounded-full blur-3xl animate-spin" style={{ animationDuration: '20s' }}></div>
        </div>

        <div className="relative z-10 max-w-6xl mx-auto">
          <div className="flex justify-center mb-6 sm:mb-8">
            <div className="relative">
              <div className="absolute inset-0 bg-white/20 rounded-full blur-xl animate-pulse"></div>
              <div className="relative bg-white/90 backdrop-blur-sm p-4 sm:p-6 rounded-full shadow-2xl">
                <ClipboardList className="w-12 h-12 sm:w-16 sm:h-16 text-orange-600 animate-bounce" />
              </div>
            </div>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-4 sm:mb-6 leading-tight">
            <span className="bg-gradient-to-r from-white to-yellow-100 bg-clip-text text-transparent">
              Learn GreenPath
            </span>
          </h1>

          <p className="text-lg sm:text-xl md:text-2xl text-yellow-100 mb-6 sm:mb-8 font-light max-w-4xl mx-auto">
            🎓 Master Smart Waste Management
          </p>

          <p className="text-base sm:text-lg text-white/90 max-w-4xl mx-auto mb-8 sm:mb-12 leading-relaxed px-4">
            Watch our comprehensive video tutorials to learn how to use GreenPath effectively,
            master waste segregation techniques, and become a champion of sustainable living.
          </p>
        </div>

        {/* Floating learning icons */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 bg-white/30 rounded-full animate-float"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 5}s`,
                animationDuration: `${3 + Math.random() * 4}s`
              }}
            ></div>
          ))}
        </div>
      </div>

      {/* Video Categories Section */}
      <div className="py-12 sm:py-20 px-4 sm:px-6 bg-gradient-to-br from-slate-50 to-orange-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <div className="inline-flex items-center gap-3 bg-white/80 backdrop-blur-sm px-4 sm:px-6 py-3 rounded-full shadow-lg mb-6">
              <TrendingUp className="w-6 sm:w-8 h-6 sm:h-8 text-orange-600" />
              <span className="text-xl sm:text-2xl font-bold text-gray-800">Video Tutorials</span>
            </div>
            <p className="text-base sm:text-lg text-gray-600 max-w-3xl mx-auto">
              Learn at your own pace with our comprehensive video library covering all aspects of GreenPath
            </p>
          </div>

          {/* Video Grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {learningVideos.map((video) => (
              <Card key={video.id} className="group border-0 shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 bg-white/80 backdrop-blur-sm overflow-hidden">
                <div className="relative">
                  {/* YouTube Video Embed */}
                  <div className="aspect-video bg-gray-100 relative overflow-hidden">
                    <iframe
                      src={`https://www.youtube.com/embed/${video.youtubeId}?rel=0&modestbranding=1`}
                      title={video.title}
                      className="w-full h-full"
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    ></iframe>
                  </div>

                  {/* Category Badge */}
                  <div className="absolute top-3 left-3">
                    <div className="bg-black/70 text-white px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium backdrop-blur-sm">
                      {video.category}
                    </div>
                  </div>

                  {/* Duration Badge */}
                  <div className="absolute bottom-3 right-3">
                    <div className="bg-black/70 text-white px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium backdrop-blur-sm">
                      {video.duration}
                    </div>
                  </div>
                </div>

                <CardContent className="p-4 sm:p-6">
                  <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-3 group-hover:text-orange-600 transition-colors">
                    {video.title}
                  </h3>
                  <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                    {video.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Learning Resources Section */}
      <div className="py-12 sm:py-20 px-4 sm:px-6 bg-gradient-to-r from-orange-50 to-yellow-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-orange-600 to-yellow-600 bg-clip-text text-transparent">
              Quick Learning Guide
            </h2>
            <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto">
              Essential topics to get you started with GreenPath
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            <Card className="text-center border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-white/70 backdrop-blur-sm group">
              <CardContent className="p-6">
                <div className="bg-green-100 w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <Users className="w-6 h-6 sm:w-8 sm:h-8 text-green-600" />
                </div>
                <h3 className="font-bold text-gray-800 mb-2 text-sm sm:text-base">Getting Started</h3>
                <p className="text-xs sm:text-sm text-gray-600">Account setup, login, and basic navigation</p>
              </CardContent>
            </Card>

            <Card className="text-center border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-white/70 backdrop-blur-sm group">
              <CardContent className="p-6">
                <div className="bg-blue-100 w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <Settings className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
                </div>
                <h3 className="font-bold text-gray-800 mb-2 text-sm sm:text-base">Dashboard Guide</h3>
                <p className="text-xs sm:text-sm text-gray-600">Understanding your role-specific dashboard</p>
              </CardContent>
            </Card>

            <Card className="text-center border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-white/70 backdrop-blur-sm group">
              <CardContent className="p-6">
                <div className="bg-purple-100 w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <Recycle className="w-6 h-6 sm:w-8 sm:h-8 text-purple-600" />
                </div>
                <h3 className="font-bold text-gray-800 mb-2 text-sm sm:text-base">Waste Segregation</h3>
                <p className="text-xs sm:text-sm text-gray-600">Proper techniques for waste separation</p>
              </CardContent>
            </Card>

            <Card className="text-center border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-white/70 backdrop-blur-sm group">
              <CardContent className="p-6">
                <div className="bg-orange-100 w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <Award className="w-6 h-6 sm:w-8 sm:h-8 text-orange-600" />
                </div>
                <h3 className="font-bold text-gray-800 mb-2 text-sm sm:text-base">Best Practices</h3>
                <p className="text-xs sm:text-sm text-gray-600">Community guidelines and tips</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Call to Action for Learning */}
      <div className="py-12 sm:py-20 px-4 sm:px-6 bg-gradient-to-br from-orange-900 via-amber-800 to-yellow-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="absolute top-0 left-0 w-full h-full">
          <div className="absolute top-10 left-10 w-48 sm:w-64 h-48 sm:h-64 bg-orange-400/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-10 right-10 w-64 sm:w-80 h-64 sm:h-80 bg-yellow-400/10 rounded-full blur-3xl"></div>
        </div>

        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6 bg-gradient-to-r from-orange-300 to-yellow-300 bg-clip-text text-transparent">
            Ready to Become a GreenPath Expert?
          </h2>
          <p className="text-lg sm:text-xl text-orange-100 mb-8 px-4">
            Start your learning journey today and make a positive impact on your community
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center px-4">
            <Button
              onClick={() => window.location.href = "/login"}
              size="lg"
              className="w-full sm:w-auto bg-white text-orange-600 hover:bg-orange-50 font-semibold px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg rounded-full shadow-2xl transform hover:scale-105 transition-all duration-300"
            >
              <Zap className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
              Start Learning Now
            </Button>
            <Button
              onClick={() => navigateToSection("contact")}
              variant="outline"
              size="lg"
              className="w-full sm:w-auto border-white/50 text-white hover:bg-white/10 font-semibold px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg rounded-full backdrop-blur-sm"
            >
              Need Help?
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderContactSection = () => (
    <div className="min-h-screen">
      {/* Hero Section for Contact */}
      <div className="relative py-16 sm:py-20 px-4 sm:px-6 text-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-teal-400 via-cyan-500 to-blue-600">
          <div className="absolute inset-0 bg-black/20"></div>
          <div className="absolute top-10 left-10 w-48 sm:w-72 h-48 sm:h-72 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-10 right-10 w-64 sm:w-96 h-64 sm:h-96 bg-white/5 rounded-full blur-3xl animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] sm:w-[800px] h-[400px] sm:h-[600px] bg-gradient-to-r from-transparent via-white/5 to-transparent rounded-full blur-3xl animate-spin" style={{ animationDuration: '20s' }}></div>
        </div>

        <div className="relative z-10 max-w-6xl mx-auto">
          <div className="flex justify-center mb-6 sm:mb-8">
            <div className="relative">
              <div className="absolute inset-0 bg-white/20 rounded-full blur-xl animate-pulse"></div>
              <div className="relative bg-white/90 backdrop-blur-sm p-4 sm:p-6 rounded-full shadow-2xl">
                <Phone className="w-12 h-12 sm:w-16 sm:h-16 text-teal-600 animate-bounce" />
              </div>
            </div>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-4 sm:mb-6 leading-tight">
            <span className="bg-gradient-to-r from-white to-cyan-100 bg-clip-text text-transparent">
              Contact Us
            </span>
          </h1>

          <p className="text-lg sm:text-xl md:text-2xl text-cyan-100 mb-6 sm:mb-8 font-light max-w-4xl mx-auto">
            📞 Get in Touch with GreenPath
          </p>

          <p className="text-base sm:text-lg text-white/90 max-w-4xl mx-auto mb-8 sm:mb-12 leading-relaxed px-4">
            Ready to transform waste management in your Village, community, organization, or residential complex? Have questions about our platform?
            We're here to help and excited to hear from you!
          </p>
        </div>

        {/* Floating contact icons */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 bg-white/30 rounded-full animate-float"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 5}s`,
                animationDuration: `${3 + Math.random() * 4}s`
              }}
            ></div>
          ))}
        </div>
      </div>

      {/* Contact Form Section - Enhanced */}
      <div className="py-12 sm:py-20 px-4 sm:px-6 bg-gradient-to-br from-slate-50 to-cyan-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <div className="inline-flex items-center gap-3 bg-white/80 backdrop-blur-sm px-4 sm:px-6 py-3 rounded-full shadow-lg mb-6">
              <Mail className="w-6 sm:w-8 h-6 sm:h-8 text-cyan-600" />
              <span className="text-xl sm:text-2xl font-bold text-gray-800">Get In Touch</span>
            </div>
            <p className="text-base sm:text-lg text-gray-600 max-w-3xl mx-auto">
              Whether you're interested in implementing GreenPath in your village, organization, society, apartment complex,
              or have questions about our services, we'd love to connect with you
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8 sm:gap-12 items-start">
            {/* Contact Form */}
            <Card className="border-0 shadow-2xl bg-white/80 backdrop-blur-sm hover:shadow-3xl transition-all duration-500">
              <CardHeader className="pb-6">
                <CardTitle className="text-xl sm:text-2xl flex items-center gap-3 text-gray-800">
                  <Send className="w-6 sm:w-8 h-6 sm:h-8 text-cyan-600" />
                  Contact Form
                </CardTitle>
                <p className="text-sm sm:text-base text-gray-600">Fill out the form below and we'll get back to you soon</p>
              </CardHeader>
              <CardContent className="px-6 pb-8">
                <form onSubmit={handleContactSubmit} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="contact-name" className="text-gray-800 font-medium text-sm sm:text-base">Name *</Label>
                      <Input
                        id="contact-name"
                        name="name"
                        required
                        className="h-10 sm:h-12 text-sm sm:text-base border-gray-200 focus:border-cyan-400 focus:ring-cyan-400"
                        placeholder="Your full name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contact-email" className="text-gray-800 font-medium text-sm sm:text-base">Email *</Label>
                      <Input
                        id="contact-email"
                        name="email"
                        type="email"
                        required
                        className="h-10 sm:h-12 text-sm sm:text-base border-gray-200 focus:border-cyan-400 focus:ring-cyan-400"
                        placeholder="your.email@example.com"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-gray-800 font-medium text-sm sm:text-base">Phone (Optional)</Label>
                    <Label htmlFor="phone" className="ml-4 text-gray-800 font-medium text-sm">suggested for quicker responses</Label>
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      className="h-10 sm:h-12 text-sm sm:text-base border-gray-200 focus:border-cyan-400 focus:ring-cyan-400"
                      placeholder="+91 98765 43210"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="subject" className="text-gray-800 font-medium text-sm sm:text-base">Subject *</Label>
                    <Input
                      id="subject"
                      name="subject"
                      placeholder="Waste management service inquiry"
                      required
                      className="h-10 sm:h-12 text-sm sm:text-base border-gray-200 focus:border-cyan-400 focus:ring-cyan-400"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contact-message" className="text-gray-800 font-medium text-sm sm:text-base">Message *</Label>
                    <Textarea
                      id="contact-message"
                      name="message"
                      placeholder="Please describe your waste management needs, community/organization details, or any questions you have about GreenPath..."
                      rows={5}
                      required
                      className="text-sm sm:text-base border-gray-200 focus:border-cyan-400 focus:ring-cyan-400 resize-none"
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold py-3 sm:py-4 text-sm sm:text-lg rounded-xl shadow-lg transform hover:scale-105 transition-all duration-300"
                    disabled={contactMutation.isPending}
                  >
                    {contactMutation.isPending ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        Sending Message...
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Send className="w-4 h-4 sm:w-5 sm:h-5" />
                        Send Message
                      </div>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Contact Information & Details */}
            <div className="space-y-6 sm:space-y-8">
              {/* Contact Info Card */}
              <Card className="border-0 shadow-xl bg-white/70 backdrop-blur-sm hover:shadow-2xl transition-all duration-500">
                <CardHeader>
                  <CardTitle className="text-xl sm:text-2xl flex items-center gap-3 text-gray-800">
                    <Phone className="w-6 sm:w-8 h-6 sm:h-8 text-cyan-600" />
                    Contact Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-cyan-50 to-blue-50 rounded-xl border-l-4 border-cyan-400">
                      <div className="bg-cyan-100 p-3 rounded-full">
                        <Mail className="w-5 h-5 sm:w-6 sm:h-6 text-cyan-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-800 text-sm sm:text-base">Email</h4>
                        <p className="text-gray-600 text-sm sm:text-base">support@greenpathorg.social</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border-l-4 border-green-400">
                      <div className="bg-green-100 p-3 rounded-full">
                        <MapPin className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-800 text-sm sm:text-base">Service Area</h4>
                        <p className="text-gray-600 text-sm sm:text-base">Serving Villages, communities, organizations, and residential complexes nationwide</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-orange-50 to-yellow-50 rounded-xl border-l-4 border-orange-400">
                      <div className="bg-orange-100 p-3 rounded-full">
                        <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-800 text-sm sm:text-base">Response Time</h4>
                        <p className="text-gray-600 text-sm sm:text-base">Within 24 hours during business days</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Why Contact Us Card */}
              <Card className="border-0 shadow-xl bg-gradient-to-br from-cyan-100 to-blue-100 hover:shadow-2xl transition-all duration-500">
                <CardHeader>
                  <CardTitle className="text-xl sm:text-2xl text-gray-800 flex items-center gap-3">
                    <Award className="w-6 sm:w-8 h-6 sm:h-8 text-blue-600" />
                    Why Contact Us?
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="bg-blue-200 p-2 rounded-full mt-1">
                        <CheckCircle className="w-4 h-4 text-blue-700" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-800 text-sm sm:text-base">Community Implementation</h4>
                        <p className="text-gray-700 text-xs sm:text-sm">Get started with GreenPath in your community or organization</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="bg-green-200 p-2 rounded-full mt-1">
                        <CheckCircle className="w-4 h-4 text-green-700" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-800 text-sm sm:text-base">Technical Support</h4>
                        <p className="text-gray-700 text-xs sm:text-sm">Help with platform usage and troubleshooting</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="bg-purple-200 p-2 rounded-full mt-1">
                        <CheckCircle className="w-4 h-4 text-purple-700" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-800 text-sm sm:text-base">Partnership Opportunities</h4>
                        <p className="text-gray-700 text-xs sm:text-sm">Collaborate with us on waste management initiatives</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="bg-orange-200 p-2 rounded-full mt-1">
                        <CheckCircle className="w-4 h-4 text-orange-700" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-800 text-sm sm:text-base">Custom Solutions</h4>
                        <p className="text-gray-700 text-xs sm:text-sm">Tailored waste management solutions for your needs</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
      {/* Implementation Guide Section */}
      <div className="py-12 sm:py-20 px-4 sm:px-6 bg-gradient-to-br from-gray-50 to-stone-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <div className="inline-flex items-center gap-3 bg-white/80 backdrop-blur-sm px-4 sm:px-6 py-3 rounded-full shadow-lg mb-6">
              <ClipboardList className="w-6 sm:w-8 h-6 sm:h-8 text-green-600" />
              <span className="text-xl sm:text-2xl font-bold text-gray-800">Implementation Guide</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 bg-gradient-to-r from-green-600 to-teal-600 bg-clip-text text-transparent">
              Adopting GreenPath in Your Community
            </h2>
            <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto">
              A step-by-step guide for villages, organizations, societies, and residential complexes wanting to adopt GreenPath
            </p>
          </div>

          <div className="space-y-8">
            {/* Requirements */}
            <Card className="border-0 shadow-xl hover:shadow-2xl transition-all duration-300 bg-white/70 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl sm:text-2xl font-bold text-gray-800">
                  Requirements
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-base sm:text-lg text-gray-700">
                  To successfully implement GreenPath in your community or organization, you'll need the following:
                </p>
                <ul className="list-disc list-inside space-y-2">
                  <li className="text-sm sm:text-base text-gray-600">
                    Commitment from administrators and community/organizational leaders
                  </li>
                  <li className="text-sm sm:text-base text-gray-600">
                    Access to smartphones for collectors and managers
                  </li>
                  <li className="text-sm sm:text-base text-gray-600">
                    Basic internet connectivity
                  </li>
                  <li className="text-sm sm:text-base text-gray-600">
                    Willingness of households/units to segregate waste
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Timeline */}
            <Card className="border-0 shadow-xl hover:shadow-2xl transition-all duration-300 bg-white/70 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl sm:text-2xl font-bold text-gray-800">
                  Timeline
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-base sm:text-lg text-gray-700">
                  The implementation process typically takes 2-3 weeks:
                </p>
                <ul className="list-decimal list-inside space-y-2">
                  <li className="text-sm sm:text-base text-gray-600">
                    Week 1-2: Initial consultation and assessment
                  </li>
                  <li className="text-sm sm:text-base text-gray-600">
                    Week 1-2: Training for collectors and managers
                  </li>
                  <li className="text-sm sm:text-base text-gray-600">
                    Week 2-3: Household registration and QR code distribution
                  </li>
                  <li className="text-sm sm:text-base text-gray-600">
                    Week 2-3: Go-live and monitoring
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Training Process */}
            <Card className="border-0 shadow-xl hover:shadow-2xl transition-all duration-300 bg-white/70 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl sm:text-2xl font-bold text-gray-800">
                  Training Process
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-base sm:text-lg text-gray-700">
                  We provide comprehensive training to ensure successful implementation:
                </p>
                <ul className="list-disc list-inside space-y-2">
                  <li className="text-sm sm:text-base text-gray-600">
                    Videos readily available for all users from scratch to master
                  </li>
                  <li className="text-sm sm:text-base text-gray-600">
                    Online Session or on-site training(if possible ) for collectors on waste segregation and QR code scanning
                  </li>
                  <li className="text-sm sm:text-base text-gray-600">
                    Training for managers on using the GreenPath platform
                  </li>
                  <li className="text-sm sm:text-base text-gray-600">
                    Educational materials for households on proper waste segregation
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* FAQ */}
            <Card className="border-0 shadow-xl hover:shadow-2xl transition-all duration-300 bg-white/70 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl sm:text-2xl font-bold text-gray-800">
                  FAQ for Village Administrators
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-semibold text-gray-800">
                    Q: What are the benefits of using GreenPath?
                  </h4>
                  <p className="text-sm sm:text-base text-gray-600">
                    A: GreenPath improves waste management efficiency, promotes transparency, and creates a cleaner environment.
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold text-gray-800">
                    Q: How much does it cost to implement GreenPath?
                  </h4>
                  <p className="text-sm sm:text-base text-gray-600">
                    A: The cost varies depending on the size of your community or organization. Contact us for a customized quote.
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold text-gray-800">
                    Q: What kind of support do you provide?
                  </h4>
                  <p className="text-sm sm:text-base text-gray-600">
                    A: We offer training, technical support, and ongoing monitoring to ensure the success of GreenPath in your community or organization.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-white">
      {/* Fixed Navigation Bar - Mobile-First Design */}
      <nav className="bg-white/95 backdrop-blur-md shadow-lg border-b border-green-100 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 sm:h-20">
            {/* Logo */}
            <div className="relative">
              <div className="p-2">
                <img src="/logos/logo-full.svg" alt="GreenPath" className="w-auto sm:h-12 h-10" />
              </div>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex space-x-2">
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => navigateToSection(section.id)}
                  className={`relative flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold transition-all duration-300 transform hover:scale-105 ${activeSection === section.id
                    ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg"
                    : "text-gray-600 hover:text-green-600 hover:bg-green-50"
                    }`}
                >
                  {section.icon}
                  {section.label}
                  {activeSection === section.id && (
                    <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full opacity-20 animate-pulse"></div>
                  )}
                </button>
              ))}
            </div>

            {/* Mobile Menu Button and Login */}
            <div className="flex items-center gap-3">
              {window.location.pathname !== "/login" && (
                <Button
                  onClick={() => window.location.href = "/login"}
                  size="sm"
                  className="bg-gradient-to-r from-green-500 to-green-800 hover:from-blue-600 hover:to-purple-700 text-white font-semibold px-4 sm:px-6 py-2 sm:py-3 rounded-full shadow-lg transform hover:scale-105 transition-all duration-300"
                >
                  <LogIn className="w-4 h-4 mr-1 sm:mr-2" />
                  <span className="">Login</span>
                </Button>
              )}

              {/* Mobile Hamburger Menu */}
              <div className="lg:hidden">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveSection(activeSection === "menu" ? "home" : "menu")}
                  className="px-2 bg-gradient-to-r from-green-500 to-green-800 hover:from-blue-600 text-white font-semibold"
                >
                  <Menu className="w-6 h-6 mr-1 sm:mr-2" strokeWidth={3} />
                </Button>
              </div>
            </div>
          </div>

          {/* Mobile Menu Dropdown */}
          {activeSection === "menu" && (
            <div className="lg:hidden absolute top-full right-4 w-60 border border-gray-200 bg-white/90 backdrop-blur-sm rounded-xl z-50 shadow-lg">
              <div className="py-4 space-y-2">
                {sections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => navigateToSection(section.id)}
                    className="w-full flex items-center gap-3 py-1 px-5 text-left text-black hover:bg-green-50 hover:text-green-600 transition-colors rounded-lg"
                  >
                    {section.icon}
                    {section.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {(activeSection === "home" || activeSection === "menu") && renderHomeSection()}
        {activeSection === "about" && renderAboutSection()}
        {/* {activeSection === "learn" && renderLearnSection()} */}
        {activeSection === "feedback" && renderFeedbackSection()}
        {activeSection === "contact" && renderContactSection()}
        {activeSection === "pricing" && <Pricing isStandalone={false} onContactClick={() => navigateToSection("contact")} />}
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
              <a
                href="/privacy-policy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-500 hover:text-green-600 transition-colors underline"
              >
                Privacy Policy
              </a>
              <a
                href="/terms-of-service"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-500 hover:text-green-600 transition-colors underline"
              >
                Terms of Service
              </a>
              <a
                href="/data-protection"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-500 hover:text-green-600 transition-colors underline"
              >
                Data Protection
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}