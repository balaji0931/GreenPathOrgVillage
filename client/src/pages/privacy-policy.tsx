
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useLocation } from 'wouter';

export default function PrivacyPolicy() {
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
            <CardTitle className="text-2xl">Privacy Policy</CardTitle>
            <p className="text-sm text-muted-foreground">
              Last updated: {new Date().toLocaleDateString()}
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <section>
              <h2 className="text-xl font-semibold mb-3">1. Information We Collect</h2>
              <div className="space-y-2 text-sm">
                <p><strong>Personal Information:</strong> Name, phone number, household address, and user identification details.</p>
                <p><strong>Waste Collection Data:</strong> Collection ratings, observations, photos, and voice recordings related to waste management.</p>
                <p><strong>Usage Data:</strong> Login times, system interactions, and application usage patterns.</p>
                <p><strong>Device Information:</strong> IP address, browser type, and device identifiers for security purposes.</p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">2. How We Use Your Information</h2>
              <div className="space-y-2 text-sm">
                <p>• Facilitate waste collection and management services</p>
                <p>• Track and improve waste segregation practices</p>
                <p>• Communicate with households, collectors, and managers</p>
                <p>• Generate reports and analytics for village administration</p>
                <p>• Resolve issues and complaints related to waste management</p>
                <p>• Ensure system security and prevent unauthorized access</p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">3. Data Sharing and Disclosure</h2>
              <div className="space-y-2 text-sm">
                <p>We do not sell, trade, or transfer your personal information to third parties except:</p>
                <p>• With village administrators and authorized personnel for waste management purposes</p>
                <p>• When required by law or legal process</p>
                <p>• To protect the rights, property, or safety of our users</p>
                <p>• With service providers who assist in our operations (with strict confidentiality agreements)</p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">4. Data Security</h2>
              <div className="space-y-2 text-sm">
                <p>We implement appropriate security measures including:</p>
                <p>• Encrypted data transmission and storage</p>
                <p>• Regular security audits and updates</p>
                <p>• Access controls and user authentication</p>
                <p>• Secure cloud storage with backup systems</p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">5. Data Retention</h2>
              <p className="text-sm">
                We retain your personal information for as long as necessary to provide our services and comply with legal obligations. 
                Waste collection data may be retained for historical reporting and analysis purposes.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">6. Your Rights</h2>
              <div className="space-y-2 text-sm">
                <p>You have the right to:</p>
                <p>• Access your personal information</p>
                <p>• Request correction of inaccurate data</p>
                <p>• Request deletion of your data (subject to legal requirements)</p>
                <p>• Object to processing of your personal information</p>
                <p>• Lodge a complaint with relevant data protection authorities</p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">7. Cookies and Tracking</h2>
              <p className="text-sm">
                We use essential cookies for authentication and system functionality. We do not use tracking cookies for advertising purposes.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">8. Children's Privacy</h2>
              <p className="text-sm">
                Our service is not intended for children under 13. We do not knowingly collect personal information from children under 13.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">9. Changes to This Policy</h2>
              <p className="text-sm">
                We may update this privacy policy from time to time. We will notify users of any material changes through the application.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">10. Contact Information</h2>
              <div className="text-sm">
                <p>For questions about this privacy policy, contact:</p>
                <p>Email: info@greenpathorg.social</p>
              </div>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
