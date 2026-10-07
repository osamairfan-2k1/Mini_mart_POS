import { useState, useEffect } from "react";
import Sidebar from "./sidebar";

export default function Settings() {
  const [profile, setProfile] = useState(null);
  const [profileError, setProfileError] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = sessionStorage.getItem("token");
        const res = await fetch("http://localhost/backend/me.php", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) {
          setProfileError(data.error || "Failed to load profile");
          return;
        }
        setProfile(data.user);
      } catch (err) {
        setProfileError("Could not reach the server. Is the PHP server running?");
      }
    };
    fetchProfile();
  }, []);

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match");
      return;
    }

    setSubmitting(true);
    try {
      const token = sessionStorage.getItem("token");
      const res = await fetch("http://localhost/backend/changepassword.php", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setPasswordError(data.error || "Failed to update password");
        return;
      }

      setPasswordSuccess("Password updated successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPasswordError("Could not reach the server. Is the PHP server running?");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-stone-100">
      <Sidebar />

      <main className="flex-1 min-w-0 px-4 py-6 sm:px-8 sm:py-8">
        <div className="max-w-2xl mx-auto">
          <header className="mb-6">
            <h1 className="text-3xl font-bold tracking-tight text-stone-900">Settings</h1>
            <p className="mt-1 text-stone-600">Manage your account details.</p>
          </header>

          {/* Profile card */}
          <section className="mb-6 rounded-xl border border-stone-200 bg-white p-6">
            <h2 className="text-base font-semibold text-stone-900 mb-4">Profile</h2>

            {profileError ? (
              <p className="text-sm text-red-700">{profileError}</p>
            ) : !profile ? (
              <div className="animate-pulse space-y-2">
                <div className="h-4 w-1/3 rounded bg-stone-200" />
                <div className="h-4 w-1/2 rounded bg-stone-200" />
              </div>
            ) : (
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-stone-500">Full name</dt>
                  <dd className="mt-1 font-medium text-stone-900">{profile.name}</dd>
                </div>
                <div>
                  <dt className="text-stone-500">Email</dt>
                  <dd className="mt-1 font-medium text-stone-900">{profile.email}</dd>
                </div>
                <div>
                  <dt className="text-stone-500">Role</dt>
                  <dd className="mt-1 font-medium text-stone-900 capitalize">{profile.role}</dd>
                </div>
                <div>
                  <dt className="text-stone-500">Staff since</dt>
                  <dd className="mt-1 font-medium text-stone-900">
                    {new Date(profile.created_at).toLocaleDateString()}
                  </dd>
                </div>
              </dl>
            )}
          </section>

          {/* Change password card */}
          <section className="rounded-xl border border-stone-200 bg-white p-6">
            <h2 className="text-base font-semibold text-stone-900 mb-1">Change password</h2>
            <p className="text-sm text-stone-500 mb-4">
              You'll need your current password to set a new one.
            </p>

            {passwordError && (
              <div className="mb-4 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <span>{passwordError}</span>
              </div>
            )}
            {passwordSuccess && (
              <div className="mb-4 flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                <span>{passwordSuccess}</span>
              </div>
            )}

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">
                  Current password
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/30"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">
                  New password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/30"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">
                  Confirm new password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/30"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-emerald-600 text-white font-semibold px-5 py-2.5 text-sm hover:bg-emerald-700 transition disabled:opacity-50"
              >
                {submitting ? "Updating..." : "Update password"}
              </button>
            </form>
          </section>
        </div>
      </main>
    </div>
  );
}