import { useEffect, useState } from 'react';
import { collection, deleteDoc, doc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';
import { Routine, SharedRoutine } from './types';

const col = (batchKey: string) => collection(db, 'shared_timetables', batchKey, 'shared_routines');

/** One doc per (sharer, routine) so sharing again updates instead of duplicating. */
export const sharedRoutineId = (uid: string, routineId: string) => `${uid}_${routineId}`;

export const shareRoutineToBatch = async (
  routine: Routine,
  batchKey: string,
  sharer: { uid: string; name: string; role: SharedRoutine['sharedByRole'] }
) => {
  const id = sharedRoutineId(sharer.uid, routine.id);
  const payload: Omit<SharedRoutine, 'id' | 'addedBy'> = {
    batchKey,
    title: routine.title,
    category: routine.category,
    notes: routine.notes,
    time: routine.time,
    durationMinutes: routine.durationMinutes,
    repeat: routine.repeat,
    days: routine.days,
    date: routine.date,
    remindBefore: routine.remindBefore,
    sourceRoutineId: routine.id,
    sharedBy: sharer.uid,
    sharedByName: sharer.name,
    sharedByRole: sharer.role,
    createdAt: new Date().toISOString(),
  };
  // merge keeps the existing "added by" list when a routine is shared again
  await setDoc(doc(col(batchKey), id), payload, { merge: true });
  return id;
};

export const unshareRoutine = (batchKey: string, sharedId: string) => deleteDoc(doc(col(batchKey), sharedId));

export const markSharedRoutineAdded = (batchKey: string, sharedId: string, uid: string) =>
  updateDoc(doc(col(batchKey), sharedId), { [`addedBy.${uid}`]: true });

/** Live list of routines shared in the given batches, newest first. */
export const useSharedRoutines = (batchKeys: string[], enabled: boolean) => {
  const [items, setItems] = useState<SharedRoutine[]>([]);
  const [error, setError] = useState<string | null>(null);
  const key = batchKeys.slice().sort().join('|');

  useEffect(() => {
    if (!enabled || !batchKeys.length) {
      setItems([]);
      return;
    }
    const byBatch: Record<string, SharedRoutine[]> = {};
    const publish = () =>
      setItems(
        Object.values(byBatch)
          .flat()
          .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
      );
    const unsubs = batchKeys.map((bk) =>
      onSnapshot(
        col(bk),
        (snap) => {
          byBatch[bk] = snap.docs.map((d) => ({ ...(d.data() as SharedRoutine), id: d.id, batchKey: bk }));
          setError(null);
          publish();
        },
        (err) => {
          console.warn(`Shared routines for ${bk} unavailable:`, err);
          setError(err.code === 'permission-denied' ? 'denied' : 'offline');
        }
      )
    );
    return () => unsubs.forEach((u) => u());
  }, [key, enabled]);

  return { items, error };
};
