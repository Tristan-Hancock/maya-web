import { Outlet } from "react-router-dom";

export default function LearnLayout() {
  return (
    <main className="max-w-4xl mx-auto px-4 py-12">
      <Outlet />
    </main>
  );
}
