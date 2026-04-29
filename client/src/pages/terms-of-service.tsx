import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Mail,
  Globe,
} from "lucide-react";
import { useLocation } from "wouter";

export default function TermsOfService() {
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
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
              Terms of Service
            </h1>
            <p className="text-sm text-slate-500 mt-1">Last updated: 2026</p>
          </div>
        </div>

        <div className="space-y-6">
          <Card className="border-none shadow-sm bg-white overflow-hidden">
            <CardContent className="p-8 prose prose-slate max-w-none">
              <p className="text-slate-700 leading-relaxed mb-6">
                These Terms of Service (“Terms”) govern access to and use of the
                GreenPath platform, website, and applications (“Platform”).
                <br />
                By accessing or using GreenPath, the Organization agrees to be
                bound by these Terms.
              </p>

              <div className="space-y-10">
                <section>
                  <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-3">
                    <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-100 text-blue-700 text-sm">
                      1
                    </span>
                    About GreenPath
                  </h2>
                  <p className="text-slate-600 leading-relaxed">
                    GreenPath provides a digital waste management platform
                    designed for Organizations, including Panchayats, NGOs,
                    municipalities, and institutions.
                    <br />
                    GreenPath is a business-to-business (B2B) platform and is
                    not intended for direct consumer use.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-3">
                    <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-100 text-blue-700 text-sm">
                      2
                    </span>
                    Definitions
                  </h2>
                  <ul className="list-none space-y-2 text-slate-600 ml-4">
                    <li className="flex gap-2">
                      <span className="text-blue-500 font-bold">*</span>
                      <span>
                        “Organization” means the entity that subscribes to and
                        uses the GreenPath platform.
                      </span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-blue-500 font-bold">*</span>
                      <span>
                        “Users” means individuals authorized by the
                        Organization, including managers, moderators,
                        collectors, field workers, and households.
                      </span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-blue-500 font-bold">*</span>
                      <span>
                        “Households” means residents whose waste collection data
                        is managed by the Organization using GreenPath.
                      </span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-blue-500 font-bold">*</span>
                      <span>
                        “GreenPath” means the platform provider and technology
                        service.
                      </span>
                    </li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-3">
                    <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-100 text-blue-700 text-sm">
                      3
                    </span>
                    Eligibility & Authority
                  </h2>
                  <p className="text-slate-600 mb-3">
                    By using GreenPath, the Organization represents that:
                  </p>
                  <ul className="list-none space-y-2 text-slate-600 ml-4 mb-4">
                    <li className="flex gap-2">
                      <span className="text-slate-400 font-bold">*</span> It has
                      the legal authority to enter into these Terms
                    </li>
                    <li className="flex gap-2">
                      <span className="text-slate-400 font-bold">*</span> It is
                      authorized to collect, process, and manage data entered
                      into the Platform
                    </li>
                    <li className="flex gap-2">
                      <span className="text-slate-400 font-bold">*</span> It
                      will use GreenPath only for lawful waste management
                      purposes
                    </li>
                  </ul>
                  <p className="text-slate-600 italic">
                    GreenPath does not verify household eligibility or
                    authority.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-3">
                    <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-100 text-blue-700 text-sm">
                      4
                    </span>
                    Role of GreenPath
                  </h2>
                  <p className="text-slate-600 mb-3 font-medium">
                    GreenPath acts as:
                  </p>
                  <ul className="list-none space-y-1 text-slate-600 ml-4 mb-4">
                    <li className="flex gap-2">
                      <span className="text-slate-400">*</span> A technology
                      platform provider
                    </li>
                    <li className="flex gap-2">
                      <span className="text-slate-400">*</span> A data processor
                      processing information on behalf of the Organization
                    </li>
                  </ul>
                  <p className="text-slate-600 mb-3 font-medium italic">
                    GreenPath:
                  </p>
                  <ul className="list-none space-y-1 text-slate-600 ml-4 mb-4">
                    <li className="flex gap-2">
                      <span className="text-slate-400">*</span> Does not
                      independently collect household consent
                    </li>
                    <li className="flex gap-2">
                      <span className="text-slate-400">*</span> Does not enforce
                      penalties or actions
                    </li>
                    <li className="flex gap-2">
                      <span className="text-slate-400">*</span> Does not make
                      policy or governance decisions
                    </li>
                  </ul>
                  <p className="text-slate-600 leading-relaxed font-bold">
                    All decisions and actions are taken by the Organization.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-3">
                    <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-100 text-blue-700 text-sm">
                      5
                    </span>
                    Organization Responsibilities
                  </h2>
                  <p className="text-slate-600 mb-3 font-medium">
                    The Organization is solely responsible for:
                  </p>
                  <ul className="list-none space-y-2 text-slate-600 ml-4 mb-4">
                    <li className="flex gap-2">
                      <span className="text-slate-400 font-bold">*</span> Lawful
                      data collection and consent
                    </li>
                    <li className="flex gap-2">
                      <span className="text-slate-400 font-bold">*</span>{" "}
                      Accuracy of data entered into the Platform
                    </li>
                    <li className="flex gap-2">
                      <span className="text-slate-400 font-bold">*</span>{" "}
                      Training and supervision of its Users
                    </li>
                    <li className="flex gap-2">
                      <span className="text-slate-400 font-bold">*</span>{" "}
                      Configuration of platform features
                    </li>
                    <li className="flex gap-2">
                      <span className="text-slate-400 font-bold">*</span>{" "}
                      Defining rules for flags, ratings, fines, or actions
                    </li>
                    <li className="flex gap-2">
                      <span className="text-slate-400 font-bold">*</span>{" "}
                      Compliance with applicable laws and regulations
                    </li>
                  </ul>
                  <p className="text-slate-600 font-medium italic">
                    GreenPath is not responsible for misuse of the Platform by
                    Organization users.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-3">
                    <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-100 text-blue-700 text-sm">
                      6
                    </span>
                    User Accounts & Access
                  </h2>
                  <ul className="list-none space-y-2 text-slate-600 ml-4 mb-4">
                    <li className="flex gap-2">
                      <span className="text-slate-400 font-bold">*</span> User
                      accounts are created and managed by the Organization
                    </li>
                    <li className="flex gap-2">
                      <span className="text-slate-400 font-bold">*</span>{" "}
                      Initial credentials may be temporary and must be changed
                      upon first login
                    </li>
                    <li className="flex gap-2">
                      <span className="text-slate-400 font-bold">*</span> Users
                      are responsible for maintaining credential confidentiality
                    </li>
                    <li className="flex gap-2">
                      <span className="text-slate-400 font-bold">*</span> The
                      Organization is responsible for actions performed under
                      its accounts
                    </li>
                  </ul>
                  <p className="text-slate-600 italic">
                    GreenPath may suspend access if misuse or security risks are
                    detected.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-3">
                    <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-100 text-blue-700 text-sm">
                      7
                    </span>
                    Platform Features & Automation
                  </h2>
                  <p className="text-slate-600 mb-3 italic font-medium">
                    GreenPath may provide:
                  </p>
                  <ul className="list-none space-y-1 text-slate-600 ml-4 mb-4">
                    <li className="flex gap-2">
                      <span className="text-slate-400">*</span> Automated
                      reports and analytics
                    </li>
                    <li className="flex gap-2">
                      <span className="text-slate-400">*</span> Rule-based flags
                      configured by the Organization
                    </li>
                    <li className="flex gap-2">
                      <span className="text-slate-400">*</span> Dashboards and
                      summaries
                    </li>
                  </ul>
                  <p className="text-slate-600 leading-relaxed font-bold">
                    These outputs are informational only. GreenPath does not
                    validate, enforce, or act upon them.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-3">
                    <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-100 text-blue-700 text-sm">
                      8
                    </span>
                    Images, Audio & User-Generated Content
                  </h2>
                  <p className="text-slate-600 mb-4 leading-relaxed">
                    Users may upload images, audio, or remarks as part of
                    Platform usage.
                  </p>
                  <p className="text-slate-600 mb-3 font-medium italic">
                    The Organization:
                  </p>
                  <ul className="list-none space-y-1 text-slate-600 ml-4 mb-4">
                    <li className="flex gap-2">
                      <span className="text-slate-400">*</span> Is responsible
                      for content uploaded by its Users
                    </li>
                    <li className="flex gap-2">
                      <span className="text-slate-400">*</span> Ensures content
                      is lawful and appropriate
                    </li>
                  </ul>
                  <p className="text-slate-600 mb-3 font-medium italic">
                    GreenPath:
                  </p>
                  <ul className="list-none space-y-1 text-slate-600 ml-4">
                    <li className="flex gap-2">
                      <span className="text-slate-400">*</span> Does not
                      routinely review or monitor such content
                    </li>
                    <li className="flex gap-2">
                      <span className="text-slate-400">*</span> Is not liable
                      for user-generated content
                    </li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-3">
                    <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-100 text-blue-700 text-sm">
                      9
                    </span>
                    Payments, Fees & Commercial Terms
                  </h2>
                  <ul className="list-none space-y-2 text-slate-600 ml-4 mb-4">
                    <li className="flex gap-2">
                      <span className="text-slate-400 font-bold">*</span>{" "}
                      GreenPath services are provided on a paid subscription
                      basis, unless otherwise agreed
                    </li>
                    <li className="flex gap-2">
                      <span className="text-slate-400 font-bold">*</span>{" "}
                      Subscription duration, scope, and fees are agreed
                      separately (e.g., invoice, agreement, or proposal)
                    </li>
                    <li className="flex gap-2">
                      <span className="text-slate-400 font-bold">*</span> Fees
                      are payable by the Organization, not households
                    </li>
                  </ul>
                  <p className="text-slate-600 mb-3 font-medium uppercase tracking-tight text-xs text-blue-600">
                    Non-payment:
                  </p>
                  <ul className="list-none space-y-1 text-slate-600 ml-4 mb-4">
                    <li className="flex gap-2">
                      <span className="text-red-500 font-bold">*</span> May
                      result in temporary suspension of Platform access
                    </li>
                    <li className="flex gap-2">
                      <span className="text-red-500 font-bold">*</span> Does not
                      automatically result in data deletion
                    </li>
                  </ul>
                  <p className="text-slate-600 italic">
                    Refunds, if any, are subject to separate written agreement.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-3">
                    <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-100 text-blue-700 text-sm">
                      10
                    </span>
                    Household Payments & Fines (Where Enabled)
                  </h2>
                  <p className="text-slate-600 mb-3 italic font-medium">
                    Where the Platform enables:
                  </p>
                  <ul className="list-none space-y-1 text-slate-600 ml-4 mb-4">
                    <li className="flex gap-2">
                      <span className="text-slate-400">*</span> Household fees
                    </li>
                    <li className="flex gap-2">
                      <span className="text-slate-400">*</span> Fines
                    </li>
                    <li className="flex gap-2">
                      <span className="text-slate-400">*</span> Online payments
                    </li>
                  </ul>
                  <p className="text-slate-600 mb-3 font-medium italic">
                    The Organization:
                  </p>
                  <ul className="list-none space-y-1 text-slate-600 ml-4 mb-4">
                    <li className="flex gap-2">
                      <span className="text-slate-400">*</span> Decides
                      criteria, amounts, and enforcement
                    </li>
                    <li className="flex gap-2">
                      <span className="text-slate-400">*</span> Is the sole
                      beneficiary of collected funds
                    </li>
                  </ul>
                  <p className="text-slate-600 mb-3 font-medium italic">
                    GreenPath:
                  </p>
                  <ul className="list-none space-y-1 text-slate-600 ml-4">
                    <li className="flex gap-2">
                      <span className="text-slate-400">*</span> Acts only as a
                      technical facilitator
                    </li>
                    <li className="flex gap-2">
                      <span className="text-slate-400">*</span> Does not
                      determine penalties
                    </li>
                    <li className="flex gap-2">
                      <span className="text-slate-400">*</span> Does not assume
                      liability for collections
                    </li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-3">
                    <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-100 text-blue-700 text-sm">
                      11
                    </span>
                    Data Ownership & Use
                  </h2>
                  <ul className="list-none space-y-2 text-slate-600 ml-4">
                    <li className="flex gap-2">
                      <span className="text-slate-400 font-bold">*</span> Data
                      entered into GreenPath remains under the control of the
                      Organization
                    </li>
                    <li className="flex gap-2">
                      <span className="text-slate-400 font-bold">*</span>{" "}
                      GreenPath processes data solely to provide Platform
                      services
                    </li>
                    <li className="flex gap-2">
                      <span className="text-slate-400 font-bold">*</span>{" "}
                      GreenPath may access data only upon Organization
                      instruction, such as for generating additional reports
                    </li>
                  </ul>
                  <p className="mt-4 text-slate-600 leading-relaxed font-bold">
                    GreenPath does not sell or commercially exploit Organization
                    data.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-3">
                    <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-100 text-blue-700 text-sm">
                      12
                    </span>
                    Suspension & Termination
                  </h2>
                  <p className="text-slate-600 mb-3 font-medium italic">
                    GreenPath may:
                  </p>
                  <ul className="list-none space-y-1 text-slate-600 ml-4 mb-4">
                    <li className="flex gap-2">
                      <span className="text-red-500 font-bold">*</span> Suspend
                      access for security, misuse, or contractual reasons
                    </li>
                  </ul>
                  <p className="text-slate-600 mb-3 font-medium italic">
                    Upon permanent termination:
                  </p>
                  <ul className="list-none space-y-1 text-slate-600 ml-4 mb-4">
                    <li className="flex gap-2">
                      <span className="text-slate-400">*</span> Data will be
                      deleted or returned as agreed with the Organization
                    </li>
                  </ul>
                  <p className="text-slate-600 leading-relaxed">
                    Temporary suspension does not affect data retention.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-3">
                    <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-100 text-blue-700 text-sm">
                      13
                    </span>
                    Intellectual Property
                  </h2>
                  <ul className="list-none space-y-2 text-slate-600 ml-4 mb-4">
                    <li className="flex gap-2">
                      <span className="text-slate-400 font-bold">*</span>{" "}
                      GreenPath retains all rights to the Platform, software,
                      and branding
                    </li>
                    <li className="flex gap-2">
                      <span className="text-slate-400 font-bold">*</span>{" "}
                      Organizations receive a limited, non-transferable right to
                      use the Platform
                    </li>
                    <li className="flex gap-2">
                      <span className="text-slate-400 font-bold">*</span> No
                      ownership rights are transferred
                    </li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-3">
                    <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-100 text-blue-700 text-sm">
                      14
                    </span>
                    Limitation of Liability
                  </h2>
                  <p className="text-slate-600 mb-3 italic font-medium">
                    To the maximum extent permitted by law:
                  </p>
                  <ul className="list-none space-y-2 text-slate-600 ml-4 mb-4">
                    <li className="flex gap-2">
                      <span className="text-slate-400 font-bold">*</span>{" "}
                      GreenPath is not liable for indirect, incidental, or
                      consequential damages
                    </li>
                    <li className="flex gap-2">
                      <span className="text-slate-400 font-bold">*</span>{" "}
                      GreenPath is not responsible for decisions, enforcement
                      actions, or penalties taken by Organizations
                    </li>
                    <li className="flex gap-2">
                      <span className="text-slate-400 font-bold">*</span>{" "}
                      GreenPath is not liable for data accuracy entered by Users
                    </li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-3">
                    <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-100 text-blue-700 text-sm">
                      15
                    </span>
                    Indemnification
                  </h2>
                  <p className="text-slate-600 mb-3 font-medium">
                    The Organization agrees to indemnify and hold harmless
                    GreenPath from claims arising out of:
                  </p>
                  <ul className="list-none space-y-1 text-slate-600 ml-4 mb-4">
                    <li className="flex gap-2">
                      <span className="text-slate-400">*</span> Unlawful data
                      collection
                    </li>
                    <li className="flex gap-2">
                      <span className="text-slate-400">*</span> Misuse of the
                      Platform
                    </li>
                    <li className="flex gap-2">
                      <span className="text-slate-400">*</span> Actions taken
                      against households or users
                    </li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-3">
                    <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-100 text-blue-700 text-sm">
                      16
                    </span>
                    Modifications to the Platform or Terms
                  </h2>
                  <p className="text-slate-600 mb-3 italic font-medium">
                    GreenPath may update:
                  </p>
                  <ul className="list-none space-y-1 text-slate-600 ml-4 mb-4">
                    <li className="flex gap-2">
                      <span className="text-slate-400">*</span> Platform
                      features
                    </li>
                    <li className="flex gap-2">
                      <span className="text-slate-400">*</span> These Terms
                    </li>
                  </ul>
                  <p className="text-slate-600 leading-relaxed">
                    Updates will be communicated via the Platform or website.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-3">
                    <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-100 text-blue-700 text-sm">
                      17
                    </span>
                    Governing Law & Jurisdiction
                  </h2>
                  <p className="text-slate-600 mb-2 leading-relaxed font-bold">
                    These Terms are governed by the laws of India.
                  </p>
                  <p className="text-slate-600 leading-relaxed font-bold">
                    Courts in India shall have exclusive jurisdiction.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-3">
                    <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-100 text-blue-700 text-sm">
                      18
                    </span>
                    Contact Information
                  </h2>
                  <p className="text-slate-600 mb-3">
                    For questions regarding these Terms:
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
          <div className="text-right pb-8">
            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">
              GreenPath Platform Terms © 2026
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
