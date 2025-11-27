
'use client';

import HomePage from "./home/page";

// This page now simply renders the home page, as the layout handles auth protection.
export default function AppRootPage() {
  return <HomePage />;
}
