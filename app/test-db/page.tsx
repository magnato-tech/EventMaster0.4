import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export default async function TestDbPage() {
  if (!supabaseUrl || !supabaseAnonKey) {
    return (
      <main style={{ padding: 24 }}>
        <h1>Supabase test</h1>
        <p>Mangler miljøvariabler for Supabase.</p>
      </main>
    );
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const { data, error } = await supabase.from("profiles").select("*").limit(1);

  return (
    <main style={{ padding: 24 }}>
      <h1>Supabase test</h1>
      {error ? (
        <>
          <p>Kontakt med API-et OK, men spørringen feilet.</p>
          <pre style={{ whiteSpace: "pre-wrap" }}>{error.message}</pre>
        </>
      ) : (
        <>
          <p>Kontakt OK. Antall rader: {data?.length ?? 0}</p>
          <pre style={{ whiteSpace: "pre-wrap" }}>
            {JSON.stringify(data, null, 2)}
          </pre>
        </>
      )}
    </main>
  );
}



