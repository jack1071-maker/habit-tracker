import { router } from 'expo-router';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { C, HEADLINE, R } from '@/lib/ui';

const UPDATED = 'November 21, 2026';
const CONTACT_URL = 'https://github.com/jack1071-maker/habit-tracker/issues';

// Plain-language privacy policy. Keep it in sync with what the app actually does.
const SECTIONS: { title: string; body: string[] }[] = [
  {
    title: 'The short version',
    body: [
      'Habit Tracker only collects what it needs to work: your email (if you make an account) and the habits you track. It has no ads, no analytics, no tracking, and your data is never sold or shared.',
    ],
  },
  {
    title: 'If you use it without an account',
    body: [
      'Everything stays on your device (in your browser’s storage or the app’s storage on your phone). Nothing is sent to our servers. Clearing your browser data or deleting the app erases it.',
    ],
  },
  {
    title: 'If you create an account',
    body: [
      'We store:',
      '• Your email address and a securely hashed version of your password (we can never see your actual password).',
      '• Your habits: their names and icons, the days and times you checked them off, your challenge and your tree’s progress.',
      'This is used only to back up your habits and sync them between your devices.',
    ],
  },
  {
    title: 'Where it’s stored',
    body: [
      'Account data is stored with Supabase (supabase.com), a database provider, on servers in Canada. The app itself is hosted by Expo (expo.dev). Both are only used to run the app.',
      'Database security rules make sure each account can only ever read or change its own habits.',
    ],
  },
  {
    title: 'Who can see your habits',
    body: [
      'Other users can’t. As the app’s developer, I technically have access to the database to keep it running, but I don’t look at people’s habits.',
    ],
  },
  {
    title: 'Deleting your data',
    body: [
      'You can delete your account at any time: Manage → Delete my account. This permanently deletes your account and all your saved habits from our servers straight away.',
    ],
  },
  {
    title: 'Children',
    body: ['Habit Tracker isn’t directed at children under 13, and we don’t knowingly collect their data.'],
  },
  {
    title: 'Changes and contact',
    body: [
      'If this policy changes, the date at the top will change too. Questions or requests: open an issue on the project’s GitHub page.',
    ],
  },
];

export default function PrivacyPolicy() {
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.wrap}>
        <Pressable onPress={goBack} style={styles.back}>
          <Text style={styles.backText}>‹ Back</Text>
        </Pressable>
        <Text style={styles.h1}>Privacy policy</Text>
        <Text style={styles.updated}>Last updated {UPDATED}</Text>

        {SECTIONS.map((s) => (
          <View key={s.title} style={styles.card}>
            <Text style={styles.h2}>{s.title}</Text>
            {s.body.map((p, i) => (
              <Text key={i} style={styles.p}>
                {p}
              </Text>
            ))}
          </View>
        ))}

        <Pressable onPress={() => Linking.openURL(CONTACT_URL)}>
          <Text style={styles.link}>Contact: github.com/jack1071-maker/habit-tracker</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, width: '100%', maxWidth: 520, alignSelf: 'center', backgroundColor: C.bg },
  wrap: { padding: 20, gap: 12, paddingBottom: 40 },
  back: { alignSelf: 'flex-start', paddingVertical: 6 },
  backText: { color: C.accent, fontSize: 16, fontWeight: '600' },
  h1: { fontSize: 38, lineHeight: 46, fontFamily: HEADLINE, textTransform: 'uppercase', color: C.text },
  updated: { color: C.muted, fontSize: 13, marginTop: -6 },
  card: { backgroundColor: C.card, borderRadius: R.md, padding: 16, gap: 8 },
  h2: { fontSize: 17, fontWeight: '700', color: C.text },
  p: { fontSize: 14, color: C.muted, lineHeight: 21 },
  link: { color: C.accent, textAlign: 'center', fontSize: 14, paddingVertical: 8 },
});
