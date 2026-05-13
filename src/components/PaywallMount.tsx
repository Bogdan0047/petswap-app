import PaywallSheet from "@/components/PaywallSheet";
import { usePaywallState, closePaywall } from "@/lib/paywallStore";

export default function PaywallMount() {
  const s = usePaywallState();
  return (
    <PaywallSheet
      open={s.open}
      onOpenChange={(o) => { if (!o) closePaywall(); }}
      trigger={s.trigger}
      directPriceId={s.directPriceId}
      headline={s.headline}
      sub={s.sub}
    />
  );
}
