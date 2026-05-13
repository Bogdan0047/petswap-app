import { ArrowLeft, MapPin, User, MessageCircle, Shield, Database } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const sections = [
  {
    icon: MapPin,
    title: 'Location',
    description: 'Your location is used to show nearby pet owners and care requests. We only display approximate distance to other users — never your exact address or postcode.',
  },
  {
    icon: User,
    title: 'Profile information',
    description: 'Your profile details (name, bio, household info, pet experience) help us improve trust and compatibility matching. This information is visible to other users to help them decide whether to connect.',
  },
  {
    icon: MessageCircle,
    title: 'Messaging',
    description: 'Messages are used to allow matched users to coordinate pet care arrangements. Messages are stored securely and are not shared with third parties.',
  },
  {
    icon: Shield,
    title: 'Verification data',
    description: 'Email, phone, and optional ID verification are used to improve safety and build trust within the community. Verification status is displayed on your profile as trust badges.',
  },
  {
    icon: Database,
    title: 'Usage data',
    description: 'We collect anonymised usage data to improve the app experience. This includes interactions, feature usage, and performance metrics. We do not sell personal data to third parties.',
  },
];

const DataUsage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-12">
      <div className="px-6 pt-6 pb-4 safe-top flex items-center gap-4">
        <button onClick={() => navigate(-1)}><ArrowLeft size={22} /></button>
        <h1 className="font-semibold text-lg">Data Usage</h1>
      </div>

      <div className="px-6">
        <p className="text-sm text-muted-foreground leading-relaxed mb-6">
          We believe in transparency. Here is exactly how PetSwap uses your data and why.
        </p>

        <div className="space-y-4">
          {sections.map((section, i) => (
            <div key={i} className="card-elevated p-4 flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <section.icon size={18} className="text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-sm mb-1">{section.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{section.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="card-flat p-4 mt-6">
          <p className="text-xs text-muted-foreground leading-relaxed">
            You can request a full export of your data or request deletion at any time through your profile settings or by contacting <span className="text-primary">support@petswap.com</span>.
          </p>
        </div>
      </div>
    </div>
  );
};

export default DataUsage;
