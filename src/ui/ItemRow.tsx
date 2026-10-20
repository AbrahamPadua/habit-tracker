import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { addDays, describeDate, weekStart } from '../domain/dates';
import { cadenceOn } from '../domain/habits';
import type { Suggestion } from '../domain/suggestions';
import type { TodayRow } from '../domain/today';
import type { DateKey } from '../domain/types';
import { Chip } from './controls';
import { Punches, Stamp } from './Stamp';
import { space, type, useTheme } from './theme';

const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
export const weekdayMark = (key: DateKey) => {
  const [y, m, d] = key.split('-').map(Number);
  return WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
};

interface Props {
  row: TodayRow;
  ink: string;
  today: DateKey;
  onToggle?: () => void;
  onOpen?: () => void;
  onMove?: (due: DateKey | null) => void;
  onDrop?: () => void;
  suggestion?: Suggestion | null;
  onApplySuggestion?: () => void;
  onDismissSuggestion?: () => void;
}

export function ItemRow({
  row,
  ink,
  today,
  onToggle,
  onOpen,
  onMove,
  onDrop,
  suggestion,
  onApplySuggestion,
  onDismissSuggestion,
}: Props) {
  const t = useTheme();
  const [moving, setMoving] = useState(false);
  const { item } = row;

  const meta: string[] = [];
  if (item.type === 'habit') {
    const c = cadenceOn(item, today);
    if (c?.kind === 'daily') meta.push('Daily');
    if (c?.kind === 'flexible') meta.push(`${row.weekCount ?? 0} this week`);
  } else if (row.overdueSince) {
    // Only the owner sees that a task slipped; the partner just sees it is still open.
    if (onToggle) meta.push(`From ${describeDate(row.overdueSince, today).replace(/^Yesterday$/, 'yesterday')}`);
  } else if (item.due && item.due !== today) {
    meta.push(describeDate(item.due, today));
  } else if (!item.due && item.pinned) {
    meta.push('Pinned');
  }
  if (row.goalTitle) meta.push(row.goalTitle);

  return (
    <View style={[styles.row, { borderBottomColor: t.rule }]}>
      <View style={styles.line}>
        <Pressable
          style={styles.text}
          onPress={onOpen}
          disabled={!onOpen}
          accessibilityRole={onOpen ? 'button' : undefined}
          accessibilityLabel={[onOpen ? `Edit ${item.title}` : item.title, ...meta].join(', ')}
          accessibilityHint={onOpen ? 'Opens details' : undefined}
        >
          <Text
            style={[type.body, { color: row.done ? t.muted : t.ink }]}
            numberOfLines={2}
          >
            {item.title}
          </Text>
          <View style={styles.metaLine}>
            {row.weekTarget != null && <Punches count={row.weekCount ?? 0} target={row.weekTarget} ink={ink} />}
            {meta.length > 0 && (
              <Text style={[type.meta, { color: t.muted, flexShrink: 1 }]} numberOfLines={1}>
                {meta.join(' · ')}
              </Text>
            )}
            {item.private && (
              <MaterialCommunityIcons name="lock-outline" size={14} color={t.faint} accessibilityLabel="Private" />
            )}
          </View>
        </Pressable>
        {item.type === 'task' && onMove && !row.done && (
          <Pressable onPress={() => setMoving((m) => !m)} style={styles.move} accessibilityRole="button" accessibilityLabel="Move or drop">
            <MaterialCommunityIcons name="calendar-arrow-right" size={22} color={t.muted} />
          </Pressable>
        )}
        <Stamp
          stamped={row.done}
          ink={ink}
          mark={weekdayMark(today)}
          label={item.title}
          onPress={onToggle}
        />
      </View>

      {moving && onMove && (
        <View style={styles.chips}>
          <Chip label="Today" selected={false} onPress={() => onMove(today)} />
          <Chip label="Tomorrow" selected={false} onPress={() => onMove(addDays(today, 1))} />
          <Chip label="Next week" selected={false} onPress={() => onMove(addDays(weekStart(today), 7))} />
          <Chip label="Someday" selected={false} onPress={() => onMove(null)} />
          {onDrop && <Chip label="Drop it" selected={false} onPress={onDrop} />}
        </View>
      )}

      {suggestion && (
        <View style={[styles.suggestion, { backgroundColor: t.tonal }]}>
          <Text style={[type.meta, { color: t.ink, flex: 1 }]}>{suggestionText(suggestion, item)}</Text>
          <View style={styles.suggestionActions}>
            <Chip label={suggestionAction(suggestion)} selected onPress={onApplySuggestion ?? (() => {})} />
            <Chip label="Not now" selected={false} onPress={onDismissSuggestion ?? (() => {})} />
          </View>
        </View>
      )}
    </View>
  );
}

function suggestionText(s: Suggestion, item: TodayRow['item']): string {
  switch (s.kind) {
    case 'lowerWeekly':
      return `You have been stamping this about ${s.to}× a week lately. ${s.to}× weekly might fit this stretch better. Only you see this.`;
    case 'dailyToWeekly':
      return `Daily might be a lot right now. ${s.times}× weekly keeps it going. Only you see this.`;
    case 'stuckTask':
      return `Moved ${item.type === 'task' ? item.deferCount : 'several'} times. Drop it, or split it into something smaller? Only you see this.`;
  }
}

function suggestionAction(s: Suggestion): string {
  switch (s.kind) {
    case 'lowerWeekly':
      return `Make it ${s.to}×`;
    case 'dailyToWeekly':
      return `${s.times}× weekly`;
    case 'stuckTask':
      return 'Drop it';
  }
}

const styles = StyleSheet.create({
  row: { borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: space.xs },
  line: { flexDirection: 'row', alignItems: 'center', minHeight: 56 },
  text: { flex: 1, paddingVertical: space.sm, paddingRight: space.sm, gap: 3 },
  metaLine: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  move: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, paddingBottom: space.sm },
  suggestion: { borderRadius: 12, padding: space.md, marginBottom: space.sm, gap: space.sm },
  suggestionActions: { flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' },
});
