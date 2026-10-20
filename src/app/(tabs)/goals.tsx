import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { updateItem } from '../../data/actions';
import { useSession } from '../../data/session';
import { addDays, daysBetween, describeDate, weekStart } from '../../domain/dates';
import { cadenceOn, describeCadence, isPaused, weekCount } from '../../domain/habits';
import { goalProgress, stampsPerDay } from '../../domain/progress';
import type { DateKey, Goal, Item } from '../../domain/types';
import { Fab, SectionLabel } from '../../ui/controls';
import { weekdayMark } from '../../ui/ItemRow';
import { report } from '../../ui/report';
import { Stamp } from '../../ui/Stamp';
import { space, type, useTheme } from '../../ui/theme';

export default function Goals() {
  const t = useTheme();
  const { myItems, partnerItems, partner, today } = useSession();

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: t.ground }}>
      <ScrollView contentContainerStyle={styles.page}>
        <Text style={[type.headline, { color: t.ink, paddingTop: space.sm }]}>Goals</Text>
        {myItems === null ? (
          <ActivityIndicator color={t.muted} style={{ marginTop: space.xxl }} />
        ) : (
          <>
            {myItems.length > 0 && <StampGrid items={myItems} today={today} />}
            <Board items={myItems} today={today} ink={t.me} editable />
          </>
        )}
        {partner?.sharing && partnerItems && (
          <>
            <Text style={[type.headline, { color: t.ink, paddingTop: space.lg }]}>{partner.name}</Text>
            <Board items={partnerItems} today={today} ink={t.partner} />
          </>
        )}
      </ScrollView>
      <Fab onPress={() => router.push({ pathname: '/item', params: { type: 'goal' } })} label="Add a goal" />
    </SafeAreaView>
  );
}

const WEEKS = 12;

/** Your last 12 weeks as a card of stamps: one column per week (Mon at top), darker ink for busier days. */
function StampGrid({ items, today }: { items: Item[]; today: DateKey }) {
  const t = useTheme();
  const [picked, setPicked] = useState<DateKey | null>(null);
  const counts = useMemo(() => stampsPerDay(items), [items]);
  const first = addDays(weekStart(today), -7 * (WEEKS - 1));
  const weeks = Array.from({ length: WEEKS }, (_, w) => Array.from({ length: 7 }, (_, d) => addDays(first, w * 7 + d)));
  const total = weeks.flat().reduce((sum, day) => sum + (counts.get(day) ?? 0), 0);
  // An empty day is plain card stock, never a warning: unchecked is not failed.
  const fill = (n: number) => (n === 0 ? t.tonal : t.heat[n === 1 ? 0 : n <= 3 ? 1 : 2]);
  const n = picked ? counts.get(picked) ?? 0 : 0;

  return (
    <View style={[styles.card, { backgroundColor: t.card }]}>
      <View style={styles.goalHead} accessible accessibilityLabel={`${total} stamps in the last 12 weeks`}>
        <Text style={[type.title, { color: t.ink, flex: 1 }]}>Last 12 weeks</Text>
        <Text>
          <Text style={[type.headline, { color: t.me }]}>{total}</Text>
          <Text style={[type.meta, { color: t.muted }]}> stamps</Text>
        </Text>
      </View>
      <View style={styles.grid} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        {weeks.map((days, w) => (
          <View key={w} style={styles.gridWeek}>
            {days.map((day) => (
              <Pressable
                key={day}
                disabled={day > today}
                onPress={() => setPicked(picked === day ? null : day)}
                style={[
                  styles.gridDay,
                  { backgroundColor: day > today ? 'transparent' : fill(counts.get(day) ?? 0) },
                  picked === day && { borderWidth: 2, borderColor: t.ink },
                ]}
              />
            ))}
          </View>
        ))}
      </View>
      <View style={styles.gridFoot}>
        <Text style={[type.meta, { color: t.muted, flex: 1 }]}>
          {picked ? `${describeDate(picked, today)}: ${n} ${n === 1 ? 'stamp' : 'stamps'}` : 'Tap a day to see it.'}
        </Text>
        <Text style={[type.meta, { color: t.muted }]}>Less </Text>
        {[0, 1, 2, 4].map((k) => (
          <View key={k} style={[styles.gridKey, { backgroundColor: fill(k) }]} />
        ))}
        <Text style={[type.meta, { color: t.muted }]}> More</Text>
      </View>
    </View>
  );
}

