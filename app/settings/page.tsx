import AppLayout from "@/components/AppLayout";

export default function SettingsPage() {
  return (
    <AppLayout>
      <div className="max-w-xl">
        <h1 className="text-2xl font-semibold text-gray-900 mb-8">Settings</h1>

        {/* Reminder Preferences */}
        <section className="mb-10">
          <h2 className="text-base font-medium text-gray-700 mb-4">
            Reminder Preferences
          </h2>

          <div className="flex flex-col gap-4">
            <div>
              <label
                htmlFor="contactFrequency"
                className="block text-sm text-gray-600 mb-1"
              >
                Default contact frequency
              </label>
              <select
                id="contactFrequency"
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-400"
                defaultValue="monthly"
              >
                <option value="weekly">Weekly</option>
                <option value="biweekly">Every two weeks</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="reminderEmail"
                className="block text-sm text-gray-600 mb-1"
              >
                Weekly reminder email
              </label>
              <select
                id="reminderEmail"
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-400"
                defaultValue="enabled"
              >
                <option value="enabled">Enabled</option>
                <option value="disabled">Disabled</option>
              </select>
            </div>
          </div>
        </section>

        {/* Account */}
        <section>
          <h2 className="text-base font-medium text-gray-700 mb-4">Account</h2>
          <button
            type="button"
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors"
          >
            Log out
          </button>
        </section>
      </div>
    </AppLayout>
  );
}
