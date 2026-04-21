import { Navigate } from "react-router-dom";

// /import is no longer used — the Import button lives on the Quotations page
export default function ImportPage() {
  return <Navigate to="/quotations" replace />;
}
