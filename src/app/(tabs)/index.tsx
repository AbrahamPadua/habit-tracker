import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { toggleHabit, toggleTask, updateItem } from '../../data/actions';
import { useSession, useUid } from '../../data/session';
import { addDays } from '../../domain/dates';
import { withCadence } from '../../domain/habits';
import { weekProgress } from '../../domain/progress';
import { suggestionFor, type Suggestion } from '../../domain/suggestions';
import { reschedule } from '../../domain/tasks';
import { buildToday, type TodayRow } from '../../domain/today';
import type { DateKey, Item } from '../../domain/types';
import { Cat, type CatPose } from '../../ui/Cat';
import { Button, Fab, SectionLabel } from '../../ui/controls';
import { ItemRow } from '../../ui/ItemRow';
import { report } from '../../ui/report';
import { space, type, useTheme } from '../../ui/theme';

// How long a just-stamped row stays in place before it folds into Done.
const LINGER_MS = 1400;

export default function Today() {
  const t = useTheme();
  const { profile, partner, partnerId, myItems, partnerItems, today } = useSession();

  const header = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  const week = useMemo(() => weekProgress(myItems ?? [], today), [myItems, today]);

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: t.ground }}>
      <ScrollView contentContainerStyle={styles.page}>
        <View style={styles.top}>
          <Text style={[type.label, { color: t.muted }]}>{header}</Text>
          {week.total > 0 && (
            <Text style={[type.meta, { color: t.muted }]}>
              This week <Text style={{ color: t.ink, fontWeight: '700' }}>{week.done}</Text> of {week.total}
            </Text>
          )}
        </View>

        {myItems === null ? (
          <ActivityIndicator color={t.me} style={{ marginTop: space.xxl }} />
        ) : (
          <MyCard items={myItems} today={today} name={profile?.name ?? 'You'} />
        )}

        {partnerId && partner ? (
          partner.sharing ? (
            <PartnerCard items={partnerItems} today={today} name={partner.name} />
          ) : (
            <Note text={`${partner.name} has paused sharing for now.`} />
          )
        ) : (
          <View style={[styles.card, { backgroundColor: t.card }]}>
            <View style={styles.cardHeader}>
              <Cat pose="peek" ink={t.partner} />
              <Text style={[type.title, { color: t.ink, flex: 1 }]}>Your partner&apos;s card goes here</Text>
            </View>
            <Text style={[type.meta, { color: t.muted, marginTop: space.xs, marginBottom: space.md }]}>
              Link up with a code and you will see each other&apos;s day, read-only.
            </Text>
            <Button kind="tonal" label="Link up" onPress={() => router.navigate('/space')} />
          </View>
        )}
      </ScrollView>

      <Fab onPress={() => router.push('/item')} label="Add a goal, habit or task" />
    </SafeAreaView>
  );
}

function MyCard({ items, today, name }: { items: Item[]; today: DateKey; name: string }) {
  const t = useTheme();
  const uid = useUid();
  const view = useMemo(() => buildToday(items, today), [items, today]);
  const [showDone, setShowDone] = useState(false);

  // Keep a just-stamped row where it was for a moment, so the stamp is seen before it folds away.
  const [lingering, setLingering] = useState<string[]>([]);
  const lastNowOrder = useRef<string[]>([]);
  const nowRows = useMemo(() => {
    const rows = [...view.now];
    for (const id of lingering) {
      const r = view.done.find((d) => d.item.id === id);
      if (!r) continue;
      // eslint-disable-next-line react-hooks/refs -- last render's order, read only to slot a lingering row back in place
      const at = lastNowOrder.current.indexOf(id);
      rows.splice(at < 0 ? rows.length : Math.min(at, rows.length), 0, r);
    }
    return rows;
  }, [view, lingering]);
  useEffect(() => {
    lastNowOrder.current = nowRows.map((r) => r.item.id);
  }, [nowRows]);
  const doneRows = view.done.filter((r) => !lingering.includes(r.item.id));

  const toggle = (row: TodayRow) => {
    const { item } = row;
    if (!row.done && view.now.includes(row)) {
      setLingering((l) => [...l, item.id]);
      setTimeout(() => setLingering((l) => l.filter((id) => id !== item.id)), LINGER_MS);
    }
    report(item.type === 'habit' ? toggleHabit(uid, item, today) : toggleTask(uid, item, today));
  };

  const open = (item: Item) => router.push({ pathname: '/item', params: { id: item.id } });

  const rowProps = (row: TodayRow) => {
    const { item } = row;
    const s = suggestionFor(item, today);
    return {
      row,
      ink: t.me,
      today,
      onToggle: () => toggle(row),
      onOpen: () => open(item),
      onMove:
        item.type === 'task' ? (due: DateKey | null) => report(updateItem(uid, item.id, reschedule(item, due))) : undefined,
      onDrop: item.type === 'task' ? () => report(updateItem(uid, item.id, { droppedOn: today })) : undefined,
      suggestion: s,
      onApplySuggestion: () => s && report(applySuggestion(uid, item, s, today)),
      onDismissSuggestion: () => report(updateItem(uid, item.id, { snoozeSuggestionsUntil: addDays(today, 14) })),
    };
  };

  const total = view.now.length + view.done.length;
  const empty = total === 0 && view.thisWeek.length === 0;

  return (
    <View style={[styles.card, { backgroundColor: t.card }]}>
      <CardHeader name={name} done={view.done.length} total={total} ink={t.me} cat={catPose(empty, total, view.now.length)} />
      {empty ? (
        <Text style={[type.body, { color: t.muted, paddingVertical: space.lg }]}>
          Nothing on your card yet. Tap + to add a habit, a task, or a goal.
        </Text>
      ) : (
        <>
          {nowRows.map((r) => (
            <ItemRow key={r.item.id} {...rowProps(r)} />
          ))}
          {nowRows.length === 0 && total > 0 && (
            <Text style={[type.body, { color: t.muted, paddingVertical: space.md }]}>Everything&apos;s stamped. Cat nap time.</Text>
          )}
          {view.thisWeek.length > 0 && <SectionLabel>This week</SectionLabel>}
          {view.thisWeek.map((r) => (
            <ItemRow key={r.item.id} {...rowProps(r)} />
          ))}
          {doneRows.length > 0 && (
            <Pressable
              onPress={() => setShowDone((s) => !s)}
              style={styles.doneToggle}
              accessibilityRole="button"
              accessibilityState={{ expanded: showDone }}
            >
              <Text style={[type.label, { color: t.muted }]}>Done ({doneRows.length})</Text>
              <MaterialCommunityIcons name={showDone ? 'chevron-up' : 'chevron-down'} size={20} color={t.muted} />
            </Pressable>
          )}
          {showDone && doneRows.map((r) => <ItemRow key={r.item.id} {...rowProps(r)} />)}
        </>
      )}
    </View>
  );
}

