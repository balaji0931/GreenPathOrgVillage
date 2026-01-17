import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Shield, Mail, Globe } from "lucide-react";
import { useLocation } from "wouter";

export default function PrivacyPolicy() {
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
              Privacy Policy
            </h1>
            <p className="text-sm text-slate-500 mt-1">Last updated: 2026</p>
          </div>
        </div>

        <div className="space-y-6">
          <Card className="border-none shadow-sm bg-white overflow-hidden">
            <CardContent className="p-8 prose prose-slate max-w-none">
              <p className="text-slate-700 leading-relaxed mb-8">
                GreenPath (“GreenPath”, “we”, “our”, or “us”) provides a digital
                waste management platform designed for Organizations such as
                Panchayats, NGOs, municipalities, and institutions
                (“Organizations”).
                <br />
                This Privacy Policy explains how information is processed when
                Organizations use the GreenPath platform.
                <br />
                GreenPath is a business-to-business (B2B) platform. We do not
                directly onboard or communicate with individual households.
              </p>

              <div className="space-y-10">
                <section>
                  <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-3">
                    <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-green-100 text-green-700 text-sm">
                      1
                    </span>
                    Roles & Responsibilities
                  </h2>
                  <ul className="list-none space-y-3 text-slate-600 pl-0">
                    <li className="flex gap-2">
                      <span className="text-green-500 font-bold">*</span>
                      <span>
                        Organizations using GreenPath act as Data Controllers.
                        They decide what data is collected, how it is used, and
                        for what purpose.
                      </span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-green-500 font-bold">*</span>
                      <span>
                        GreenPath acts as a Data Processor, processing data only
                        on documented instructions from the Organization to
                        provide the platform and related services.
                      </span>
                    </li>
                  </ul>
                  <p className="mt-4 text-slate-600">
                    Households, collectors, field workers, managers, and
                    moderators access GreenPath under the authority of their
                    Organization.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-3">
                    <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-green-100 text-green-700 text-sm">
                      2
                    </span>
                    Information Processed on the Platform
                  </h2>
                  <p className="mb-4 text-slate-600 italic">
                    Depending on how an Organization configures GreenPath, the
                    platform may process the following categories of
                    information:
                  </p>

                  <div className="space-y-6">
                    <div>
                      <h3 className="font-bold text-slate-800 mb-2">
                        a) Household Information
                      </h3>
                      <p className="text-sm text-slate-500 mb-2">
                        Collected and entered by Organization-authorized field
                        workers:
                      </p>
                      <ul className="list-none space-y-1 text-slate-600 ml-4">
                        <li className="flex gap-2">
                          <span className="text-slate-400">*</span> Household
                          head name
                        </li>
                        <li className="flex gap-2">
                          <span className="text-slate-400">*</span> Mobile
                          number
                        </li>
                        <li className="flex gap-2">
                          <span className="text-slate-400">*</span> House or
                          household identifier
                        </li>
                        <li className="flex gap-2">
                          <span className="text-slate-400">*</span> Number of
                          family members
                        </li>
                        <li className="flex gap-2">
                          <span className="text-slate-400">*</span> Village or
                          locality details
                        </li>
                        <li className="flex gap-2">
                          <span className="text-slate-400">*</span> Optional GPS
                          location at the time of household mapping
                        </li>
                      </ul>
                      <p className="mt-2 text-slate-600">
                        GreenPath does not independently collect this
                        information.
                      </p>
                    </div>

                    <div>
                      <h3 className="font-bold text-slate-800 mb-2">
                        b) Collection & Operational Data
                      </h3>
                      <p className="text-sm text-slate-500 mb-2">
                        Entered by collectors during waste collection:
                      </p>
                      <ul className="list-none space-y-1 text-slate-600 ml-4">
                        <li className="flex gap-2">
                          <span className="text-slate-400">*</span> Collection
                          date and time
                        </li>
                        <li className="flex gap-2">
                          <span className="text-slate-400">*</span> Household or
                          QR code reference
                        </li>
                        <li className="flex gap-2">
                          <span className="text-slate-400">*</span> Waste type
                          and segregation quality ratings
                        </li>
                        <li className="flex gap-2">
                          <span className="text-slate-400">*</span> Remarks
                          related to collection
                        </li>
                      </ul>
                    </div>

                    <div>
                      <h3 className="font-bold text-slate-800 mb-2">
                        c) Images & Audio (User-Generated Content)
                      </h3>
                      <ul className="list-none space-y-1 text-slate-600 ml-4 mb-3">
                        <li className="flex gap-2">
                          <span className="text-slate-400">*</span> Photographs
                          of waste bins taken during collection
                        </li>
                        <li className="flex gap-2">
                          <span className="text-slate-400">*</span> Optional
                          voice notes recorded by collectors for remarks
                        </li>
                      </ul>
                      <p className="text-sm text-slate-500 mb-2 font-medium italic">
                        These are:
                      </p>
                      <ul className="list-none space-y-1 text-slate-600 ml-4">
                        <li className="flex gap-2">
                          <span className="text-slate-400">*</span> Collected
                          only if enabled by the Organization
                        </li>
                        <li className="flex gap-2">
                          <span className="text-slate-400">*</span> Intended
                          solely for waste management verification and reporting
                        </li>
                      </ul>
                      <p className="mt-3 text-slate-600 leading-relaxed">
                        GreenPath does not actively review, listen to, or
                        analyze images or audio content for operational
                        purposes. Any incidental capture of people, homes, or
                        personal surroundings is unintentional and dependent on
                        user actions.
                      </p>
                    </div>

                    <div>
                      <h3 className="font-bold text-slate-800 mb-2">
                        d) Platform User Information
                      </h3>
                      <p className="text-sm text-slate-500 mb-2">
                        For users such as managers, moderators, collectors, and
                        field workers:
                      </p>
                      <ul className="list-none space-y-1 text-slate-600 ml-4">
                        <li className="flex gap-2">
                          <span className="text-slate-400">*</span> User ID
                        </li>
                        <li className="flex gap-2">
                          <span className="text-slate-400">*</span> Role and
                          village/organization assignment
                        </li>
                        <li className="flex gap-2">
                          <span className="text-slate-400">*</span> Login
                          credentials (securely stored)
                        </li>
                      </ul>
                    </div>
                  </div>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-3">
                    <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-green-100 text-green-700 text-sm">
                      3
                    </span>
                    Purpose of Processing
                  </h2>
                  <p className="text-slate-600 mb-3">
                    GreenPath processes data strictly to:
                  </p>
                  <ul className="list-none space-y-1 text-slate-600 ml-4 mb-4">
                    <li className="flex gap-2">
                      <span className="text-green-500 font-bold">*</span> Enable
                      waste collection operations
                    </li>
                    <li className="flex gap-2">
                      <span className="text-green-500 font-bold">*</span>{" "}
                      Generate reports, dashboards, and analytics
                    </li>
                    <li className="flex gap-2">
                      <span className="text-green-500 font-bold">*</span> Flag
                      events based on Organization-defined rules
                    </li>
                    <li className="flex gap-2">
                      <span className="text-green-500 font-bold">*</span>{" "}
                      Support monitoring and supervision by authorized
                      Organization users
                    </li>
                  </ul>
                  <p className="text-slate-600 mb-3">GreenPath does not:</p>
                  <ul className="list-none space-y-1 text-slate-600 ml-4">
                    <li className="flex gap-2">
                      <span className="text-red-500 font-bold">*</span> Sell
                      personal data
                    </li>
                    <li className="flex gap-2">
                      <span className="text-red-500 font-bold">*</span> Use data
                      for advertising or profiling
                    </li>
                    <li className="flex gap-2">
                      <span className="text-red-500 font-bold">*</span>{" "}
                      Independently contact households
                    </li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-3">
                    <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-green-100 text-green-700 text-sm">
                      4
                    </span>
                    Access Control & Visibility
                  </h2>
                  <p className="text-slate-600 mb-3 font-medium">
                    GreenPath follows role-based access control:
                  </p>
                  <ul className="list-none space-y-2 text-slate-600 ml-4">
                    <li className="flex gap-2">
                      <span className="text-slate-400 font-bold">*</span>{" "}
                      Organizations control who can view or manage household
                      data
                    </li>
                    <li className="flex gap-2">
                      <span className="text-slate-400 font-bold">*</span>{" "}
                      Managers may access household-level details for their
                      assigned villages
                    </li>
                    <li className="flex gap-2">
                      <span className="text-slate-400 font-bold">*</span>{" "}
                      Collectors and field workers access only the minimum data
                      required for their role
                    </li>
                    <li className="flex gap-2">
                      <span className="text-slate-400 font-bold">*</span>{" "}
                      Households can view only their own collection and
                      household information
                    </li>
                    <li className="flex gap-2">
                      <span className="text-slate-400 font-bold">*</span>{" "}
                      GreenPath administrators access only aggregated reports
                      and operational data for platform support, not
                      household-level personal details through dashboards
                    </li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-3">
                    <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-green-100 text-green-700 text-sm">
                      5
                    </span>
                    Location Information
                  </h2>
                  <ul className="list-none space-y-2 text-slate-600 ml-4">
                    <li className="flex gap-2">
                      <span className="text-slate-400 font-bold">*</span> GPS
                      location may be captured during household mapping or
                      collection only if enabled by the Organization
                    </li>
                    <li className="flex gap-2">
                      <span className="text-slate-400 font-bold">*</span>{" "}
                      Location data is used for route visualization, coverage
                      analysis, and reporting
                    </li>
                    <li className="flex gap-2">
                      <span className="text-slate-400 font-bold">*</span>{" "}
                      GreenPath does not independently track users in real time
                      outside configured workflows
                    </li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-3">
                    <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-green-100 text-green-700 text-sm">
                      6
                    </span>
                    Cookies & Tracking Technologies
                  </h2>
                  <p className="text-slate-600 mb-4">
                    GreenPath uses cookies and similar technologies primarily to
                    ensure the proper functioning and security of the platform.
                  </p>
                  <p className="text-sm text-slate-500 mb-2 font-medium italic">
                    These may include:
                  </p>
                  <ul className="list-none space-y-1 text-slate-600 ml-4 mb-4">
                    <li className="flex gap-2">
                      <span className="text-slate-400">*</span> Session cookies
                      for login and authentication
                    </li>
                    <li className="flex gap-2">
                      <span className="text-slate-400">*</span> Security-related
                      cookies to protect user accounts
                    </li>
                    <li className="flex gap-2">
                      <span className="text-slate-400">*</span> Basic technical
                      cookies required for platform performance
                    </li>
                  </ul>
                  <p className="text-slate-600 mb-3 font-medium">GreenPath:</p>
                  <ul className="list-none space-y-1 text-slate-600 ml-4">
                    <li className="flex gap-2">
                      <span className="text-red-500 font-bold">*</span> Does not
                      use advertising cookies
                    </li>
                    <li className="flex gap-2">
                      <span className="text-red-500 font-bold">*</span> Does not
                      perform cross-site tracking
                    </li>
                    <li className="flex gap-2">
                      <span className="text-red-500 font-bold">*</span> Does not
                      profile users for marketing purposes
                    </li>
                  </ul>
                  <p className="mt-4 text-slate-600">
                    Because GreenPath is a B2B, authenticated platform, separate
                    cookie consent banners are not used.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-3">
                    <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-green-100 text-green-700 text-sm">
                      7
                    </span>
                    Third-Party Services
                  </h2>
                  <p className="text-slate-600 mb-3">
                    GreenPath uses trusted third-party service providers for:
                  </p>
                  <ul className="list-none space-y-1 text-slate-600 ml-4 mb-4">
                    <li className="flex gap-2">
                      <span className="text-slate-400">*</span> Cloud hosting
                      and databases
                    </li>
                    <li className="flex gap-2">
                      <span className="text-slate-400">*</span> Storage of
                      images and audio
                    </li>
                    <li className="flex gap-2">
                      <span className="text-slate-400">*</span> Mapping and
                      location visualization
                    </li>
                    <li className="flex gap-2">
                      <span className="text-slate-400">*</span> SMS, OTP, and
                      payment services (where enabled)
                    </li>
                  </ul>
                  <p className="text-slate-600 leading-relaxed">
                    These providers process data only on our instructions and
                    are required to follow appropriate security standards.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-3">
                    <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-green-100 text-green-700 text-sm">
                      8
                    </span>
                    Data Retention
                  </h2>
                  <ul className="list-none space-y-2 text-slate-600 ml-4">
                    <li className="flex gap-2">
                      <span className="text-slate-400 font-bold">*</span> Data
                      is retained as long as the Organization continues to use
                      GreenPath
                    </li>
                    <li className="flex gap-2">
                      <span className="text-slate-400 font-bold">*</span>{" "}
                      Individual household records may be deleted by the
                      Organization as per its policies
                    </li>
                    <li className="flex gap-2">
                      <span className="text-slate-400 font-bold">*</span> If an
                      Organization permanently discontinues GreenPath services,
                      data will be deleted or returned as agreed with the
                      Organization
                    </li>
                    <li className="flex gap-2">
                      <span className="text-slate-400 font-bold">*</span>{" "}
                      Temporary suspension (for example, due to non-payment)
                      does not result in data deletion
                    </li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-3">
                    <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-green-100 text-green-700 text-sm">
                      9
                    </span>
                    Security Practices
                  </h2>
                  <p className="text-slate-600 mb-3">
                    GreenPath implements reasonable technical and organizational
                    safeguards, including:
                  </p>
                  <ul className="list-none space-y-1 text-slate-600 ml-4 mb-4">
                    <li className="flex gap-2">
                      <span className="text-green-500 font-bold">*</span> Secure
                      hosting environments
                    </li>
                    <li className="flex gap-2">
                      <span className="text-green-500 font-bold">*</span>{" "}
                      Encrypted connections (HTTPS)
                    </li>
                    <li className="flex gap-2">
                      <span className="text-green-500 font-bold">*</span>{" "}
                      Role-based access control
                    </li>
                    <li className="flex gap-2">
                      <span className="text-green-500 font-bold">*</span>{" "}
                      Password protection and reset mechanisms
                    </li>
                  </ul>
                  <p className="text-slate-600">
                    We continuously work to improve security, including
                    transitioning to OTP-based authentication where applicable.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-3">
                    <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-green-100 text-green-700 text-sm">
                      10
                    </span>
                    Consent & Lawful Use
                  </h2>
                  <p className="text-slate-600 mb-3 font-medium">
                    Organizations are responsible for:
                  </p>
                  <ul className="list-none space-y-2 text-slate-600 ml-4 mb-4">
                    <li className="flex gap-2">
                      <span className="text-slate-400 font-bold">*</span>{" "}
                      Informing households and users about data collection
                    </li>
                    <li className="flex gap-2">
                      <span className="text-slate-400 font-bold">*</span>{" "}
                      Obtaining any required consents
                    </li>
                    <li className="flex gap-2">
                      <span className="text-slate-400 font-bold">*</span>{" "}
                      Ensuring lawful use of the platform
                    </li>
                  </ul>
                  <p className="text-slate-600">
                    GreenPath processes data based on the Organization’s
                    instructions and does not independently obtain household
                    consent.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-3">
                    <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-green-100 text-green-700 text-sm">
                      11
                    </span>
                    Children’s Privacy
                  </h2>
                  <p className="text-slate-600 mb-4">
                    GreenPath does not knowingly collect personal information
                    directly from children.
                  </p>
                  <p className="text-slate-600 mb-2 font-medium">
                    As a B2B platform:
                  </p>
                  <ul className="list-none space-y-1 text-slate-600 ml-4 mb-4">
                    <li className="flex gap-2">
                      <span className="text-slate-400">*</span> Accounts are
                      created and managed by Organizations
                    </li>
                    <li className="flex gap-2">
                      <span className="text-slate-400">*</span> Any information
                      relating to minors (such as family member counts) is
                      collected by Organizations under their responsibility
                    </li>
                  </ul>
                  <p className="text-slate-600">
                    Parents or guardians should contact the relevant
                    Organization for any questions or requests regarding
                    children’s data. GreenPath will support Organizations as
                    required.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-3">
                    <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-green-100 text-green-700 text-sm">
                      12
                    </span>
                    Your Rights
                  </h2>
                  <p className="text-slate-600 mb-3">
                    Households and users should direct any requests regarding:
                  </p>
                  <ul className="list-none space-y-1 text-slate-600 ml-4 mb-4 font-medium">
                    <li className="flex gap-2">
                      <span className="text-slate-400 font-bold">*</span> Access
                    </li>
                    <li className="flex gap-2">
                      <span className="text-slate-400 font-bold">*</span>{" "}
                      Correction
                    </li>
                    <li className="flex gap-2">
                      <span className="text-slate-400 font-bold">*</span>{" "}
                      Deletion
                    </li>
                  </ul>
                  <p className="text-slate-600 leading-relaxed">
                    to their respective Organization. GreenPath will support
                    Organizations in fulfilling such requests where required.
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
                    This Privacy Policy may be updated to reflect changes in
                    law, technology, or platform features. Updated versions will
                    be published on the GreenPath website or application.
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
                    For questions about this Privacy Policy or data protection
                    practices:
                  </p>
                  <div className="space-y-1 text-slate-700">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-slate-400" />
                      <span>Email: info@greenpathorg.social</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-slate-400" />
                      <span>Website: https://www.greenpathorg.social</span>
                    </div>
                  </div>
                </section>
              </div>
            </CardContent>
          </Card>
          <div className="text-center pb-8">
            <p className="text-xs text-slate-400">
              © 2026 GreenPath. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
