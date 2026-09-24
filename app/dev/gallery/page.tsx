import { notFound } from "next/navigation";
import { Gallery } from "./gallery";

// Dev-only: every example spec rendered against the real demo data.
export default function GalleryPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <Gallery />;
}