function applySuggestion(uid: string, item: Item, s: Suggestion, today: DateKey) {
  if (s.kind === 'stuckTask' || item.type !== 'habit') return updateItem(uid, item.id, { droppedOn: today });
  const times = s.kind === 'lowerWeekly' ? s.to : s.times;
  return updateItem(uid, item.id, { cadences: withCadence(item, { kind: 'weekly', times }, today) });
}

function PartnerCard({ items, today, name }: { items: Item[] | null; today: DateKey; name: string }) {
  const t = useTheme();
  const view = useMemo(() => buildToday(items ?? [], today), [items, today]);
  const total = view.now.length + view.done.length;
  // The partner's done items stay visible and stamped: seeing them is the point.
  const rows = [...view.now, ...view.done];
  return (
    <View style={[styles.card, { backgroundColor: t.card }]}>
      <CardHeader
        name={name}
        done={view.done.length}
        total={total}
        ink={t.partner}
        cat={catPose(items !== null && rows.length + view.thisWeek.length === 0, total, view.now.length)}
      />
      {items === null ? (
        <ActivityIndicator color={t.partner} style={{ marginVertical: space.lg }} />
      ) : rows.length + view.thisWeek.length === 0 ? (
        <Text style={[type.body, { color: t.muted, paddingVertical: space.lg }]}>Nothing shared for today.</Text>
      ) : (
        <>
          {rows.map((r) => (
            <ItemRow key={r.item.id} row={r} ink={t.partner} today={today} />
          ))}
          {view.thisWeek.length > 0 && <SectionLabel>This week</SectionLabel>}
          {view.thisWeek.map((r) => (
            <ItemRow key={r.item.id} row={r} ink={t.partner} today={today} />
          ))}
        </>
      )}
    </View>
  );
}

// The card's cat peeks in on an empty card, naps once today's list is all stamped, and sits otherwise.
const catPose = (empty: boolean, total: number, left: number): CatPose =>
  empty ? 'peek' : total > 0 && left === 0 ? 'sleep' : 'sit';

function CardHeader({ name, done, total, ink, cat }: { name: string; done: number; total: number; ink: string; cat: CatPose }) {
  const t = useTheme();
  return (
    <View style={styles.cardHeader}>
      <Cat pose={cat} ink={ink} />
      <Text style={[type.title, { color: t.ink, flex: 1 }]} numberOfLines={1}>
        {name}
      </Text>
      {total > 0 && (
        <Text accessibilityLabel={`${done} of ${total} done today`}>
          <Text style={[type.display, { color: ink }]}>{done}</Text>
          <Text style={[type.title, { color: t.muted }]}> of {total}</Text>
        </Text>
      )}
    </View>
  );
}

function Note({ text }: { text: string }) {
  const t = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: t.card }]}>
      <Text style={[type.body, { color: t.muted }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { padding: space.lg, paddingBottom: 120, gap: space.lg },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingTop: space.sm },
  card: { borderRadius: 20, paddingHorizontal: space.lg, paddingTop: space.lg, paddingBottom: space.sm },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-end', paddingBottom: space.sm, gap: space.md },
  doneToggle: { flexDirection: 'row', alignItems: 'center', gap: space.xs, minHeight: 48 },
});
