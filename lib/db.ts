import { neon } from "@neondatabase/serverless";

/**
 * Neon HTTP-driver. Hver `sql`-call er en HTTP-request – ingen
 * persistent tilkobling, så det fungerer fint i Vercel serverless
 * functions og edge runtime.
 *
 * Bruk: `await sql\`SELECT * FROM rooms WHERE code = ${code}\``
 * Parametere interpoleres trygt (forhindrer SQL-injection).
 */
export const sql = neon(process.env.DATABASE_URL!);