function Board({ items, today, ink, editable }: { items: Item[]; today: DateKey; ink: string; editable?: boolean }) {
  const t = useTheme();
  const goals = items.filter((i): i is Goal => i.type === 'goal');
  const open = goals.filter((g) => !g.doneOn);
  const achieved = goals.filter((g) => g.doneOn);
  const goalIds = new Set(goals.map((g) => g.id));
  const loose = items.filter((i) => i.type !== 'goal' && (!i.goalId || !goalIds.has(i.goalId)) && isVisible(i, today));
  // Only the owner sees what they dropped; it is the one place a drop can be undone.
  const dropped = editable ? items.filter((i) => i.type === 'task' && i.droppedOn) : [];

  if (!items.length) {
    return (
      <Text style={[type.body, { color: t.muted }]}>
        {editable ? 'No goals yet. Goals are optional: add one with + when a few habits and tasks add up to something bigger.' : 'Nothing shared yet.'}
      </Text>
    );
  }

  return (
    <View style={{ gap: space.md }}>
      {open.map((g) => (
        <GoalCard key={g.id} goal={g} items={items} today={today} ink={ink} editable={editable} />
      ))}
      {loose.length > 0 && (
        <View style={[styles.card, { backgroundColor: t.card }]}>
          <SectionLabel>Not in a goal</SectionLabel>
          {loose.map((i) => (
            <Line key={i.id} item={i} today={today} editable={editable} />
          ))}
        </View>
      )}
      {achieved.length > 0 && (
        <View style={[styles.card, { backgroundColor: t.card }]}>
          <SectionLabel>Achieved</SectionLabel>
          {achieved.map((g) => (
            <View key={g.id}>
              <Pressable disabled={!editable} onPress={() => openItem(g.id)} style={styles.line}>
                <MaterialCommunityIcons name="flag-checkered" size={18} color={ink} />
                <Text style={[type.body, { color: t.ink, flex: 1 }]}>{g.title}</Text>
                <Text style={[type.meta, { color: t.muted }]}>{describeDate(g.doneOn!, today)}</Text>
              </Pressable>
              {/* Open tasks of an achieved goal would otherwise appear nowhere. */}
              {items
                .filter((i) => i.type === 'task' && i.goalId === g.id && !i.doneOn && isVisible(i, today))
                .map((i) => (
                  <View key={i.id} style={{ paddingLeft: space.xl }}>
                    <Line item={i} today={today} editable={editable} />
                  </View>
                ))}
            </View>
          ))}
        </View>
      )}
      {dropped.length > 0 && (
        <View style={[styles.card, { backgroundColor: t.card }]}>
          <SectionLabel>Dropped</SectionLabel>
          {dropped.map((i) => (
            <Line key={i.id} item={i} today={today} editable={editable} />
          ))}
        </View>
      )}
    </View>
  );
}

