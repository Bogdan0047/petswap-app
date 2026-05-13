import { useNavigate } from 'react-router-dom';
import { ArrowRight, Eye } from 'lucide-react';
import petswapIcon from '@/assets/petswap-icon.png';

const Welcome = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-8 bg-background">
      <div className="animate-splash flex flex-col items-center text-center max-w-sm">
        {/* Logo */}
        <img src={petswapIcon} alt="PetSwap" className="w-[88px] h-[88px] rounded-[22px] mb-8" style={{ boxShadow: '0 14px 32px rgba(47,128,237,0.30)' }} />

        <h1 className="text-[32px] font-bold tracking-tight mb-3">PetSwap</h1>
        <p className="text-lg font-semibold text-foreground mb-2">
          Trusted pet care, powered by local community
        </p>
        <p className="text-[15px] text-muted-foreground leading-relaxed mb-14 max-w-[280px]">
          Connect with nearby pet owners and helpers to exchange trusted support for your pets.
        </p>

        <button onClick={() => navigate('/auth?next=%2Fhome')} className="btn-primary w-full flex items-center justify-center gap-2 text-[17px]">
          Get started <ArrowRight size={20} />
        </button>
        <button onClick={() => navigate('/home')} className="mt-5 flex items-center gap-2 text-[15px] text-muted-foreground font-medium hover:text-foreground transition-colors duration-200">
          <Eye size={17} /> Preview app
        </button>
      </div>

      {/* Bottom tagline */}
      <p className="absolute bottom-10 text-[13px] text-muted-foreground/60 font-medium">
        Trusted pet care through community
      </p>
    </div>
  );
};

export default Welcome;
