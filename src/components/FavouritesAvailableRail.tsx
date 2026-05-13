// Favourites rail — intentionally renders nothing until real saved-helpers
// are wired to the backend. Previously sourced from mockUsers, which leaked
// fabricated profiles into the signed-in UI.
interface Props {
  onRequest?: (helperId: string) => void;
  onSeeAll?: () => void;
  className?: string;
}

const FavouritesAvailableRail = (_props: Props) => null;

export default FavouritesAvailableRail;
