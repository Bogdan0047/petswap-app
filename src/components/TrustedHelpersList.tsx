import { Heart } from 'lucide-react';

// Real saved-helpers aren't wired to the backend yet, so we always show the
// honest empty state instead of pulling from mockUsers (which would surface
// fabricated profiles in the signed-in UI).
const TrustedHelpersList = () => (
  <div className="card-flat p-5 text-center">
    <Heart size={22} className="text-muted-foreground mx-auto mb-2" />
    <p className="font-semibold text-[14px]">No saved helpers yet</p>
    <p className="text-[12px] text-muted-foreground mt-1">
      Tap the heart on any helper card to save them for one-tap booking later.
    </p>
  </div>
);

export default TrustedHelpersList;