function GoalCard({ goal, items, today, ink, editable }: { goal: Goal; items: Item[]; today: DateKey; ink: string; editable?: boolean }) {
  const t = useTheme();
  const { user } = useSession();
  const toggleMilestone = (g: Goal, id: string) =>
    report(
      updateItem(user!.uid, g.id, {
        milestones: g.milestones.map((m) => (m.id === id ? { ...m, doneOn: m.doneOn ? null : today } : m)),
      }),
    );
  const { done, total } = goalProgress(goal);
  const children = items.filter((i) => i.type !== 'goal' && i.goalId === goal.id && isVisible(i, today));
  return (
    <View style={[styles.card, { backgroundColor: t.card }]}>
      <Pressable disabled={!editable} onPress={() => openItem(goal.id)} accessibilityRole={editable ? 'button' : undefined}>
        <View style={styles.goalHead}>
          <Text style={[type.title, { color: t.ink, flex: 1 }]}>{goal.title}</Text>
          {total > 0 && (
            <Text>
              <Text style={[type.headline, { color: ink }]}>{done}</Text>
              <Text style={[type.meta, { color: t.muted }]}> of {total}</Text>
            </Text>
          )}
        </View>
        {total > 0 && (
          <View style={styles.milestones}>
            {goal.milestones.map((m) =>
              editable ? (
                <View key={m.id} style={styles.milestoneLine}>
                  <Text style={[type.body, { color: m.doneOn ? t.muted : t.ink, flex: 1 }]}>{m.title}</Text>
                  <Stamp
                    size={28}
                    stamped={!!m.doneOn}
                    ink={ink}
                    mark={weekdayMark(m.doneOn ?? today).slice(0, 2)}
                    label={m.title}
                    onPress={() => toggleMilestone(goal, m.id)}
                  />
                </View>
              ) : (
                <View key={m.id} style={[styles.milestoneLine, { minHeight: 28 }]}>
                  <View style={[styles.dot, m.doneOn ? { backgroundColor: ink, borderColor: ink } : { borderColor: t.faint }]} />
                  <Text style={[type.meta, { color: m.doneOn ? t.muted : t.ink, flex: 1 }]}>{m.title}</Text>
                </View>
              ),
            )}
          </View>
        )}
      </Pressable>
      {children.length > 0 && (
        <View style={[styles.children, { borderTopColor: t.rule }]}>
          {children.map((i) => (
            <Line key={i.id} item={i} today={today} editable={editable} />
          ))}
        </View>
      )}
    </View>
  );
}

function Line({ item, today, editable }: { item: Item; today: DateKey; editable?: boolean }) {
  const t = useTheme();
  let meta = '';
  if (item.type === 'habit') {
    const c = cadenceOn(item, today);
    meta = isPaused(item, today) ? 'Paused' : c ? `${describeCadence(c)} · ${weekCount(item, today)} this week` : '';
  } else if (item.type === 'task') {
    meta = item.droppedOn
      ? 'Dropped'
      : item.doneOn
        ? `Done ${describeDate(item.doneOn, today).toLowerCase()}`
        : item.due
          ? describeDate(item.due, today)
          : item.pinned
            ? 'Pinned'
            : 'No date';
  }
  return (
    <Pressable disabled={!editable} onPress={() => openItem(item.id)} style={styles.line} accessibilityRole={editable ? 'button' : undefined}>
      <MaterialCommunityIcons
        name={item.type === 'habit' ? 'repeat' : item.type === 'task' && item.doneOn ? 'checkbox-marked-outline' : 'checkbox-blank-outline'}
        size={18}
        color={t.faint}
      />
      <Text style={[type.body, { color: t.ink, flex: 1 }]} numberOfLines={1}>
        {item.title}
      </Text>
      <Text style={[type.meta, { color: t.muted }]}>{meta}</Text>
    </Pressable>
  );
}

// Dropped tasks leave the goal lists (they wait in Dropped); finished tasks fall off a week after.
const isVisible = (i: Item, today: DateKey) =>
  !(i.type === 'task' && (i.droppedOn || (i.doneOn && daysBetween(i.doneOn, today) > 7)));

const openItem = (id: string) => router.push({ pathname: '/item', params: { id } });

const styles = StyleSheet.create({
  page: { padding: space.lg, paddingBottom: 120, gap: space.md },
  card: { borderRadius: 20, padding: space.lg, paddingTop: space.md },
  goalHead: { flexDirection: 'row', alignItems: 'flex-end', gap: space.md, minHeight: 40 },
  milestones: { marginTop: space.xs },
  milestoneLine: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  dot: { width: 10, height: 10, borderRadius: 5, borderWidth: 1.5 },
  children: { marginTop: space.md, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: space.xs },
  line: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 48 },
  // Phone width sets the cell size; the cap keeps cells small on tablets and wide windows.
  grid: { flexDirection: 'row', gap: 4, marginTop: space.md, maxWidth: 380 },
  gridWeek: { flex: 1, gap: 4 },
  gridDay: { aspectRatio: 1, borderRadius: 4 },
  gridFoot: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: space.md },
  gridKey: { width: 12, height: 12, borderRadius: 3 },
});
