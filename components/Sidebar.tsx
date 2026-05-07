import Link from "next/link";

const navLinks = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "People", href: "/people" },
  { label: "Settings", href: "/settings" },
];

export default function Sidebar() {
  return (
    <aside className="w-56 min-h-screen bg-gray-900 text-white flex flex-col px-4 py-6">
      <div className="mb-8">
        <h1 className="text-lg font-semibold">Personal CRM</h1>
        <p className="text-sm text-gray-400 mt-1">Relationship tracker</p>
      </div>

      <nav className="flex flex-col gap-1">
        {navLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="rounded-md px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
