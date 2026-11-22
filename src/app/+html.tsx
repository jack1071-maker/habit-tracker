import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

// The HTML page around the web version of the app.
// The extra tags let iPhones and Android phones save it to the Home Screen
// and open it full screen like a real app, with its own icon and name.
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <title>Habit Tracker</title>
        <meta name="description" content="Track your habits and grow a tree with your streak." />

        {/* Home Screen app on iPhone */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="Habits" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />

        {/* Home Screen app on Android */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#231B47" />

        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: 'html, body { background-color: #231B47; }' }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
