
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Shield, Lock, Eye, Trash2 } from 'lucide-react';
import { useLocation } from 'wouter';

export default function DataProtection() {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Button 
            variant="outline" 
            onClick={() => setLocation('/')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl flex items-center">
              <Shield className="h-6 w-6 mr-2" />
              Data Protection & Compliance
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Information about how we protect your data and comply with regulations
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <section>
              <h2 className="text-xl font-semibold mb-3 flex items-center">
                <Lock className="h-5 w-5 mr-2" />
                Data Security Measures
              </h2>
              <div className="space-y-3 text-sm">
                <div className="bg-blue-50 p-3 rounded-lg">
                  <h3 className="font-medium">Encryption</h3>
                  <p>All data is encrypted both in transit (TLS 1.3) and at rest (AES-256)</p>
                </div>
                <div className="bg-green-50 p-3 rounded-lg">
                  <h3 className="font-medium">Access Control</h3>
                  <p>Role-based access control ensures users only see data relevant to their responsibilities</p>
                </div>
                <div className="bg-purple-50 p-3 rounded-lg">
                  <h3 className="font-medium">Regular Audits</h3>
                  <p>System access and data changes are logged and regularly audited</p>
                </div>
                <div className="bg-orange-50 p-3 rounded-lg">
                  <h3 className="font-medium">Secure Infrastructure</h3>
                  <p>Hosted on secure cloud infrastructure with regular security updates</p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">Regulatory Compliance</h2>
              <div className="space-y-3 text-sm">
                <div className="border p-3 rounded-lg">
                  <h3 className="font-medium">Digital Personal Data Protection Act (India)</h3>
                  <p>We comply with Indian data protection regulations including consent management and data minimization</p>
                </div>
                <div className="border p-3 rounded-lg">
                  <h3 className="font-medium">Information Technology Act, 2000</h3>
                  <p>Our systems follow IT Act guidelines for electronic data protection and privacy</p>
                </div>
                <div className="border p-3 rounded-lg">
                  <h3 className="font-medium">Municipal Data Guidelines</h3>
                  <p>Adheres to local government data handling and retention policies</p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 flex items-center">
                <Eye className="h-5 w-5 mr-2" />
                Your Data Rights
              </h2>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-medium mb-2">Right to Access</h3>
                  <p>Request a copy of all personal data we hold about you</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-medium mb-2">Right to Rectification</h3>
                  <p>Request correction of inaccurate or incomplete data</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-medium mb-2">Right to Erasure</h3>
                  <p>Request deletion of your personal data (subject to legal obligations)</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-medium mb-2">Right to Portability</h3>
                  <p>Request your data in a structured, machine-readable format</p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">Data Collection Justification</h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center p-3 border rounded-lg">
                  <span><strong>Household Information:</strong> Required for waste collection service delivery</span>
                  <span className="text-green-600 font-medium">Essential</span>
                </div>
                <div className="flex justify-between items-center p-3 border rounded-lg">
                  <span><strong>Collection Photos:</strong> Used for quality assessment and issue resolution</span>
                  <span className="text-blue-600 font-medium">Functional</span>
                </div>
                <div className="flex justify-between items-center p-3 border rounded-lg">
                  <span><strong>Voice Recordings:</strong> Optional feedback mechanism for non-literate users</span>
                  <span className="text-purple-600 font-medium">Optional</span>
                </div>
                <div className="flex justify-between items-center p-3 border rounded-lg">
                  <span><strong>Usage Analytics:</strong> System improvement and performance monitoring</span>
                  <span className="text-orange-600 font-medium">Legitimate Interest</span>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">Contact Information</h2>
              <div className="text-sm">
                <p>For questions about data protection and compliance, contact:</p>
                <p>Email: greenpathforgood@gmail.com</p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">Incident Response</h2>
              <p className="text-sm">
                In case of a data breach or security incident, we will notify affected users and relevant authorities 
                within 72 hours as required by law. Users will receive detailed information about the nature of the 
                breach and recommended protective actions.
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
