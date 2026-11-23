import { cookies } from "next/headers";
import { no, sv, type Lang } from "./dict";

export async function getServerLang(): Promise<Lang> {
  const v = (await cookies()).get("lang")?.value;
  return v === "sv" ? "sv" : "no";
}

export async function getServerDict() {
  return (await getServerLang()) === "sv" ? sv : no;
}
