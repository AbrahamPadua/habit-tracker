import { MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { addItem, deleteItem, newId, toggleHabit, updateItem } from '../data/actions';
import { useSession, useUid } from '../data/session';
import { addDays, describeDate, toDateKey, weekStart } from '../domain/dates';
import { changedFields } from '../domain/edits';
import { cadenceOn, describeCadence, isPaused, withCadence, withPause, withResume } from '../domain/habits';
import { reschedule } from '../domain/tasks';
import type { Cadence, DateKey, Goal, Habit, Item, Milestone, Task } from '../domain/types';
import { ensureReminderPermission, remindersSupported } from '../lib/reminders';
import { Button, Chip, SectionLabel } from '../ui/controls';
import { weekdayMark } from '../ui/ItemRow';
import { report } from '../ui/report';
import { Stamp } from '../ui/Stamp';
import { space, type, useTheme } from '../ui/theme';

type Kind = Item['type'];
type DueChoice = 'today' | 'tomorrow' | 'nextWeek' | 'none' | 'pick';

export default function ItemSheet() {
  const { id, type: startKind } = useLocalSearchParams<{ id?: string; type?: Kind }>();
  const { myItems, today } = useSession();
  const existing = id ? myItems?.find((i) => i.id === id) : undefined;
  if (id && !existing) {
    // Deleted elsewhere or still loading.
    return null;
  }
  return <Editor key={existing?.id ?? 'new'} existing={existing} startKind={startKind} items={myItems ?? []} today={today} />;
}

function Editor({ existing, startKind, items, today }: { existing?: Item; startKind?: Kind; items: Item[]; today: DateKey }) {
  const t = useTheme();
  const uid = useUid();
  const { partner } = useSession();
  const goals = items.filter((i): i is Goal => i.type === 'goal' && i.id !== existing?.id && !i.doneOn);

  const [kind, setKind] = useState<Kind>(existing?.type ?? startKind ?? 'habit');
  const [title, setTitle] = useState(existing?.title ?? '');
  const [isPrivate, setPrivate] = useState(existing?.private ?? false);
  const [goalId, setGoalId] = useState<string | null>(existing && existing.type !== 'goal' ? existing.goalId : null);

  // The item as the sheet opened it. "What did I change" is measured against this, not the live copy,
  // so a change made meanwhile on the other device (say, marking it private) is not written back over.
  const [opened] = useState(existing);
  const habit = existing?.type === 'habit' ? existing : undefined;
  const task = existing?.type === 'task' ? existing : undefined;
  const goal = existing?.type === 'goal' ? existing : undefined;

  const [cadence, setCadence] = useState<Cadence>((habit && cadenceOn(habit, today)) || { kind: 'daily' });
  const [reminder, setReminder] = useState<string | null>(habit?.reminder ?? null);
  const [pickingTime, setPickingTime] = useState(false);

  const [due, setDue] = useState<DateKey | null>(task ? task.due : today);
  const [pinned, setPinned] = useState(task?.pinned ?? false);
  const [pickingDate, setPickingDate] = useState(false);

  const [milestones, setMilestones] = useState<Milestone[]>(goal?.milestones ?? []);
  const [draftMilestone, setDraftMilestone] = useState('');

  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));

  /** `also` carries a quick action's own field (pause, drop, achieve) so it saves together with the form. */
  const save = (also: Parameters<typeof updateItem>[2] = {}) => {
    const name = title.trim();
    if (!name) return;
    const extra = draftMilestone.trim() ? [{ id: newId(), title: draftMilestone.trim(), doneOn: null }] : [];
    const base = { title: name.slice(0, 200), private: isPrivate };

    if (existing) {
      const next =
        existing.type === 'habit'
          ? {
              ...base,
              goalId,
              reminder,
              ...(JSON.stringify(cadenceOn(opened as Habit, today)) !== JSON.stringify(cadence) && {
                cadences: withCadence(existing, cadence, today),
              }),
            }
          : existing.type === 'task'
            ? { ...base, goalId, pinned, ...reschedule(existing, due) }
            : { ...base, milestones: [...milestones, ...extra] };
      const patch = { ...changedFields(opened!, next), ...also };
      if (Object.keys(patch).length) report(updateItem(uid, existing.id, patch));
    } else if (kind === 'habit') {
      report(
        addItem(uid, {
          type: 'habit',
          ...base,
          createdOn: today,
          goalId,
          cadences: [{ from: today, cadence }],
          doneDates: [],
          pauses: [],
          reminder,
          snoozeSuggestionsUntil: null,
        }),
      );
    } else if (kind === 'task') {
      report(
        addItem(uid, {
          type: 'task',
          ...base,
          createdOn: today,
          goalId,
          due,
          pinned,
          doneOn: null,
          droppedOn: null,
          deferCount: 0,
          snoozeSuggestionsUntil: null,
        }),
      );
    } else {
      report(addItem(uid, { type: 'goal', ...base, createdOn: today, milestones: [...milestones, ...extra], doneOn: null }));
    }
    close();
  };

  const remove = () =>
    Alert.alert(`Delete "${existing!.title}"?`, existing!.type === 'goal' ? 'Its habits and tasks stay, without the goal.' : 'Its history goes too.', [
      { text: 'Keep it', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          report(deleteItem(uid, existing!.id, items));
          close();
        },
      },
    ]);

  const pickReminder = async () => {
    if (!(await ensureReminderPermission())) {
      return Alert.alert('Notifications are off', 'Turn on notifications for Our Space in Android settings to get reminders.');
    }
    setPickingTime(true);
  };

  const dueChoice: DueChoice =
    due === null ? 'none' : due === today ? 'today' : due === addDays(today, 1) ? 'tomorrow' : due === addDays(weekStart(today), 7) ? 'nextWeek' : 'pick';

  const input = [styles.input, { color: t.ink, borderColor: t.faint, backgroundColor: t.card }];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.ground }}>
      <View style={[styles.bar, { borderBottomColor: t.rule }]}>
        <Pressable onPress={close} style={styles.icon} accessibilityRole="button" accessibilityLabel="Close without saving">
          <MaterialCommunityIcons name="close" size={24} color={t.ink} />
        </Pressable>
        <Text style={[type.title, { color: t.ink, flex: 1 }]}>{existing ? 'Edit' : 'Add'}</Text>
        <Button kind="text" label="Save" onPress={() => save()} disabled={!title.trim()} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          {!existing && (
            <View style={styles.chips} accessibilityRole="radiogroup">
              <Chip label="Habit" selected={kind === 'habit'} onPress={() => setKind('habit')} />
              <Chip label="Task" selected={kind === 'task'} onPress={() => setKind('task')} />
              <Chip label="Goal" selected={kind === 'goal'} onPress={() => setKind('goal')} />
            </View>
          )}

          <TextInput
            style={[input, type.headline]}
            value={title}
            onChangeText={setTitle}
            placeholder={kind === 'habit' ? 'Read for 20 minutes' : kind === 'task' ? 'Finish the prototype schematic' : 'Complete the thesis prototype'}
            placeholderTextColor={t.faint}
            autoFocus={!existing}
            maxLength={200}
            multiline
            accessibilityLabel="Title"
          />

          {kind === 'habit' && (
            <>
              <SectionLabel>How often</SectionLabel>
              <View style={styles.chips}>
                <Chip label="Daily" selected={cadence.kind === 'daily'} onPress={() => setCadence({ kind: 'daily' })} />
                <Chip
                  label="Some days a week"
                  selected={cadence.kind === 'weekly'}
                  onPress={() => setCadence({ kind: 'weekly', times: cadence.kind === 'weekly' ? cadence.times : 3 })}
                />
                <Chip label="Flexible" selected={cadence.kind === 'flexible'} onPress={() => setCadence({ kind: 'flexible' })} />
              </View>
              {cadence.kind === 'weekly' && (
                <View style={styles.stepper}>
                  <Pressable
                    style={[styles.stepBtn, { borderColor: t.faint }]}
                    onPress={() => setCadence({ kind: 'weekly', times: Math.max(1, cadence.times - 1) })}
                    accessibilityLabel="Fewer times"
                  >
                    <MaterialCommunityIcons name="minus" size={20} color={t.ink} />
                  </Pressable>
                  <Text style={[type.title, { color: t.ink, minWidth: 110, textAlign: 'center' }]}>
                    {describeCadence(cadence)}
                  </Text>
                  <Pressable
                    style={[styles.stepBtn, { borderColor: t.faint }]}
                    onPress={() => setCadence({ kind: 'weekly', times: Math.min(6, cadence.times + 1) })}
                    accessibilityLabel="More times"
                  >
                    <MaterialCommunityIcons name="plus" size={20} color={t.ink} />
                  </Pressable>
                </View>
              )}
              {habit && JSON.stringify(cadenceOn(habit, today)) !== JSON.stringify(cadence) && (
                <Text style={[type.meta, { color: t.muted }]}>Applies from this week. Earlier weeks keep their old target.</Text>
              )}

              {remindersSupported && (
                <>
                  <SectionLabel>Reminder</SectionLabel>
                  <View style={styles.chips}>
                    <Chip label="None" selected={!reminder} onPress={() => setReminder(null)} />
                    <Chip
                      label={reminder ? `Daily at ${reminder}` : 'Pick a time'}
                      selected={!!reminder}
                      onPress={pickingTime ? () => setPickingTime(false) : pickReminder}
                    />
                  </View>
                  {pickingTime && (
                    <DateTimePicker
                      mode="time"
                      value={timeToDate(reminder ?? '20:00')}
                      onChange={(e, d) => {
                        // Android's dialog fires once on OK/cancel; iOS fires on every wheel turn and stays open.
                        if (Platform.OS === 'android') setPickingTime(false);
                        if (e.type === 'set' && d) setReminder(`${pad(d.getHours())}:${pad(d.getMinutes())}`);
                      }}
                    />
                  )}
                </>
              )}
            </>
          )}

          {kind === 'task' && (
            <>
              <SectionLabel>When</SectionLabel>
              <View style={styles.chips}>
                <Chip label="Today" selected={dueChoice === 'today'} onPress={() => setDue(today)} />
                <Chip label="Tomorrow" selected={dueChoice === 'tomorrow'} onPress={() => setDue(addDays(today, 1))} />
                <Chip label="Next week" selected={dueChoice === 'nextWeek'} onPress={() => setDue(addDays(weekStart(today), 7))} />
                <Chip label="No date" selected={dueChoice === 'none'} onPress={() => setDue(null)} />
                {Platform.OS !== 'web' && (
                  <Chip
                    label={dueChoice === 'pick' && due ? describeDate(due, today) : 'Pick a date'}
                    selected={dueChoice === 'pick'}
                    onPress={() => setPickingDate((p) => !p)}
                  />
                )}
              </View>
              {pickingDate && (
                <DateTimePicker
                  mode="date"
                  value={due ? keyToDate(due) : new Date()}
                  onChange={(e, d) => {
                    if (Platform.OS === 'android') setPickingDate(false);
                    if (e.type === 'set' && d) setDue(toDateKey(d));
                  }}
                />
              )}
              <Toggle
                label="Pin to Today"
                hint={due ? 'Shows on Today even before its date.' : 'Undated tasks only show on Today when pinned.'}
                value={pinned}
                onChange={setPinned}
              />
            </>
          )}

          {kind !== 'goal' && goals.length > 0 && (
            <>
              <SectionLabel>Part of a goal</SectionLabel>
              <View style={styles.chips}>
                <Chip label="None" selected={goalId === null} onPress={() => setGoalId(null)} />
                {goals.map((g) => (
                  <Chip key={g.id} label={g.title} selected={goalId === g.id} onPress={() => setGoalId(g.id)} />
                ))}
              </View>
            </>
          )}

          {kind === 'goal' && (
            <>
              <SectionLabel>Milestones</SectionLabel>
              <Text style={[type.meta, { color: t.muted, marginBottom: space.sm }]}>
                Progress on a goal comes from these, not from habit check-ins.
              </Text>
              {milestones.map((m) => (
                <View key={m.id} style={[styles.milestone, { borderBottomColor: t.rule }]}>
                  <Text style={[type.body, { color: m.doneOn ? t.muted : t.ink, flex: 1 }]}>{m.title}</Text>
                  {existing && (
                    <Stamp
                      stamped={!!m.doneOn}
                      ink={t.me}
                      mark={weekdayMark(m.doneOn ?? today)}
                      label={m.title}
                      onPress={() => setMilestones((ms) => ms.map((x) => (x.id === m.id ? { ...x, doneOn: x.doneOn ? null : today } : x)))}
                    />
                  )}
                  <Pressable
                    onPress={() => setMilestones((ms) => ms.filter((x) => x.id !== m.id))}
                    style={styles.icon}
                    accessibilityLabel={`Remove ${m.title}`}
                  >
                    <MaterialCommunityIcons name="close" size={20} color={t.faint} />
                  </Pressable>
                </View>
              ))}
              <TextInput
                style={[input, type.body]}
                value={draftMilestone}
                onChangeText={setDraftMilestone}
                placeholder="Add a milestone"
                placeholderTextColor={t.faint}
                returnKeyType="done"
                blurOnSubmit={false}
                onSubmitEditing={() => {
                  if (!draftMilestone.trim()) return;
                  setMilestones((ms) => [...ms, { id: newId(), title: draftMilestone.trim(), doneOn: null }]);
                  setDraftMilestone('');
                }}
                accessibilityLabel="New milestone"
              />
            </>
          )}

          <Toggle
            label="Only me"
            hint={partner ? `Hidden from ${partner.name}.` : 'Hidden from your partner once you link up.'}
            value={isPrivate}
            onChange={setPrivate}
          />

          {habit && <Backfill habit={habit} today={today} uid={uid} />}

          {existing && (
            <View style={styles.actions}>
              {habit &&
                (isPaused(habit, today) ? (
                  <Button kind="tonal" label="Resume" onPress={() => save({ pauses: withResume(habit, today) })} />
                ) : (
                  <Button kind="tonal" label="Pause for now" onPress={() => save({ pauses: withPause(habit, today) })} />
                ))}
              {task && !task.doneOn && !task.droppedOn && (
                <Button kind="tonal" label="Drop it" onPress={() => save({ droppedOn: today })} />
              )}
              {task?.droppedOn && (
                <Button kind="tonal" label="Bring it back" onPress={() => save({ droppedOn: null })} />
              )}
              {goal && (
                <Button
                  kind="tonal"
                  label={goal.doneOn ? 'Reopen goal' : 'Mark achieved'}
                  onPress={() => save({ doneOn: goal.doneOn ? null : today })}
                />
              )}
              <Button kind="text" label="Delete" onPress={remove} />
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/** The last 14 days, so a forgotten check-in is one tap to fix. Saves immediately. */
function Backfill({ habit, today, uid }: { habit: Habit; today: DateKey; uid: string }) {
  const t = useTheme();
  const days = Array.from({ length: 14 }, (_, i) => addDays(today, i - 13)).filter((d) => d >= habit.createdOn);
  return (
    <>
      <SectionLabel>Last two weeks</SectionLabel>
      <Text style={[type.meta, { color: t.muted, marginBottom: space.sm }]}>Did one of these days? Tap it to stamp it.</Text>
      <View style={styles.backfill}>
        {days.map((d) => (
          <View key={d} style={styles.backfillDay}>
            <Stamp
              size={28}
              stamped={habit.doneDates.includes(d)}
              ink={t.me}
              mark={weekdayMark(d).slice(0, 2)}
              label={describeDate(d, today)}
              onPress={() => report(toggleHabit(uid, habit, d))}
            />
            <Text style={[type.meta, { fontSize: 11, color: t.faint }]}>{d.slice(8)}</Text>
          </View>
        ))}
      </View>
    </>
  );
}

function Toggle({ label, hint, value, onChange }: { label: string; hint: string; value: boolean; onChange: (v: boolean) => void }) {
  const t = useTheme();
  return (
    <Pressable style={styles.toggle} onPress={() => onChange(!value)} accessibilityRole="switch" accessibilityState={{ checked: value }}>
      <View style={{ flex: 1 }}>
        <Text style={[type.body, { color: t.ink }]}>{label}</Text>
        <Text style={[type.meta, { color: t.muted }]}>{hint}</Text>
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: t.action, false: t.faint }} thumbColor={t.card} />
    </Pressable>
  );
}

const pad = (n: number) => String(n).padStart(2, '0');
const timeToDate = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
};
const keyToDate = (key: DateKey) => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
};

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.xs, minHeight: 56, borderBottomWidth: StyleSheet.hairlineWidth },
  icon: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  body: { padding: space.lg, paddingBottom: 64 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', columnGap: space.sm },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: space.lg, paddingVertical: space.md, marginVertical: space.sm },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginVertical: space.sm },
  stepBtn: { width: 48, height: 48, borderRadius: 24, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 64, marginTop: space.lg },
  milestone: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, minHeight: 52 },
  backfill: { flexDirection: 'row', flexWrap: 'wrap' },
  backfillDay: { width: '14.28%', alignItems: 'center' },
  actions: { marginTop: space.xxl, gap: space.sm },
});
