
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useLocation } from 'wouter';

export default function TermsOfService() {
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
            <CardTitle className="text-2xl">Terms of Service</CardTitle>
            <p className="text-sm text-muted-foreground">
              Last updated: {new Date().toLocaleDateString()}
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <section>
              <h2 className="text-xl font-semibold mb-3">1. Acceptance of Terms</h2>
              <p className="text-sm">
                By accessing and using the GreenPath Waste Management System, you accept and agree to be bound by the terms and 
                provision of this agreement. These terms apply to all users of the system including households, collectors, 
                managers, moderators, and administrators.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">2. Description of Service</h2>
              <p className="text-sm">
                GreenPath is a digital waste management platform that facilitates waste collection tracking, household management, 
                issue reporting, and communication between various stakeholders in village waste management systems.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">3. User Responsibilities</h2>
              <div className="space-y-2 text-sm">
                <p><strong>All Users:</strong></p>
                <p>• Provide accurate and truthful information</p>
                <p>• Maintain the confidentiality of your login credentials</p>
                <p>• Use the system only for its intended purposes</p>
                <p>• Report any security breaches or unauthorized access</p>
                
                <p className="mt-4"><strong>Waste Generators (Households):</strong></p>
                <p>• Ensure proper waste segregation as per local guidelines</p>
                <p>• Provide accurate feedback and ratings</p>
                <p>• Report issues and complaints in good faith</p>
                
                <p className="mt-4"><strong>Collectors:</strong></p>
                <p>• Conduct waste collection duties professionally</p>
                <p>• Provide accurate collection data and ratings</p>
                <p>• Maintain respectful communication with households</p>
                
                <p className="mt-4"><strong>Managers and Administrators:</strong></p>
                <p>• Ensure data privacy and security</p>
                <p>• Use administrative privileges responsibly</p>
                <p>• Respond to issues and complaints promptly</p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">4. Prohibited Activities</h2>
              <div className="space-y-2 text-sm">
                <p>Users are prohibited from:</p>
                <p>• Using the system for any illegal or unauthorized purposes</p>
                <p>• Attempting to gain unauthorized access to any part of the system</p>
                <p>• Submitting false, misleading, or malicious information</p>
                <p>• Harassing, threatening, or abusing other users</p>
                <p>• Interfering with the proper functioning of the system</p>
                <p>• Copying, modifying, or distributing system content without permission</p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">5. Data and Privacy</h2>
              <p className="text-sm">
                Your privacy is important to us. Please review our Privacy Policy, which governs the collection, 
                use, and disclosure of your personal information. By using our service, you consent to the 
                collection and use of information as outlined in our Privacy Policy.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">6. Content and Intellectual Property</h2>
              <div className="space-y-2 text-sm">
                <p>• The system and its content are protected by copyright and other intellectual property laws</p>
                <p>• Users retain rights to content they create but grant us license to use it for service provision</p>
                <p>• Photos and voice recordings submitted are used solely for waste management purposes</p>
                <p>• QR codes and system-generated content remain our property</p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">7. System Availability</h2>
              <p className="text-sm">
                We strive to maintain system availability but cannot guarantee uninterrupted service. 
                The system may be temporarily unavailable due to maintenance, updates, or technical issues. 
                We are not liable for any inconvenience caused by system downtime.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">8. Limitation of Liability</h2>
              <p className="text-sm">
                To the fullest extent permitted by law, we shall not be liable for any indirect, incidental, 
                special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred 
                directly or indirectly, or any loss of data, use, goodwill, or other intangible losses.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">9. Account Termination</h2>
              <div className="space-y-2 text-sm">
                <p>We reserve the right to terminate or suspend accounts that:</p>
                <p>• Violate these terms of service</p>
                <p>• Engage in fraudulent or malicious activities</p>
                <p>• Compromise system security or integrity</p>
                <p>• Are inactive for extended periods (as defined by local policies)</p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">10. Governing Law</h2>
              <p className="text-sm">
                These terms shall be governed by and construed in accordance with the laws of [Your Jurisdiction]. 
                Any disputes arising from these terms or use of the service shall be subject to the exclusive 
                jurisdiction of the courts in [Your Jurisdiction].
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">11. Changes to Terms</h2>
              <p className="text-sm">
                We reserve the right to modify these terms at any time. Users will be notified of material changes 
                through the system. Continued use of the service after changes constitutes acceptance of the new terms.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">12. Contact Information</h2>
              <div className="text-sm">
                <p>For questions about these terms, contact:</p>
                <p>Email: legal@greenpath.org</p>
                <p>Address: [Your Organization Address]</p>
                <p>Phone: [Your Contact Number]</p>
              </div>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
