import { Anton_400Regular, useFonts } from '@expo-google-fonts/anton';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';

import { C } from '@/lib/ui';

export default function RootLayout() {
  // Wait for the headline font so headings don't flash in the wrong font.
  const [fontsLoaded, fontError] = useFonts({ Anton_400Regular });

  if (!fontsLoaded && !fontError) {
    return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  }

  return (
    <>
      {/* Light status bar icons (time, battery) so they show up on the dark purple background. */}
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg } }} />
    </>
  );
}
