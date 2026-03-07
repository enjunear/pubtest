<script setup lang="ts">
useSeoMeta({
  title: 'Privacy Policy',
  robots: 'noindex',
})
</script>

<template>
  <div class="max-w-2xl mx-auto py-8 prose dark:prose-invert">
    <h1>Privacy Policy</h1>
    <p>Last updated: 7 March 2026</p>

    <p>
      The Pub Test is committed to protecting your privacy in accordance with
      the Australian Privacy Act 1988 (Cth) and the Australian Privacy
      Principles (APPs).
    </p>

    <h2>1. Information We Collect</h2>
    <p>We collect the following personal information:</p>
    <ul>
      <li><strong>Account details:</strong> name and email address (via Google OAuth or magic link)</li>
      <li><strong>Electorate:</strong> your selected federal electorate</li>
      <li><strong>Voting activity:</strong> your votes on stories, associated with a hashed IP address for rate limiting</li>
    </ul>

    <h2>2. How We Use Your Information</h2>
    <p>Your information is used to:</p>
    <ul>
      <li>Authenticate your account and maintain your session</li>
      <li>Record your votes and display aggregate results</li>
      <li>Prevent abuse through rate limiting</li>
    </ul>
    <p>We do not sell, rent, or share your personal information with third parties.</p>

    <h2>3. Cookies</h2>
    <p>
      We use essential cookies only, required for authentication and session
      management. We do not use tracking or advertising cookies.
    </p>

    <h2>4. Data Storage</h2>
    <p>
      Your data is stored on Cloudflare infrastructure. We take reasonable steps
      to protect your information from unauthorised access, modification, or
      disclosure.
    </p>

    <h2>5. Account Deletion</h2>
    <p>
      You can delete your account at any time from the Settings page. When you
      delete your account:
    </p>
    <ul>
      <li>Your personal information (name, email, electorate) is permanently deleted</li>
      <li>Your votes are anonymised and retained for the integrity of aggregate results</li>
    </ul>

    <h2>6. Your Rights</h2>
    <p>
      Under the Privacy Act 1988, you have the right to access and correct your
      personal information. To make a request, contact us through the email
      associated with your account.
    </p>

    <h2>7. Complaints</h2>
    <p>
      If you believe your privacy has been breached, you may lodge a complaint
      with the Office of the Australian Information Commissioner (OAIC) at
      <a href="https://www.oaic.gov.au" target="_blank" rel="noopener">www.oaic.gov.au</a>.
    </p>

    <h2>8. Changes to This Policy</h2>
    <p>
      We may update this privacy policy from time to time. Changes will be
      posted on this page with an updated revision date.
    </p>
  </div>
</template>
