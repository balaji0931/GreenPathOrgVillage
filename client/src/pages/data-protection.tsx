import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Mail,
  Globe,
} from "lucide-react";
import { useLocation } from "wouter";

export default function DataProtection() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => setLocation("/")}
            className="hover:bg-white text-slate-600 flex items-center bg-green-100"
          >
            <ArrowLeft className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Back to Home</span>
          </Button>

          <div className="text-right">
            <div className="flex items-center justify-end gap-2 mb-1">
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
                Data Protection Policy
              </h1>
            </div>
            <p className="text-sm text-slate-500">Last updated: 2026</p>
          </div>
        </div>

        <div className="space-y-6">
          <Card className="border-none shadow-sm bg-white overflow-hidden">
            <CardContent className="p-8 prose prose-slate max-w-none">
              <p className="text-slate-700 leading-relaxed mb-6">
                This Data Protection Policy describes the technical and
                organizational measures adopted by GreenPath to protect data
                processed on its platform.
                <br />
                GreenPath provides a digital waste management platform for
                Organizations such as Panchayats, NGOs, municipalities, and
                institutions (“Organizations”). GreenPath operates as a data
                processor, processing information on behalf of Organizations,
                which act as data controllers.
              </p>

              <div className="space-y-10">
                <section>
                  <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-3">
                    <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-green-100 text-green-700 text-sm">
                      1
                    </span>
                    Purpose of This Policy
                  </h2>
                  <p className="text-slate-600 mb-3">
                    The purpose of this policy is to:
                  </p>
                  <ul className="list-none space-y-1 text-slate-600 ml-4 mb-4">
                    <li className="flex gap-2">
                      <span className="text-green-500 font-bold">*</span>{" "}
                      Protect personal and operational data processed on the
                      GreenPath platform
                    </li>
                    <li className="flex gap-2">
                      <span className="text-green-500 font-bold">*</span> Define
                      safeguards against unauthorized access, misuse, loss, or
                      disclosure
                    </li>
                    <li className="flex gap-2">
                      <span className="text-green-500 font-bold">*</span>{" "}
                      Clarify GreenPath’s responsibilities as a platform
                      provider
                    </li>
                  </ul>
                  <p className="text-slate-600">
                    This policy applies to all data processed through the
                    GreenPath application, website, and supporting
                    infrastructure.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-3">
                    <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-green-100 text-green-700 text-sm">
                      2
                    </span>
                    Data Protection Principles
                  </h2>
                  <p className="text-slate-600 mb-3">
                    GreenPath follows these core principles:
                  </p>
                  <ul className="list-none space-y-2 text-slate-600 ml-4">
                    <li className="flex gap-2">
                      <span className="text-slate-400 font-bold">*</span>{" "}
                      Purpose limitation: Data is processed only to deliver
                      platform functionality
                    </li>
                    <li className="flex gap-2">
                      <span className="text-slate-400 font-bold">*</span> Data
                      minimization: Only data required for waste management
                      operations is processed
                    </li>
                    <li className="flex gap-2">
                      <span className="text-slate-400 font-bold">*</span> Access
                      limitation: Data is accessible only to authorized users
                      based on role
                    </li>
                    <li className="flex gap-2">
                      <span className="text-slate-400 font-bold">*</span>{" "}
                      Security by design: Protection is integrated into platform
                      architecture
                    </li>
                    <li className="flex gap-2">
                      <span className="text-slate-400 font-bold">*</span>{" "}
                      Accountability: Processing is aligned with Organization
                      instructions
                    </li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-3">
                    <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-green-100 text-green-700 text-sm">
                      3
                    </span>
                    Role-Based Access Control
                  </h2>
                  <p className="text-slate-600 mb-3">
                    GreenPath enforces least-privilege, role-based access,
                    including:
                  </p>
                  <ul className="list-none space-y-2 text-slate-600 ml-4 mb-4">
                    <li className="flex gap-2">
                      <span className="text-slate-400 font-bold">*</span>{" "}
                      Organizations control user creation and role assignment
                    </li>
                    <li className="flex gap-2">
                      <span className="text-slate-400 font-bold">*</span>{" "}
                      Managers access household-level data only for assigned
                      villages
                    </li>
                    <li className="flex gap-2">
                      <span className="text-slate-400 font-bold">*</span>{" "}
                      Collectors access only the information required for
                      collection activities
                    </li>
                    <li className="flex gap-2">
                      <span className="text-slate-400 font-bold">*</span> Field
                      workers can enter household data but do not retain access
                      after mapping
                    </li>
                    <li className="flex gap-2">
                      <span className="text-slate-400 font-bold">*</span>{" "}
                      Households can view only their own data and collection
                      history
                    </li>
                    <li className="flex gap-2">
                      <span className="text-slate-400 font-bold">*</span>{" "}
                      GreenPath administrators access aggregated and operational
                      data only, not household-level personal data through
                      dashboards
                    </li>
                  </ul>
                  <p className="text-slate-600">
                    This structure ensures that personal data is visible
                    strictly on a need-to-know basis.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-3">
                    <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-green-100 text-green-700 text-sm">
                      4
                    </span>
                    Authentication & Account Security
                  </h2>
                  <p className="text-slate-600 mb-3">
                    GreenPath implements multiple account security measures:
                  </p>
                  <ul className="list-none space-y-1 text-slate-600 ml-4 mb-4">
                    <li className="flex gap-2">
                      <span className="text-slate-400">*</span> Unique user IDs
                      for all platform users
                    </li>
                    <li className="flex gap-2">
                      <span className="text-slate-400">*</span>{" "}
                      Password-protected accounts
                    </li>
                    <li className="flex gap-2">
                      <span className="text-slate-400">*</span> Mandatory
                      password change after first login
                    </li>
                    <li className="flex gap-2">
                      <span className="text-slate-400">*</span> Role-based
                      password reset permissions
                    </li>
                    <li className="flex gap-2">
                      <span className="text-slate-400">*</span> Encrypted login
                      sessions (HTTPS)
                    </li>
                  </ul>
                  <p className="text-slate-600">
                    GreenPath is transitioning to OTP-based authentication to
                    further strengthen account security.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-3">
                    <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-green-100 text-green-700 text-sm">
                      5
                    </span>
                    Infrastructure & Secure Storage
                  </h2>
                  <p className="text-slate-600 mb-3 font-medium">
                    GreenPath uses reputable third-party cloud service providers
                    for:
                  </p>
                  <ul className="list-none space-y-1 text-slate-600 ml-4 mb-4">
                    <li className="flex gap-2">
                      <span className="text-slate-400">*</span> Application
                      hosting
                    </li>
                    <li className="flex gap-2">
                      <span className="text-slate-400">*</span> Database storage
                    </li>
                    <li className="flex gap-2">
                      <span className="text-slate-400">*</span> Image and audio
                      storage
                    </li>
                  </ul>
                  <p className="text-slate-600 mb-3">
                    Security measures include:
                  </p>
                  <ul className="list-none space-y-1 text-slate-600 ml-4 mb-4">
                    <li className="flex gap-2">
                      <span className="text-slate-400">*</span> Secure data
                      centers
                    </li>
                    <li className="flex gap-2">
                      <span className="text-slate-400">*</span> Network-level
                      protections
                    </li>
                    <li className="flex gap-2">
                      <span className="text-slate-400">*</span> Restricted
                      administrative access
                    </li>
                    <li className="flex gap-2">
                      <span className="text-slate-400">*</span> Logical
                      separation of organization data
                    </li>
                  </ul>
                  <p className="text-slate-600">
                    GreenPath does not operate public or open-access databases.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-3">
                    <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-green-100 text-green-700 text-sm">
                      6
                    </span>
                    Images, Audio & User-Generated Content
                  </h2>
                  <ul className="list-none space-y-2 text-slate-600 ml-4 mb-4">
                    <li className="flex gap-2">
                      <span className="text-slate-400 font-bold">*</span> Images
                      and audio files are uploaded only by authorized
                      Organization users
                    </li>
                    <li className="flex gap-2">
                      <span className="text-slate-400 font-bold">*</span>{" "}
                      Content is stored securely and linked to the relevant
                      collection records
                    </li>
                    <li className="flex gap-2">
                      <span className="text-slate-400 font-bold">*</span>{" "}
                      GreenPath does not routinely view, listen to, or analyze
                      such content
                    </li>
                    <li className="flex gap-2">
                      <span className="text-slate-400 font-bold">*</span> Only
                      basic file validations (type and size) are performed
                      before storage
                    </li>
                  </ul>
                  <p className="text-slate-600 leading-relaxed">
                    Any responsibility for the content captured rests with the
                    Organization and its authorized users.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-3">
                    <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-green-100 text-green-700 text-sm">
                      7
                    </span>
                    Location Data Protection
                  </h2>
                  <ul className="list-none space-y-2 text-slate-600 ml-4 mb-4">
                    <li className="flex gap-2">
                      <span className="text-slate-400 font-bold">*</span> GPS
                      location data is captured only if enabled by the
                      Organization
                    </li>
                    <li className="flex gap-2">
                      <span className="text-slate-400 font-bold">*</span>{" "}
                      Location is typically collected during household mapping
                      or collection activities
                    </li>
                    <li className="flex gap-2">
                      <span className="text-slate-400 font-bold">*</span> Data
                      is used solely for route visualization, coverage analysis,
                      and reporting
                    </li>
                    <li className="flex gap-2">
                      <span className="text-slate-400 font-bold">*</span>{" "}
                      GreenPath does not perform continuous or background
                      tracking
                    </li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-3">
                    <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-green-100 text-green-700 text-sm">
                      8
                    </span>
                    Data Retention & Deletion
                  </h2>
                  <ul className="list-none space-y-2 text-slate-600 ml-4 mb-4">
                    <li className="flex gap-2">
                      <span className="text-slate-400 font-bold">*</span> Data
                      remains stored while an Organization actively uses
                      GreenPath
                    </li>
                    <li className="flex gap-2">
                      <span className="text-slate-400 font-bold">*</span>{" "}
                      Organizations may delete individual household records
                      based on internal policies
                    </li>
                    <li className="flex gap-2">
                      <span className="text-slate-400 font-bold">*</span> Upon
                      permanent service discontinuation, data is deleted or
                      returned as agreed
                    </li>
                    <li className="flex gap-2">
                      <span className="text-slate-400 font-bold">*</span>{" "}
                      Temporary suspension (such as for non-payment) does not
                      trigger data deletion
                    </li>
                  </ul>
                  <p className="text-slate-600">
                    GreenPath does not delete operational data without
                    Organization instruction, except where required by law.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-3">
                    <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-green-100 text-green-700 text-sm">
                      9
                    </span>
                    Third-Party Service Providers
                  </h2>
                  <p className="text-slate-600 mb-3">
                    GreenPath may engage trusted third-party service providers
                    for:
                  </p>
                  <ul className="list-none space-y-1 text-slate-600 ml-4 mb-4">
                    <li className="flex gap-2">
                      <span className="text-slate-400">*</span> Hosting and
                      infrastructure
                    </li>
                    <li className="flex gap-2">
                      <span className="text-slate-400">*</span> Storage services
                    </li>
                    <li className="flex gap-2">
                      <span className="text-slate-400">*</span> Mapping and
                      visualization
                    </li>
                    <li className="flex gap-2">
                      <span className="text-slate-400">*</span> Messaging and
                      payment processing (where enabled)
                    </li>
                  </ul>
                  <p className="text-slate-600 mb-3">Such providers:</p>
                  <ul className="list-none space-y-1 text-slate-600 ml-4">
                    <li className="flex gap-2">
                      <span className="text-slate-400">*</span> Process data
                      only on GreenPath’s instructions
                    </li>
                    <li className="flex gap-2">
                      <span className="text-slate-400">*</span> Are selected
                      based on security and reliability standards
                    </li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-3">
                    <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-green-100 text-green-700 text-sm">
                      10
                    </span>
                    Incident Response & Breach Management
                  </h2>
                  <p className="text-slate-600 mb-3">
                    GreenPath maintains procedures to:
                  </p>
                  <ul className="list-none space-y-1 text-slate-600 ml-4 mb-4">
                    <li className="flex gap-2">
                      <span className="text-slate-400">*</span> Detect and
                      respond to security incidents
                    </li>
                    <li className="flex gap-2">
                      <span className="text-slate-400">*</span> Limit impact and
                      prevent recurrence
                    </li>
                    <li className="flex gap-2">
                      <span className="text-slate-400">*</span> Notify affected
                      Organizations where appropriate
                    </li>
                  </ul>
                  <p className="text-slate-600 leading-relaxed font-medium">
                    Organizations are responsible for any further notifications
                    required under applicable law.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-3">
                    <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-green-100 text-green-700 text-sm">
                      11
                    </span>
                    Monitoring & Improvements
                  </h2>
                  <p className="text-slate-600 mb-3 italic font-medium">
                    GreenPath:
                  </p>
                  <ul className="list-none space-y-2 text-slate-600 ml-4 mb-4">
                    <li className="flex gap-2">
                      <span className="text-slate-400 font-bold">*</span>{" "}
                      Regularly reviews access controls and platform
                      configurations
                    </li>
                    <li className="flex gap-2">
                      <span className="text-slate-400 font-bold">*</span>{" "}
                      Applies security updates and patches
                    </li>
                    <li className="flex gap-2">
                      <span className="text-slate-400 font-bold">*</span>{" "}
                      Improves safeguards as technology and risk profiles evolve
                    </li>
                  </ul>
                  <p className="text-slate-600 leading-relaxed">
                    Security is treated as an ongoing process, not a one-time
                    setup.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-3">
                    <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-green-100 text-green-700 text-sm">
                      12
                    </span>
                    Responsibilities of Organizations
                  </h2>
                  <p className="text-slate-600 mb-3 font-medium">
                    Organizations using GreenPath are responsible for:
                  </p>
                  <ul className="list-none space-y-2 text-slate-600 ml-4 mb-4">
                    <li className="flex gap-2">
                      <span className="text-slate-400 font-bold">*</span> Lawful
                      data collection and consent
                    </li>
                    <li className="flex gap-2">
                      <span className="text-slate-400 font-bold">*</span> User
                      training and access control
                    </li>
                    <li className="flex gap-2">
                      <span className="text-slate-400 font-bold">*</span>{" "}
                      Defining data retention and deletion policies
                    </li>
                    <li className="flex gap-2">
                      <span className="text-slate-400 font-bold">*</span> Using
                      platform features responsibly
                    </li>
                  </ul>
                  <p className="text-slate-600">
                    GreenPath provides the technical framework but does not
                    control how Organizations enforce policies or actions.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-3">
                    <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-green-100 text-green-700 text-sm">
                      13
                    </span>
                    Changes to This Policy
                  </h2>
                  <p className="text-slate-600 leading-relaxed">
                    This Data Protection Policy may be updated to reflect legal,
                    technical, or operational changes. Revisions will be
                    published through the GreenPath platform or website.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-3">
                    <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-green-100 text-green-700 text-sm">
                      14
                    </span>
                    Contact Information
                  </h2>
                  <p className="text-slate-600 mb-3">
                    For questions related to data protection or security
                    practices:
                  </p>
                  <div className="space-y-1 text-slate-700">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-slate-400" />
                      <span>Email: info@greenpathindia.in</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-slate-400" />
                      <span>Website: https://www.greenpathindia.in</span>
                    </div>
                  </div>
                </section>
              </div>
            </CardContent>
          </Card>
          <div className="text-center pb-8">
            <p className="text-xs text-slate-400 uppercase tracking-tighter">
              GreenPath Data Security © 2026
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
