"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";

import AppLayout from "@/components/AppLayout";
import { supabase } from "@/lib/supabase";

const RootsMapView = dynamic(
  () => import("./_components/roots-map-view"),
  { ssr: false }
);

type MapPerson = {
  id: string;
  name: string;
  location: string | null;
  latitude: number;
  longitude: number;
  last_contacted_at: string | null;
  contact_frequency_days: number;
};

export default function RootsMapPage() {
  const router = useRouter();
  const [people, setPeople] = useState<MapPerson[]>([]);
  const [loading, setLoading] = useState(true);
  const [locationFilter, setLocationFilter] = useState("");

  useEffect(() => {
    async function fetchPeople() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth/login");
        return;
      }

      const { data } = await supabase
        .from("people")
        .select("id, name, location, latitude, longitude, last_contacted_at, contact_frequency_days")
        .eq("user_id", user.id)
        .not("latitude", "is", null)
        .not("longitude", "is", null);

      setPeople((data as MapPerson[]) ?? []);
      setLoading(false);
    }

    fetchPeople();
  }, [router]);

  const filteredPeople = locationFilter.trim()
    ? people.filter((p) =>
        p.location?.toLowerCase().includes(locationFilter.toLowerCase().trim())
      )
    : people;

  const uniqueCityCount = new Set(
    people.map((p) => p.location).filter(Boolean)
  ).size;

  const subtitle = locationFilter.trim()
    ? filteredPeople.length > 0
      ? `Showing ${filteredPeople.length} ${filteredPeople.length === 1 ? "person" : "people"} matching '${locationFilter}'`
      : `No people found matching '${locationFilter}'`
    : `${people.length} ${people.length === 1 ? "person" : "people"} across ${uniqueCityCount} ${uniqueCityCount === 1 ? "city" : "cities"}`;

  return (
    <AppLayout>
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Your Roots
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">
          Your people, on the map
        </h1>
        {!loading && people.length > 0 && (
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading map…</p>
      ) : people.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-8 text-center shadow-sm">
          <h2 className="text-base font-semibold text-foreground">
            No locations yet
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Add a city when saving a contact to see them appear here.
          </p>
          <Link
            href="/people/new"
            className="mt-4 inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/80"
          >
            Add someone
          </Link>
        </div>
      ) : (
        <>
          <div className="relative mb-4">
            <input
              type="text"
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              placeholder="Search by city or country..."
              className="h-10 w-full max-w-sm rounded-md border border-border bg-card px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {locationFilter && (
              <button
                onClick={() => setLocationFilter("")}
                className="absolute top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-sm"
                style={{ right: "calc(100% - min(100%, 24rem) + 12px)" }}
              >
                ✕
              </button>
            )}
          </div>
          <RootsMapView key={locationFilter || "all"} people={filteredPeople} />
        </>
      )}
    </AppLayout>
  );
}
