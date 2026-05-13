// Public community stats — real data only. No fake numbers, ever.
// Returns aggregate counts safe to expose publicly (no PII).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [members, verified, activeWeek, pets, completedSwaps, recentReviews, areas] =
      await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("is_demo", false),
        supabase
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("is_demo", false)
          .eq("is_email_verified", true),
        supabase
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("is_demo", false)
          .gte("last_active_at", sevenDaysAgo),
        supabase.from("pets").select("id", { count: "exact", head: true }),
        supabase
          .from("swaps")
          .select("id", { count: "exact", head: true })
          .eq("status", "completed"),
        supabase
          .from("reviews")
          .select("id", { count: "exact", head: true })
          .gte("created_at", sevenDaysAgo),
        supabase.from("profiles").select("area").eq("is_demo", false).not("area", "is", null),
      ]);

    // Aggregate top cities (by the part after the last comma — usually the city).
    const cityMap = new Map<string, number>();
    for (const row of areas.data ?? []) {
      const a = (row as { area: string | null }).area;
      if (!a) continue;
      const parts = a.split(",").map((s) => s.trim()).filter(Boolean);
      const city = parts[parts.length - 1] || a;
      cityMap.set(city, (cityMap.get(city) ?? 0) + 1);
    }
    const topCities = Array.from(cityMap.entries())
      .map(([city, count]) => ({ city, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    const body = {
      members: members.count ?? 0,
      verifiedMembers: verified.count ?? 0,
      activeThisWeek: activeWeek.count ?? 0,
      pets: pets.count ?? 0,
      completedSwaps: completedSwaps.count ?? 0,
      reviewsThisWeek: recentReviews.count ?? 0,
      topCities,
      generatedAt: new Date().toISOString(),
    };

    return new Response(JSON.stringify(body), {
      headers: {
        ...cors,
        "content-type": "application/json",
        // Cache at the edge for a minute — keeps it lively but cheap.
        "cache-control": "public, max-age=60, s-maxage=60",
      },
    });
  } catch (err) {
    console.error("community-stats error", err);
    return new Response(JSON.stringify({ error: "stats_unavailable" }), {
      status: 500,
      headers: { ...cors, "content-type": "application/json" },
    });
  }
});
