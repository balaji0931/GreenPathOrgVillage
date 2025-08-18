
import { useLocation } from 'wouter';

export default function Footer() {
  const [, setLocation] = useLocation();

  return (
    <footer className="bg-white border-t mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-sm text-gray-600">
            © {new Date().getFullYear()} GreenPathORG. All rights reserved.
          </div>
          <div className="flex flex-wrap gap-4 text-sm">
            <button
              onClick={() => setLocation('/privacy-policy')}
              className="text-gray-600 hover:text-green-600 transition-colors"
            >
              Privacy Policy
            </button>
            <button
              onClick={() => setLocation('/terms-of-service')}
              className="text-gray-600 hover:text-green-600 transition-colors"
            >
              Terms of Service
            </button>
            <button
              onClick={() => setLocation('/data-protection')}
              className="text-gray-600 hover:text-green-600 transition-colors"
            >
              Data Protection
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
