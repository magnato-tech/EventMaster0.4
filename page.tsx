import React, { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";

type Status = "idle" | "loading" | "ok" | "error";

const Page: React.FC = () => {
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    let isMounted = true;

    const testConnection = async () => {
      setStatus("loading");
      setMessage("");

      // Replace "your_table" with a real table name you have in Supabase.
      const { error } = await supabase.from("your_table").select("id").limit(1);

      if (!isMounted) return;

      if (error) {
        setStatus("error");
        setMessage(error.message);
        return;
      }

      setStatus("ok");
      setMessage("Tilkobling OK (minste spørring lykkes).");
    };

    testConnection();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div style={{ padding: 16 }}>
      <h1>Supabase test</h1>
      <p>Status: {status}</p>
      {message && <pre>{message}</pre>}
    </div>
  );
};

export default Page;



